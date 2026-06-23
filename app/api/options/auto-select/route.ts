import { NextRequest, NextResponse } from "next/server";
import { tradierRequest } from "@/lib/tradierClient";
import {
  normalizeTradierOption,
  getTradierOptionArray,
  selectBestCreditSpread,
  getDefaultSpreadType,
  getSpreadTypeLabel,
} from "@/lib/contractGrading";
import {
  ACCOUNT_SIZE,
  MAX_RISK_PERCENT,
  MAX_SPREAD_PERCENT,
} from "@/lib/preTradeChecks";

export const dynamic = "force-dynamic";

const MIN_DTE = 30;
const MAX_DTE = 45;
const MIDPOINT_DTE = 37; // prefer expirations closest to this

function getDte(dateStr: string): number {
  const expTime = new Date(`${dateStr}T16:00:00`).getTime();
  return Math.ceil((expTime - Date.now()) / (1000 * 60 * 60 * 24));
}

function parseExpirationDates(data: unknown): string[] {
  const d = data as Record<string, unknown> | null | undefined;
  const dates = (d?.expirations as Record<string, unknown>)?.date ?? [];
  if (Array.isArray(dates)) return dates.map(String);
  if (typeof dates === "string" && dates) return [dates];
  return [];
}

export async function GET(request: NextRequest) {
  try {
    const token = process.env.TRADIER_ACCESS_TOKEN;
    const searchParams = request.nextUrl.searchParams;

    const symbol = searchParams.get("symbol")?.toUpperCase()?.trim();
    const directionRaw = searchParams.get("direction")?.toUpperCase()?.trim();
    const stockPriceRaw = searchParams.get("stockPrice");

    if (!symbol) {
      return NextResponse.json(
        { success: false, reason: "Missing required query param: symbol" },
        { status: 400 }
      );
    }

    if (directionRaw !== "CALL" && directionRaw !== "PUT") {
      return NextResponse.json(
        { success: false, reason: "direction must be CALL or PUT" },
        { status: 400 }
      );
    }

    const direction = directionRaw as "CALL" | "PUT";
    const stockPrice = stockPriceRaw ? Number(stockPriceRaw) : undefined;
    const spreadType = getDefaultSpreadType(direction);

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          reason: "Tradier access token not configured. Cannot fetch option chain.",
          ordersEnabled: false,
          liveTradingEnabled: false,
        },
        { status: 503 }
      );
    }

    // --- 1. Fetch expirations -----------------------------------------------
    const expResult = await tradierRequest({
      path: `/markets/options/expirations?symbol=${encodeURIComponent(symbol)}&includeAllRoots=true&strikes=false`,
      method: "GET",
    });

    if (!expResult.ok) {
      return NextResponse.json(
        {
          success: false,
          symbol,
          direction,
          reason: `Tradier expirations request failed (${expResult.status}). Check Tradier connectivity.`,
          ordersEnabled: false,
          liveTradingEnabled: false,
        },
        { status: 502 }
      );
    }

    const allDates = parseExpirationDates(expResult.data);

    if (allDates.length === 0) {
      return NextResponse.json({
        success: false,
        symbol,
        direction,
        reason: "Tradier returned no expiration dates for this symbol.",
        ordersEnabled: false,
        liveTradingEnabled: false,
      });
    }

    // --- 2. Filter to 30-45 DTE window, sort by closeness to midpoint -------
    const inWindow = allDates
      .map((d) => ({ date: d, dte: getDte(d) }))
      .filter(({ dte }) => dte >= MIN_DTE && dte <= MAX_DTE)
      .sort((a, b) => Math.abs(a.dte - MIDPOINT_DTE) - Math.abs(b.dte - MIDPOINT_DTE));

    if (inWindow.length === 0) {
      return NextResponse.json({
        success: false,
        symbol,
        direction,
        reason: `No expirations in the ${MIN_DTE}–${MAX_DTE} DTE window. Available dates: ${allDates.slice(0, 5).join(", ")}${allDates.length > 5 ? "…" : ""}.`,
        ordersEnabled: false,
        liveTradingEnabled: false,
      });
    }

    // Try up to 3 candidate expirations in order of DTE preference
    const candidates = inWindow.slice(0, 3);
    // Single source of truth — same $50k-based limits the cron and dashboard use.
    const gradeParams = {
      accountSize: ACCOUNT_SIZE,
      maxRiskPercent: MAX_RISK_PERCENT,
      maxSpreadPercent: MAX_SPREAD_PERCENT,
    };

    let lastFailReason = "";

    for (const { date: expiration, dte } of candidates) {
      // --- 3. Fetch chain for this expiration --------------------------------
      const chainResult = await tradierRequest({
        path: `/markets/options/chains?symbol=${encodeURIComponent(symbol)}&expiration=${encodeURIComponent(expiration)}&greeks=true`,
        method: "GET",
      });

      if (!chainResult.ok) {
        lastFailReason = `Chain fetch failed for expiration ${expiration} (${chainResult.status}).`;
        continue;
      }

      const rawOptions = getTradierOptionArray(chainResult.data);
      if (rawOptions.length === 0) {
        lastFailReason = `No contracts in Tradier chain for ${expiration}.`;
        continue;
      }

      const normalized = rawOptions.map(normalizeTradierOption);

      // --- 4. Run auto-selection --------------------------------------------
      const result = selectBestCreditSpread(normalized, direction, symbol, {
        ...gradeParams,
        stockPrice,
      });

      if (result.success) {
        return NextResponse.json({
          success: true,
          symbol,
          direction,
          spreadType,
          spreadTypeLabel: getSpreadTypeLabel(spreadType),
          expiration,
          dte,
          contract: result.spread,
          usedFallback: result.usedFallback,
          fallbackReason: result.fallbackReason,
          ordersEnabled: false,
          liveTradingEnabled: false,
        });
      }

      lastFailReason = result.reason;
    }

    // All candidate expirations failed
    return NextResponse.json({
      success: false,
      symbol,
      direction,
      spreadType,
      spreadTypeLabel: getSpreadTypeLabel(spreadType),
      reason: lastFailReason || "Could not find a suitable credit spread across available expirations.",
      triedExpirations: candidates.map(({ date, dte }) => ({ date, dte })),
      ordersEnabled: false,
      liveTradingEnabled: false,
    });
  } catch (error) {
    console.error("auto-select route error:", error);
    return NextResponse.json(
      {
        success: false,
        reason: "Unexpected server error during auto-selection.",
        error: error instanceof Error ? error.message : "Unknown error",
        ordersEnabled: false,
        liveTradingEnabled: false,
      },
      { status: 500 }
    );
  }
}
