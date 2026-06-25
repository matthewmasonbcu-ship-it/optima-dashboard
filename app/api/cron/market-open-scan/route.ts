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
  type QuoteData,
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
const MIN_DTE = 30;
const MAX_DTE = 45;
const MIDPOINT_DTE = 37;

// Morning scan window (ET). The cron is scheduled ~9:34 ET (13:34/14:34 UTC for
// the two DST offsets in vercel.json), but Vercel jitter can delay the fire by
// 20–40+ min. We accept ANY fire inside this window, so drift no longer rejects
// a valid in-session scan. The window is < 60 min so the off-DST cron slot
// (summer 10:34 ET / winter 8:34 ET) falls outside it and won't double-fire;
// the once-per-day dedup in the handler backstops any extreme-jitter overlap.
const MORNING_SCAN_START_MINUTES = 9 * 60 + 30; // 9:30 ET — market open
const MORNING_SCAN_END_MINUTES = 10 * 60 + 30; // 10:30 ET

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

function isMorningScanWindowNewYork(): boolean {
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

  return (
    isWeekday &&
    nowMinutes >= MORNING_SCAN_START_MINUTES &&
    nowMinutes <= MORNING_SCAN_END_MINUTES
  );
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

  if (!isMorningScanWindowNewYork()) {
    // Outside 9:30–10:30 ET, or a weekend. This includes the off-DST cron slot
    // (summer 10:34 ET / winter 8:34 ET), which is expected — skip silently, no
    // drift alert. Jitter inside the window is now allowed to scan normally.
    return NextResponse.json({
      success: true,
      route: ROUTE,
      skipped: true,
      message: "Outside the morning scan window (9:30–10:30 ET, weekdays). Skipping.",
    });
  }

  try {
    const baseUrl = new URL(request.url).origin;
    const now = new Date();
    const startOfTodayISO = getStartOfTodayNewYorkISO(now);

    // --- Once-per-day guard ---
    // If a scan already queued an AUTO_SCAN_CRON preview today, skip — prevents
    // the DST off-slot or extreme cron jitter from double-firing the pipeline.
    // (No-setup days create no preview row and may harmlessly re-scan.)
    const { data: priorScanToday } = await supabase
      .from("paper_order_previews")
      .select("id")
      .ilike("setup_name", "%AUTO_SCAN_CRON%")
      .gte("created_at", startOfTodayISO)
      .limit(1)
      .maybeSingle();

    if (priorScanToday) {
      return NextResponse.json({
        success: true,
        route: ROUTE,
        skipped: true,
        duplicatePrevented: true,
        message: "A scan already queued a preview today. Skipping duplicate run.",
      });
    }

    // --- 1. Fetch SPY alone with exponential backoff ---
    // SPY is the scan gate. Finnhub can return c=0 (which fails the c>0 validity
    // check) for the first 30s–2min after the bell, so retry SPY on its own with
    // backoff before aborting. Function timeout is 300s, so ~46s is safe.
    const SPY_BACKOFF_MS = [0, 2000, 4000, 8000, 16000, 16000];
    let spyQuote: QuoteData | null = null;
    for (const delay of SPY_BACKOFF_MS) {
      if (delay > 0) await new Promise((res) => setTimeout(res, delay));
      spyQuote = await fetchQuote("SPY", baseUrl);
      if (spyQuote) break;
    }

    if (!spyQuote) {
      const budgetSec = Math.round(
        SPY_BACKOFF_MS.reduce((a, b) => a + b, 0) / 1000
      );
      await sendHeartbeat(
        `OPTIMA SCAN — could not load SPY quote after ${SPY_BACKOFF_MS.length} attempts over ~${budgetSec}s. Scan aborted.`
      );
      return NextResponse.json({
        success: false,
        route: ROUTE,
        message: "Could not load valid SPY market quote.",
      });
    }

    // VIX fetched separately and gracefully — UNKNOWN on failure, never blocks.
    const vixQuote = await fetchQuote("^VIX", baseUrl);

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
    // Guard on whichever token tradierClient will actually use for the active env —
    // mirrors tradierClient.ts token selection so this check can never block a
    // request that would otherwise succeed.
    const tradierEnv = (process.env.TRADIER_ENV ?? "sandbox").toLowerCase();
    const tradierToken =
      tradierEnv === "production"
        ? process.env.TRADIER_PRODUCTION_TOKEN
        : process.env.TRADIER_ACCESS_TOKEN;
    if (!tradierToken) {
      return NextResponse.json(
        {
          success: false,
          route: ROUTE,
          message:
            tradierEnv === "production"
              ? "TRADIER_PRODUCTION_TOKEN not configured."
              : "TRADIER_ACCESS_TOKEN not configured.",
        },
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
