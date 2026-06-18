import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { tradierRequest } from "@/lib/tradierClient";
import {
  DEFAULT_WATCHLIST,
  fetchQuote,
  classifyMarketCondition,
  classifyVixRegime,
  analyzeSetup,
  sortScanResults,
  type ScanResult,
} from "@/lib/scanner";
import {
  selectBestCreditSpread,
  getTradierOptionArray,
  normalizeTradierOption,
  getNumber,
  getContractValue,
} from "@/lib/contractGrading";
import {
  runServerSideEnforcementChecks,
  ACCOUNT_SIZE,
  MAX_RISK_PERCENT,
  MAX_SPREAD_PERCENT,
} from "@/lib/preTradeChecks";
import { sendTelegramAlert } from "@/lib/notify/sendTelegramAlert";

async function sendHeartbeat(text: string): Promise<void> {
  await sendTelegramAlert(text).catch(() => {});
}

const ROUTE = "/api/cron/market-open-scan";
const MIN_SETUP_SCORE = 75;
const SCAN_WINDOW_TOLERANCE_MINUTES = 5;
const MIN_DTE = 30;
const MAX_DTE = 45;
const MIDPOINT_DTE = 37;

const SCAN_TIMES_NY = [
  { hour: 9, minute: 30 },
  { hour: 11, minute: 0 },
  { hour: 14, minute: 0 },
];

async function loadWatchlist(): Promise<string[]> {
  const { data, error } = await supabase
    .from("watchlist_symbols")
    .select("symbol")
    .order("created_at", { ascending: true });

  if (error || !data || data.length === 0) {
    if (error) console.error("Failed to load watchlist, using default:", error);
    return DEFAULT_WATCHLIST;
  }
  return data.map((row) => row.symbol as string);
}

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
  for (const part of parts) map[part.type] = part.value;

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

function getNewYorkUtcOffsetHours(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    timeZoneName: "short",
  }).formatToParts(date);
  const tzName = parts.find((part) => part.type === "timeZoneName")?.value;
  return tzName === "EDT" ? 4 : 5;
}

