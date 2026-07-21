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
  getOptionSymbol,
  getDeltaAbs,
  getOpenInterest,
  type GradeParams,
  type SelectBestCreditSpreadResult,
  type TradierContract,
} from "@/lib/contractGrading";
import {
  runServerSideEnforcementChecks,
  ACCOUNT_SIZE,
  MAX_RISK_PERCENT,
  MAX_SPREAD_PERCENT,
} from "@/lib/preTradeChecks";
import {
  SCAN_EVAL_BREADTH_N,
  DAILY_TRADE_CAP,
  MIN_SETUP_SCORE,
  MIN_DTE,
  MAX_DTE,
  MIDPOINT_DTE,
} from "@/lib/scanConfig";
import { fetchNextEarningsDate } from "@/lib/earnings";
import {
  persistScanRun,
  type ScanCandidateRecord,
  type ScanRunRecord,
} from "@/lib/scanPersistence";
import { sendTelegramAlert } from "@/lib/notify/sendTelegramAlert";

async function notify(text: string): Promise<void> {
  await sendTelegramAlert(text).catch(() => {});
}

const ROUTE = "/api/cron/market-open-scan";

// Morning scan window (ET). The cron is scheduled ~10:15 ET (14:15/15:15 UTC for
// the two DST offsets in vercel.json) — moved from the 9:34 open so opening-auction
// bid/ask spreads can settle (qualified setups were being HELD on artificially wide
// open spreads). On Pro, crons fire within the minute, so 10:15 lands well inside
// this window; we still accept ANY fire in the window so a rare delayed delivery
// scans. The window (9:30–11:00) excludes both off-DST cron slots (summer 11:15 ET
// / winter 9:15 ET), so they can't double-fire; the once-per-day dedup backstops.
const MORNING_SCAN_START_MINUTES = 9 * 60 + 30; // 9:30 ET
const MORNING_SCAN_END_MINUTES = 11 * 60; // 11:00 ET (10:15 fire + margin; off-slots excluded)

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

function formatEtStamp(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const m: Record<string, string> = {};
  for (const part of parts) m[part.type] = part.value;
  return `${m.year}-${m.month}-${m.day} ${m.hour}:${m.minute} ET`;
}

function fmtNum(n: number | null): string {
  return n != null && Number.isFinite(n) ? n.toFixed(2) : "N/A";
}

// Collapse a long grading/enforcement reason into a compact tag for the run
// summary and the blocked_reasons histogram.
function shortBlockReason(reason: string | null): string {
  const r = (reason ?? "").toLowerCase();
  if (!r) return "blocked";
  if (r.includes("earnings")) return "earnings";
  if (r.includes("score")) return "score<75";
  if (r.includes("direction")) return "no direction";
  if (r.includes("dte window") || r.includes("expirations in") || r.includes("dte is"))
    return "no DTE window";
  if (r.includes("grade blocked") || r.includes("short leg")) return "short leg blocked";
  if (r.includes("exceeds allowed risk") || r.includes("max loss") || r.includes("risk cap"))
    return "maxloss>cap";
  if (r.includes("delta")) return "delta off-band";
  if (r.includes("no valid") || r.includes("pricing") || r.includes("net credit"))
    return "no pricing";
  if (r.includes("chain") || r.includes("tradier") || r.includes("contracts in chain"))
    return "chain unavailable";
  if (r.includes("dedup") || r.includes("already")) return "dedup";
  if (r.includes("daily") || r.includes("lockout")) return "daily lockout";
  return r.slice(0, 28);
}

// One contract-graded symbol. status reflects the GRADING outcome; queued/queueNote
// reflect whether a PASSED candidate became the day's trade (or why it didn't).
type GradedCandidate = {
  symbol: string;
  setupScore: number;
  direction: "CALL" | "PUT" | null;
  status: "PASSED" | "BLOCKED";
  grade: string | null;
  reason: string | null; // full grading block reason
  expiration: string | null;
  shortStrike: number | null;
  shortDelta: number | null;
  openInterest: number | null;
  bid: number | null;
  ask: number | null;
  spreadContract: TradierContract | null;
  queued: boolean;
  queueNote: string | null;
};

