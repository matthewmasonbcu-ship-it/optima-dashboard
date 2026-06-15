import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import {
  DEFAULT_WATCHLIST,
  fetchQuote,
  classifyMarketCondition,
  analyzeSetup,
  sortScanResults,
} from "@/lib/scanner";

async function loadWatchlist(): Promise<string[]> {
  const { data, error } = await supabase
    .from("watchlist_symbols")
    .select("symbol")
    .order("created_at", { ascending: true });

  if (error || !data || data.length === 0) {
    if (error) {
      console.error("Failed to load watchlist, using default:", error);
    }
    return DEFAULT_WATCHLIST;
  }

  return data.map((row) => row.symbol as string);
}

const ROUTE = "/api/cron/market-open-scan";
const MIN_SETUP_SCORE = 75;

const SCAN_WINDOW_TOLERANCE_MINUTES = 2;

const SCAN_TIMES_NY = [
  { hour: 9, minute: 30 },
  { hour: 11, minute: 0 },
  { hour: 14, minute: 0 },
];

function isMarketOpenNowInNewYork(): boolean {
  const now = new Date();

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
    weekday: "short",
  }).formatToParts(now);

  const map: Record<string, string> = {};
  for (const part of parts) {
    map[part.type] = part.value;
  }

  const hour = Number(map.hour);
  const minute = Number(map.minute);
  const weekday = map.weekday;

  const isWeekday = weekday !== "Sat" && weekday !== "Sun";
  const nowMinutes = hour * 60 + minute;

  const isScanTime = SCAN_TIMES_NY.some(({ hour: targetHour, minute: targetMinute }) => {
    const targetMinutes = targetHour * 60 + targetMinute;
    return Math.abs(nowMinutes - targetMinutes) <= SCAN_WINDOW_TOLERANCE_MINUTES;
  });

  return isWeekday && isScanTime;
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;

  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json(
      { success: false, route: ROUTE, message: "Unauthorized." },
      { status: 401 }
    );
  }

  if (!isMarketOpenNowInNewYork()) {
    return NextResponse.json({
      success: true,
      route: ROUTE,
      skipped: true,
      message: "Not market open time in America/New_York. Skipping scan.",
    });
  }

  try {
    const baseUrl = new URL(request.url).origin;

    const spyQuote = await fetchQuote("SPY", baseUrl);

    if (!spyQuote) {
      return NextResponse.json({
        success: false,
        route: ROUTE,
        message: "Could not load valid SPY market quote.",
      });
    }

    const marketCondition = classifyMarketCondition(spyQuote);
    const watchlist = await loadWatchlist();
    const symbolsToScan = watchlist.filter((s) => s !== "SPY");
    const results = [];

    for (const symbol of symbolsToScan) {
      const quote = await fetchQuote(symbol, baseUrl);

      if (!quote) {
        console.warn("Skipping invalid quote:", symbol);
        continue;
      }

      results.push(analyzeSetup(symbol, quote, marketCondition));
    }

    const sorted = sortScanResults(results);
    const topResult = sorted[0];

    let notifyResult: { success: boolean; skipped?: boolean; message?: string } | null = null;

    if (
      topResult &&
      (topResult.setupScore ?? 0) >= MIN_SETUP_SCORE &&
      topResult.direction !== "NO TRADE"
    ) {
      const notifyResponse = await fetch(`${baseUrl}/api/alerts/scanner-notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: topResult.symbol,
          direction: topResult.direction,
          setupScore: topResult.setupScore,
        }),
      });

      notifyResult = await notifyResponse.json().catch(() => null);
    }

    return NextResponse.json({
      success: true,
      route: ROUTE,
      marketCondition,
      resultsScanned: sorted.length,
      topResult: topResult
        ? {
            symbol: topResult.symbol,
            direction: topResult.direction,
            setupScore: topResult.setupScore,
          }
        : null,
      notify: notifyResult,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unexpected server error during market-open scan.";

    console.error("Market open scan route error:", error);

    return NextResponse.json(
      { success: false, route: ROUTE, message },
      { status: 500 }
    );
  }
}