function getStartOfTodayNewYorkISO(now: Date): string {
  const nyDateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
  }).format(now);
  const offsetHours = getNewYorkUtcOffsetHours(now);
  const offsetStr = String(offsetHours).padStart(2, "0");
  return new Date(`${nyDateStr}T00:00:00.000-${offsetStr}:00`).toISOString();
}

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
    await sendHeartbeat("OPTIMA SCAN — fired outside scan window. Cron timing drift?");
    return NextResponse.json({
      success: true,
      route: ROUTE,
      skipped: true,
      message: "Not market open time in America/New_York. Skipping scan.",
    });
  }

  try {
    const baseUrl = new URL(request.url).origin;
    const now = new Date();
    const startOfTodayISO = getStartOfTodayNewYorkISO(now);

    // --- 1. Fetch SPY + VIX ---
    const [spyQuote, vixQuote] = await Promise.all([
      fetchQuote("SPY", baseUrl),
      fetchQuote("^VIX", baseUrl),
    ]);

    if (!spyQuote) {
      return NextResponse.json({
        success: false,
        route: ROUTE,
        message: "Could not load valid SPY market quote.",
      });
    }

    const marketCondition = classifyMarketCondition(spyQuote);
    const vixLevel = vixQuote?.c ?? null;
    const vixRegime = vixLevel !== null ? classifyVixRegime(vixLevel) : "UNKNOWN";

    // --- 2. Scan watchlist ---
    const watchlist = await loadWatchlist();
    const symbolsToScan = watchlist.filter((s) => s !== "SPY");
    const results: ScanResult[] = [];

    for (const sym of symbolsToScan) {
      const quote = await fetchQuote(sym, baseUrl);
      if (!quote) { console.warn("Skipping invalid quote:", sym); continue; }
      results.push(analyzeSetup(sym, quote, marketCondition));
    }

    const sorted = sortScanResults(results);
    const topResult = sorted[0];
    const scannedCount = results.length;

    // --- 3. Gate: score + direction ---
    if (!topResult || (topResult.setupScore ?? 0) < MIN_SETUP_SCORE) {
      const bestDesc = topResult
        ? `Best: ${topResult.symbol} score ${topResult.setupScore ?? 0} (threshold ${MIN_SETUP_SCORE}).`
        : "No symbols returned a setup.";
      await sendHeartbeat(`OPTIMA SCAN — ${scannedCount} symbols. ${bestDesc} No alert.`);
      return NextResponse.json({
        success: true, route: ROUTE, skipped: true,
        message: `No setup passed score threshold (${MIN_SETUP_SCORE}).`,
        marketCondition, vixLevel, vixRegime,
      });
    }

    const rawDirection = topResult.direction ?? topResult.tradeDirection;
    if (rawDirection !== "CALL" && rawDirection !== "PUT") {
      await sendHeartbeat(
        `OPTIMA SCAN — ${scannedCount} symbols. Best: ${topResult.symbol} score ${topResult.setupScore ?? 0}, direction ${rawDirection ?? "unknown"}. Skipped.`
      );
      return NextResponse.json({
        success: true, route: ROUTE, skipped: true,
        message: `Top setup direction is ${rawDirection ?? "unknown"} — not CALL or PUT. Skipping pipeline.`,
        symbol: topResult.symbol, marketCondition, vixLevel, vixRegime,
      });
    }

    const symbol = topResult.symbol;
    const direction = rawDirection; // narrowed to "CALL" | "PUT"

    // --- 4. DEDUP — before any expensive API call ---
    const { data: existingPreview } = await supabase
      .from("paper_order_previews")
      .select("id")
      .eq("symbol", symbol)
      .gte("created_at", startOfTodayISO)
      .limit(1)
      .maybeSingle();

    if (existingPreview) {
      await sendHeartbeat(`OPTIMA SCAN — ${symbol} already in approval queue today. Dedup blocked.`);
      return NextResponse.json({
        success: true, route: ROUTE, skipped: true, duplicatePrevented: true,
        message: `Approval entry already exists for ${symbol} today. Dedup blocked duplicate.`,
        symbol, marketCondition, vixLevel, vixRegime,
      });
    }

    // --- 5. Auto-select best credit spread ---
    if (!process.env.TRADIER_ACCESS_TOKEN) {
      return NextResponse.json(
        { success: false, route: ROUTE, message: "TRADIER_ACCESS_TOKEN not configured." },
        { status: 503 }
      );
    }

    const expResult = await tradierRequest({
      path: `/markets/options/expirations?symbol=${encodeURIComponent(symbol)}&includeAllRoots=true&strikes=false`,
      method: "GET",
    });

    if (!expResult.ok) {
      console.warn(`Tradier expirations failed for ${symbol}:`, expResult.status);
      await sendHeartbeat(`OPTIMA SCAN — ${symbol} Tradier chain unavailable (${expResult.status}). Skipped.`);
      return NextResponse.json({
        success: true, route: ROUTE, skipped: true,
        message: `Tradier expirations failed for ${symbol} (${expResult.status}). Skipping pipeline.`,
        symbol, direction,
      });
    }

    const allDates = parseExpirationDates(expResult.data);
    const inWindow = allDates
      .map((d) => ({ date: d, dte: getDte(d) }))
      .filter(({ dte }) => dte >= MIN_DTE && dte <= MAX_DTE)
      .sort((a, b) => Math.abs(a.dte - MIDPOINT_DTE) - Math.abs(b.dte - MIDPOINT_DTE));

    if (inWindow.length === 0) {
      await sendHeartbeat(`OPTIMA SCAN — ${symbol} no expirations in ${MIN_DTE}–${MAX_DTE} DTE window. Skipped.`);
      return NextResponse.json({
        success: true, route: ROUTE, skipped: true,
        message: `No expirations in ${MIN_DTE}–${MAX_DTE} DTE window for ${symbol}.`,
        symbol, direction,
      });
    }

    const gradeParams = {
      accountSize: ACCOUNT_SIZE,
      maxRiskPercent: MAX_RISK_PERCENT,
      maxSpreadPercent: MAX_SPREAD_PERCENT,
    };
    const stockPrice =
      topResult.price ?? topResult.entryPrice ?? topResult.entry_price ?? undefined;

    let selectedSpread: ReturnType<typeof selectBestCreditSpread> | null = null;
    let lastAutoSelectFail = "";

    for (const { date: expiration } of inWindow.slice(0, 3)) {
      const chainResult = await tradierRequest({
        path: `/markets/options/chains?symbol=${encodeURIComponent(symbol)}&expiration=${encodeURIComponent(expiration)}&greeks=true`,
        method: "GET",
      });

      if (!chainResult.ok) {
        lastAutoSelectFail = `Chain fetch failed for ${expiration} (${chainResult.status}).`;
        continue;
      }

      const rawOptions = getTradierOptionArray(chainResult.data);
      if (rawOptions.length === 0) {
        lastAutoSelectFail = `No contracts in chain for ${expiration}.`;
        continue;
      }

      const result = selectBestCreditSpread(
        rawOptions.map(normalizeTradierOption),
        direction,
        symbol,
        { ...gradeParams, stockPrice }
      );

      if (result.success) { selectedSpread = result; break; }
      lastAutoSelectFail = result.reason;
    }

    if (!selectedSpread?.success) {
      console.warn(`Auto-select failed for ${symbol}:`, lastAutoSelectFail);
      await sendHeartbeat(`OPTIMA SCAN — ${symbol} no suitable spread: ${lastAutoSelectFail} Skipped.`);
      return NextResponse.json({
        success: true, route: ROUTE, skipped: true,
        message: `Auto-select found no suitable spread for ${symbol}: ${lastAutoSelectFail}`,
        symbol, direction,
      });
    }

    const spread = selectedSpread.spread;

    // --- 6. Fetch daily gate data ---
    const { data: todayTradesData } = await supabase
      .from("paper_trades")
      .select("id")
      .gte("created_at", startOfTodayISO);
    const tradeCount = todayTradesData?.length ?? 0;

    const { data: closedToday } = await supabase
      .from("paper_trades")
      .select("id")
      .eq("status", "closed")
      .gte("closed_at", startOfTodayISO);
    const closedTodayIds = closedToday?.map((r) => r.id) ?? [];

    let lossCount = 0;
    let totalDailyPnl = 0;
    if (closedTodayIds.length > 0) {
      const { data: lossRows } = await supabase
        .from("option_trade_details")
        .select("id")
        .in("paper_trade_id", closedTodayIds)
        .lt("option_pnl", 0);
      lossCount = lossRows?.length ?? 0;

      const { data: pnlRows } = await supabase
        .from("option_trade_details")
        .select("option_pnl")
        .in("paper_trade_id", closedTodayIds)
        .not("option_pnl", "is", null);
      totalDailyPnl = (pnlRows ?? []).reduce(
        (acc: number, r: { option_pnl: number }) => acc + r.option_pnl,
        0
      );
    }

    // --- 7. Enforcement checks ---
    const enforcement = runServerSideEnforcementChecks(spread, {
      tradeCount,
      lossCount,
      totalDailyPnl,
    });

    if (!enforcement.passed) {
      console.warn(`Enforcement blocked ${symbol}:`, enforcement.reason);
      await sendHeartbeat(`OPTIMA SCAN — ${symbol} BLOCKED: ${enforcement.reason}`);
      return NextResponse.json({
        success: true, route: ROUTE, skipped: true,
        message: `Enforcement blocked ${symbol}: ${enforcement.reason}`,
        symbol, direction, marketCondition, vixLevel, vixRegime,
      });
    }

    // --- 8. INSERT paper_order_previews ---
    const spreadSymbol = String(
      spread.stock_symbol ?? spread.stockSymbol ?? symbol
    );
    const contractSymbol = String(
      spread.option_symbol ?? spread.optionSymbol ?? spread.symbol ?? ""
    );
    const spreadExpiration = spread.expiration_date ?? spread.expirationDate ?? null;
    const spreadOptionType = spread.trade_direction ?? spread.tradeDirection ?? direction;
    const spreadBid = spread.bid ?? spread.bid_price ?? null;
    const spreadAsk = spread.ask ?? spread.ask_price ?? null;
    const spreadNetCredit = spread.net_credit ?? spread.mid ?? null;
    const spreadMaxLoss = spread.max_loss ?? spread.max_risk ?? null;
    const spreadGrade =
      spread.contract_quality ??
      spread.qualityGrade ??
      spread.contractQualityGrade ??
      spread.grade ??
      null;

    const { data: previewRow, error: previewError } = await supabase
      .from("paper_order_previews")
      .insert({
        source_alert_id: null,
        approval_decision_id: null,
        phone_alert_event_id: null,

        symbol: spreadSymbol,
        trade_lane: "OPTIONS_DAY_TRADE",
        setup_name: `${symbol} ${direction} credit spread — AUTO_SCAN_CRON`,

        contract_symbol: contractSymbol || null,
        strike: spread.strike_price ?? spread.strikePrice ?? null,
        expiration: spreadExpiration,
        option_type: spreadOptionType,

        bid: spreadBid,
        ask: spreadAsk,
        mid: spreadNetCredit,
        estimated_limit_price: spreadNetCredit,
        quantity: 1,
        estimated_order_cost:
          spreadNetCredit !== null ? spreadNetCredit * 100 : null,
        max_risk_dollars: spreadMaxLoss,

        contract_quality: spreadGrade,
        risk_guard_status: "APPROVED",
        risk_guard_reason: "Auto-scan cron enforcement passed all 7 checks.",

        entry_price: topResult.entryPrice ?? topResult.entry_price ?? null,
        stop_loss: topResult.stopLoss ?? topResult.stop_loss ?? null,
        take_profit: topResult.takeProfit ?? topResult.take_profit ?? null,

        spread_type: spread.spread_type ?? null,
        short_leg_option_symbol: spread.short_leg?.option_symbol ?? null,
        short_leg_strike_price: spread.short_leg?.strike_price ?? null,
        long_leg_option_symbol: spread.long_leg?.option_symbol ?? null,
        long_leg_strike_price: spread.long_leg?.strike_price ?? null,
        net_credit: spreadNetCredit,
        spread_width: spread.spread_width ?? null,
        max_loss: spreadMaxLoss,
        max_profit: spread.max_profit ?? null,

        preview_status: "PREVIEW_ONLY",
        broker: "TRADIER_SANDBOX",
        order_side: "BUY_TO_OPEN",
        order_type: "LIMIT",
        time_in_force: "DAY",

        // Safety locks — always hardcoded false. This route never unlocks execution.
        sandbox_preview_validation_status: "PASSED",
        sandbox_preview_human_review_decision: "WATCH",
        approved_for_sandbox_order: false,
        approved_for_live_order: false,
        submitted_to_broker: false,
        broker_order_id: null,
        broker_response: null,

        safety_notes:
          "Source: AUTO_SCAN_CRON. Preview only. No Tradier sandbox order submitted. No live order submitted.",
      })
      .select("id")
      .single();

    if (previewError || !previewRow) {
      console.error("Failed to insert paper_order_previews:", previewError);
      await sendHeartbeat(`OPTIMA SCAN — DB error for ${symbol}: ${previewError?.message ?? "unknown error"}.`);
      return NextResponse.json(
        {
          success: false,
          route: ROUTE,
          message: `Failed to create approval queue entry for ${symbol}: ${previewError?.message ?? "unknown error"}`,
        },
        { status: 500 }
      );
    }

    // --- 9. Heartbeat: pipeline complete ---
    await sendHeartbeat(
      `OPTIMA SCAN — ${symbol} ${direction} ${spread.spread_type ?? "credit spread"} queued for approval.\n` +
      `Grade: ${spreadGrade ?? "N/A"} | Net credit: $${spreadNetCredit != null ? spreadNetCredit.toFixed(2) : "N/A"} | Max loss: $${spreadMaxLoss != null ? spreadMaxLoss.toFixed(2) : "N/A"}\n` +
      `Approval alert with link is sending now separately.`
    );

    // --- POST phone-review — triggers token generation and Telegram approval alert ---
    const phoneReviewRes = await fetch(`${baseUrl}/api/alerts/phone-review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ previewId: previewRow.id }),
    });
    const phoneReviewResult = await phoneReviewRes.json().catch(() => null);

    // --- 10. Insert scanner_auto_alerts dedup row ---
    // Suppresses the old FYI SMS path if it is ever re-enabled.
    await supabase.from("scanner_auto_alerts").insert({
      symbol,
      direction,
      alerted_at: new Date().toISOString(),
    }).then(({ error }) => {
      if (error) console.warn("scanner_auto_alerts dedup insert failed (non-fatal):", error.message);
    });

    return NextResponse.json({
      success: true,
      route: ROUTE,
      pipelineComplete: true,
      message: `Auto-pipeline complete for ${symbol} ${direction}. Approval entry created and phone review SMS dispatched.`,
      symbol,
      direction,
      previewId: previewRow.id,
      marketCondition,
      vixLevel,
      vixRegime,
      setupScore: topResult.setupScore,
      spread: {
        spreadType: spread.spread_type,
        netCredit: spreadNetCredit,
        maxLoss: spreadMaxLoss,
        grade: spreadGrade,
      },
      phoneReview: phoneReviewResult,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unexpected server error during market-open scan.";
    console.error("Market open scan route error:", error);
    await sendHeartbeat(`OPTIMA SCAN — Unexpected error: ${message}`);
    return NextResponse.json(
      { success: false, route: ROUTE, message },
      { status: 500 }
    );
  }
}