// Contract-grade a single ranked symbol. Runs the EXACT existing pipeline
// (expirations → in-window DTE → adaptive credit spread) plus a HARD earnings
// pre-filter applied BEFORE grading. Never queues; returns a diagnostic record.
async function gradeSymbol(
  result: ScanResult,
  baseUrl: string,
  gradeParams: GradeParams
): Promise<GradedCandidate> {
  const symbol = result.symbol;
  const setupScore = result.setupScore ?? 0;
  const base: GradedCandidate = {
    symbol,
    setupScore,
    direction: null,
    status: "BLOCKED",
    grade: null,
    reason: null,
    expiration: null,
    shortStrike: null,
    shortDelta: null,
    openInterest: null,
    bid: null,
    ask: null,
    spreadContract: null,
    queued: false,
    queueNote: null,
  };

  // Score gate (no Tradier calls below the threshold).
  if (setupScore < MIN_SETUP_SCORE) {
    return { ...base, reason: `setup score ${setupScore} < ${MIN_SETUP_SCORE}` };
  }

  // Direction gate.
  const rawDirection = result.direction ?? result.tradeDirection;
  if (rawDirection !== "CALL" && rawDirection !== "PUT") {
    return { ...base, reason: `direction ${rawDirection ?? "unknown"} — not CALL/PUT` };
  }
  const direction = rawDirection;
  base.direction = direction;

  // Expirations.
  const expResult = await tradierRequest({
    path: `/markets/options/expirations?symbol=${encodeURIComponent(symbol)}&includeAllRoots=true&strikes=false`,
    method: "GET",
  });
  if (!expResult.ok) {
    return { ...base, reason: `Tradier chain unavailable (${expResult.status})` };
  }

  const allDates = parseExpirationDates(expResult.data);
  let inWindow = allDates
    .map((d) => ({ date: d, dte: getDte(d) }))
    .filter(({ dte }) => dte >= MIN_DTE && dte <= MAX_DTE)
    .sort((a, b) => Math.abs(a.dte - MIDPOINT_DTE) - Math.abs(b.dte - MIDPOINT_DTE));

  if (inWindow.length === 0) {
    return { ...base, reason: `no expirations in ${MIN_DTE}–${MAX_DTE} DTE window` };
  }

  // HARD earnings pre-filter (BEFORE grading). Drop any expiration held through
  // the next earnings date. Fails open: a null earnings date skips the filter.
  const earningsDate = await fetchNextEarningsDate(symbol, baseUrl);
  if (earningsDate) {
    const clear = inWindow.filter(({ date }) => date < earningsDate);
    if (clear.length === 0) {
      return { ...base, reason: `earnings inside DTE window (${earningsDate})` };
    }
    inWindow = clear;
  }

  const stockPrice =
    result.price ?? result.entryPrice ?? result.entry_price ?? undefined;

  let selected: SelectBestCreditSpreadResult | null = null;
  let winningNormalized: TradierContract[] = [];
  let lastFail = "";

  for (const { date: expiration } of inWindow.slice(0, 3)) {
    const chainResult = await tradierRequest({
      path: `/markets/options/chains?symbol=${encodeURIComponent(symbol)}&expiration=${encodeURIComponent(expiration)}&greeks=true`,
      method: "GET",
    });
    if (!chainResult.ok) {
      lastFail = `Chain fetch failed for ${expiration} (${chainResult.status}).`;
      continue;
    }
    const rawOptions = getTradierOptionArray(chainResult.data);
    if (rawOptions.length === 0) {
      lastFail = `No contracts in chain for ${expiration}.`;
      continue;
    }
    const normalized = rawOptions.map(normalizeTradierOption);
    const r = selectBestCreditSpread(normalized, direction, symbol, {
      ...gradeParams,
      stockPrice,
    });
    if (r.success) {
      selected = r;
      winningNormalized = normalized;
      break;
    }
    lastFail = r.reason;
  }

  if (!selected || !selected.success) {
    return { ...base, reason: lastFail || "no suitable spread" };
  }

  const spread = selected.spread;
  const grade =
    (spread.contract_quality ??
      spread.qualityGrade ??
      spread.contractQualityGrade ??
      spread.grade ??
      null) as string | null;

  // Short-leg diagnostics for persistence — read delta/OI off the winning chain.
  const shortSym = spread.short_leg?.option_symbol ?? getOptionSymbol(spread);
  const shortLegRaw = winningNormalized.find((o) => getOptionSymbol(o) === shortSym);

  return {
    symbol,
    setupScore,
    direction,
    status: "PASSED",
    grade,
    reason: null,
    expiration: spread.expiration_date ?? spread.expirationDate ?? null,
    shortStrike: spread.short_leg?.strike_price ?? spread.strike_price ?? null,
    shortDelta: shortLegRaw ? getDeltaAbs(shortLegRaw) : null,
    openInterest: shortLegRaw ? getOpenInterest(shortLegRaw) : spread.open_interest ?? null,
    bid: spread.bid_price ?? spread.bid ?? null,
    ask: spread.ask_price ?? spread.ask ?? null,
    spreadContract: spread,
    queued: false,
    queueNote: null,
  };
}

// Insert the approval-queue preview for a PASSED candidate, fire the ACTIONABLE
// phone-review alert, and write the scanner dedup row. Safety locks unchanged.
async function queuePreview(
  cand: GradedCandidate,
  topResultEntry: ScanResult,
  baseUrl: string
): Promise<
  | { ok: true; previewId: string; netCredit: number | null; maxLoss: number | null; spreadType: string | null }
  | { ok: false; error: string }
> {
  const spread = cand.spreadContract as TradierContract;
  const symbol = cand.symbol;
  const direction = cand.direction as "CALL" | "PUT";

  const spreadSymbol = String(spread.stock_symbol ?? spread.stockSymbol ?? symbol);
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
      estimated_order_cost: spreadNetCredit !== null ? spreadNetCredit * 100 : null,
      max_risk_dollars: spreadMaxLoss,

      contract_quality: spreadGrade,
      risk_guard_status: "APPROVED",
      risk_guard_reason: "Auto-scan cron enforcement passed all 7 checks.",

      entry_price: topResultEntry.entryPrice ?? topResultEntry.entry_price ?? null,
      stop_loss: topResultEntry.stopLoss ?? topResultEntry.stop_loss ?? null,
      take_profit: topResultEntry.takeProfit ?? topResultEntry.take_profit ?? null,

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
    return { ok: false, error: previewError?.message ?? "unknown error" };
  }

  // ACTIONABLE alert — phone-review generates the token and sends the Telegram
  // approval message with the review link.
  await fetch(`${baseUrl}/api/alerts/phone-review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ previewId: previewRow.id }),
  }).catch(() => {});

  // Dedup row — suppresses the legacy FYI path if ever re-enabled.
  await supabase
    .from("scanner_auto_alerts")
    .insert({ symbol, direction, alerted_at: new Date().toISOString() })
    .then(({ error }) => {
      if (error)
        console.warn("scanner_auto_alerts dedup insert failed (non-fatal):", error.message);
    });

  return {
    ok: true,
    previewId: previewRow.id as string,
    netCredit: typeof spreadNetCredit === "number" ? spreadNetCredit : null,
    maxLoss: typeof spreadMaxLoss === "number" ? spreadMaxLoss : null,
    spreadType: spread.spread_type ?? null,
  };
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

  // Base URL for ALL server-to-server self-fetches (quotes + earnings + phone-review).
  // Use the PUBLIC production domain (VERCEL_PROJECT_PRODUCTION_URL), NOT
  // new URL(request.url).origin — the deployment URL is gated by Vercel Deployment
  // Protection (302 → SSO), which silently fails self-fetches.
  const baseUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : new URL(request.url).origin;

  if (!isMorningScanWindowNewYork()) {
    return NextResponse.json({
      success: true,
      route: ROUTE,
      skipped: true,
      baseUrl,
      message: "Outside the morning scan window (9:30–10:30 ET, weekdays). Skipping.",
    });
  }

  const now = new Date();
  const stamp = formatEtStamp(now);

  try {
    const startOfTodayISO = getStartOfTodayNewYorkISO(now);

    // --- Once-per-day guard (silent) ---
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

    // --- SPY gate with exponential backoff ---
    const SPY_BACKOFF_MS = [0, 2000, 4000, 8000, 16000, 16000];
    let spyQuote: QuoteData | null = null;
    for (const delay of SPY_BACKOFF_MS) {
      if (delay > 0) await new Promise((res) => setTimeout(res, delay));
      spyQuote = await fetchQuote("SPY", baseUrl);
      if (spyQuote) break;
    }

    if (!spyQuote) {
      const budgetSec = Math.round(SPY_BACKOFF_MS.reduce((a, b) => a + b, 0) / 1000);
      await notify(
        `\u{1F6A8}\u{1F6A8} OPTIMA SCAN FAILURE ${stamp}\n` +
          `SPY quote unavailable after ${SPY_BACKOFF_MS.length} attempts (~${budgetSec}s).\n` +
          `Scan aborted — no symbols graded. Check Finnhub + Vercel logs.`
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

    // --- Token guard (once, before any Tradier call) ---
    const tradierEnv = (process.env.TRADIER_ENV ?? "sandbox").toLowerCase();
    const tradierToken =
      tradierEnv === "production"
        ? process.env.TRADIER_PRODUCTION_TOKEN
        : process.env.TRADIER_ACCESS_TOKEN;
    if (!tradierToken) {
      await notify(
        `\u{1F6A8}\u{1F6A8} OPTIMA SCAN FAILURE ${stamp}\n` +
          `Tradier ${tradierEnv} token not configured — cannot grade contracts.\n` +
          `Check Vercel env. No symbols graded.`
      );
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

    // --- Scan watchlist (setup score in memory) ---
    // Finnhub free tier caps at 60 quotes/min. With SPY+VIX already spent this
    // minute plus up to ~64 watchlist symbols, an unthrottled loop trips the
    // limit and the tail symbols come back null (positional, not bad symbols).
    // Space each quote ~1.1s apart so we stay well under 60/min. Worst case is
    // ~64 * (1.1s sleep + ~0.3s fetch) ≈ 90s — well inside the 300s budget.
    const QUOTE_THROTTLE_MS = 1100;
    const watchlist = await loadWatchlist();
    const symbolsToScan = watchlist.filter((s) => s !== "SPY");
    const results: ScanResult[] = [];

    for (let i = 0; i < symbolsToScan.length; i++) {
      if (i > 0) await new Promise((res) => setTimeout(res, QUOTE_THROTTLE_MS));
      const sym = symbolsToScan[i];
      const quote = await fetchQuote(sym, baseUrl);
      if (!quote) {
        console.warn("Skipping invalid quote:", sym);
        continue;
      }
      results.push(analyzeSetup(sym, quote, marketCondition));
    }

    const watchlistSize = symbolsToScan.length;
    const scannedCount = results.length;
    const quoteFailures = symbolsToScan.filter(
      (s) => !results.some((r) => r.symbol === s)
    );
    const completedFully = quoteFailures.length === 0;

    const sorted = sortScanResults(results);
    const topN = sorted.slice(0, SCAN_EVAL_BREADTH_N);

    // --- TOP-N CONTRACT GRADING (the behavioral change) ---
    // Contract-grade the top N ranked symbols — collect passes AND blocks with
    // reasons. This only widens what we LOOK AT; queueing discipline is below.
    const graded: GradedCandidate[] = [];
    const gradeParams: GradeParams = {
      accountSize: ACCOUNT_SIZE,
      maxRiskPercent: MAX_RISK_PERCENT,
      maxSpreadPercent: MAX_SPREAD_PERCENT,
    };
    for (const result of topN) {
      graded.push(await gradeSymbol(result, baseUrl, gradeParams));
    }

    const passers = graded.filter((g) => g.status === "PASSED");

    // --- QUEUE AT MOST DAILY_TRADE_CAP (execution discipline unchanged) ---
    // Iterate passers in rank order; queue the first that clears dedup +
    // enforcement, then STOP. The cap guard + break guarantee <= DAILY_TRADE_CAP
    // queued even when several candidates pass grading.
    let queuedCount = 0;
    let queuedSymbol: string | null = null;
    let queuedDirection: "CALL" | "PUT" | null = null;
    let queuedPreviewId: string | null = null;
    let queuedGrade: string | null = null;
    let queuedNetCredit: number | null = null;
    let queuedMaxLoss: number | null = null;
    let queuedSpreadType: string | null = null;
    let dbInsertError: string | null = null;
    const heldNotes: string[] = [];

    if (passers.length > 0) {
      // Daily gate data — fetched once, shared across queue attempts.
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

      const topResultBySymbol = new Map(results.map((r) => [r.symbol, r]));

      for (const cand of passers) {
        if (queuedCount >= DAILY_TRADE_CAP) break; // hard cap — never exceed
        if (!cand.spreadContract || !cand.direction) continue;

        // Per-symbol dedup.
        const { data: existingPreview } = await supabase
          .from("paper_order_previews")
          .select("id")
          .eq("symbol", cand.symbol)
          .gte("created_at", startOfTodayISO)
          .limit(1)
          .maybeSingle();
        if (existingPreview) {
          cand.queueNote = "already queued today (dedup)";
          heldNotes.push(`${cand.symbol}(dedup)`);
          continue;
        }

        // Enforcement — identical 7-check gate as before.
        const enforcement = runServerSideEnforcementChecks(cand.spreadContract, {
          tradeCount,
          lossCount,
          totalDailyPnl,
        });
        if (!enforcement.passed) {
          cand.queueNote = enforcement.reason ?? "enforcement blocked";
          heldNotes.push(`${cand.symbol}(${shortBlockReason(enforcement.reason ?? "")})`);
          continue;
        }

        const topEntry = topResultBySymbol.get(cand.symbol) ?? ({ symbol: cand.symbol } as ScanResult);
        const inserted = await queuePreview(cand, topEntry, baseUrl);
        if (!inserted.ok) {
          cand.queueNote = `DB error: ${inserted.error}`;
          heldNotes.push(`${cand.symbol}(db error)`);
          dbInsertError = inserted.error;
          continue;
        }

        queuedCount += 1;
        queuedSymbol = cand.symbol;
        queuedDirection = cand.direction;
        queuedPreviewId = inserted.previewId;
        queuedGrade = cand.grade;
        queuedNetCredit = inserted.netCredit;
        queuedMaxLoss = inserted.maxLoss;
        queuedSpreadType = inserted.spreadType;
        cand.queued = true;
        break; // <= DAILY_TRADE_CAP guaranteed
      }
    }

    // --- PERSIST: one run row + one row per graded candidate (non-fatal) ---
    const blockedCandidates = graded.filter((g) => g.status === "BLOCKED");
    const blockedReasonHist: Record<string, number> = {};
    for (const g of blockedCandidates) {
      const tag = shortBlockReason(g.reason);
      blockedReasonHist[tag] = (blockedReasonHist[tag] ?? 0) + 1;
    }

    const runRecord: ScanRunRecord = {
      run_at: now.toISOString(),
      watchlist_size: watchlistSize,
      symbols_scanned: scannedCount,
      symbols_graded: graded.length,
      candidates_passed: passers.length,
      candidates_blocked: blockedCandidates.length,
      blocked_reasons: blockedReasonHist,
      completed_fully: completedFully,
      market_condition: marketCondition,
      vix_regime: vixRegime,
    };

    const candidateRecords: ScanCandidateRecord[] = graded.map((g) => {
      // Spread economics come free off the already-built spread (gradeSymbol ran
      // selectBestCreditSpread). PASSED candidates carry a spreadContract; BLOCKED
      // ones don't, so these fields stay null. No extra Tradier calls.
      const sc = g.spreadContract;
      return {
        symbol: g.symbol,
        setup_score: g.setupScore,
        direction: g.direction,
        expiration: g.expiration,
        short_strike: g.shortStrike,
        short_delta: g.shortDelta,
        open_interest: g.openInterest,
        bid: g.bid,
        ask: g.ask,
        grade: g.grade,
        status: g.status,
        queued: g.queued,
        block_reason: g.status === "BLOCKED" ? g.reason : g.queueNote,
        long_strike: sc?.long_leg?.strike_price ?? null,
        net_credit: sc?.net_credit ?? null,
        spread_width: sc?.spread_width ?? null,
        max_loss: sc?.max_loss ?? null,
        max_profit: sc?.max_profit ?? null,
      };
    });

    const { persistError } = await persistScanRun(runRecord, candidateRecords);
    if (persistError) {
      // Non-fatal, but LOUD: a silent persistence failure is exactly how the
      // 3-week RLS bug hid. The scan's normal summary still sends below.
      await notify(
        `\u{1F6A8}\u{1F6A8} OPTIMA SCAN — PERSISTENCE FAILURE ${stamp}\n` +
          `Scan-observability write failed: ${persistError}\n` +
          `The scan itself completed; run/candidate data may be missing. Check RLS/schema + Vercel logs.`
      );
    }

    // --- NOTIFY: exactly one status message (RUN SUMMARY or FAILURE) ---
    // Healthy run -> ✅ RUN SUMMARY. Real breakage -> 🚨 FAILURE (visibly distinct).
    // ACTIONABLE was already sent by queuePreview when a trade was queued.
    // A few missing quotes (transient Finnhub hiccups) shouldn't kill the run —
    // the scan still grades everything that resolved. Only 🚨 FAIL when the miss
    // rate exceeds 5% of the watchlist (or a DB write failed). Below that, the ✅
    // summary carries a visible ⚠️ line instead of degrading the whole run.
    const quoteMissRate =
      watchlistSize > 0 ? quoteFailures.length / watchlistSize : 0;
    const quotesDegraded = quoteMissRate > 0.05;
    const isFailure = quotesDegraded || !!dbInsertError;

    if (isFailure) {
      const lines = [`\u{1F6A8}\u{1F6A8} OPTIMA SCAN FAILURE ${stamp}`];
      if (!completedFully) {
        lines.push(
          `Scanned ${scannedCount}/${watchlistSize} — ${quoteFailures.length} symbol${
            quoteFailures.length === 1 ? "" : "s"
          } had no quote: ${quoteFailures.join(", ")}`
        );
        lines.push("Run degraded — missing names not graded/persisted.");
      }
      if (dbInsertError) {
        lines.push(`Approval-queue DB write failed: ${dbInsertError}`);
      }
      if (queuedSymbol) {
        lines.push(
          `(A trade DID queue: ${queuedSymbol} ${queuedDirection} — see approval alert.)`
        );
      }
      lines.push("Check Finnhub + Vercel logs.");
      await notify(lines.join("\n"));
    } else {
      const lines = [`OPTIMA SCAN ✅ ${stamp}`];
      lines.push(
        `Scanned ${scannedCount}/${watchlistSize} · graded top ${graded.length} · ${queuedCount} queued · ${blockedCandidates.length} blocked`
      );
      if (quoteFailures.length > 0) {
        lines.push(
          `\u{26A0}\u{FE0F} ${quoteFailures.length} symbol${
            quoteFailures.length === 1 ? "" : "s"
          } missing quotes: ${quoteFailures.join(", ")}`
        );
      }
      if (queuedSymbol) {
        lines.push(
          `Queued: ${queuedSymbol} ${queuedDirection} ${queuedSpreadType ?? "credit spread"} (grade ${
            queuedGrade ?? "N/A"
          }, cr $${fmtNum(queuedNetCredit)} / maxloss $${fmtNum(queuedMaxLoss)})`
        );
      }
      if (blockedCandidates.length > 0) {
        // Display-only: sub-75 names aren't real grading blocks (they never
        // reached a Tradier call — see gradeSymbol score gate), and at N=20 they
        // would swamp the line. Show genuine grading/enforcement blocks inline;
        // collapse the sub-75 fillers to a trailing count. Persistence above keeps
        // every candidate + reason (incl. score<75) intact.
        const realBlocks = blockedCandidates.filter(
          (g) => shortBlockReason(g.reason) !== "score<75"
        );
        const subScoreCount = blockedCandidates.length - realBlocks.length;
        const realText = realBlocks
          .map((g) => `${g.symbol}(${shortBlockReason(g.reason)})`)
          .join(" · ");
        const subText =
          subScoreCount > 0 ? `${realText ? " · " : ""}+${subScoreCount} sub-75` : "";
        lines.push(`Blocked: ${realText}${subText}`);
      }
      if (heldNotes.length > 0) {
        lines.push(`Held: ${heldNotes.join(" · ")}`);
      }
      if (queuedCount === 0) {
        lines.push("Clean skip — nothing tradeable today.");
      }
      await notify(lines.join("\n"));
    }

    return NextResponse.json({
      success: true,
      route: ROUTE,
      pipelineComplete: true,
      completedFully,
      watchlistSize,
      scannedCount,
      gradedCount: graded.length,
      passedCount: passers.length,
      blockedCount: blockedCandidates.length,
      queuedCount,
      queuedSymbol,
      queuedDirection,
      previewId: queuedPreviewId,
      marketCondition,
      vixLevel,
      vixRegime,
      blockedReasons: blockedReasonHist,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unexpected server error during market-open scan.";
    console.error("Market open scan route error:", error);
    await notify(
      `\u{1F6A8}\u{1F6A8} OPTIMA SCAN FAILURE ${stamp}\n` +
        `Unexpected error: ${message}\n` +
        `Check Vercel logs.`
    );
    return NextResponse.json({ success: false, route: ROUTE, message }, { status: 500 });
  }
}
