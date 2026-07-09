import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { tradierRequest } from "@/lib/tradierClient";
import { sendTelegramAlert } from "@/lib/notify/sendTelegramAlert";

const ROUTE = "/api/cron/auto-close-check";

const TAKE_PROFIT_FACTOR = 0.5;
const STOP_LOSS_FACTOR = 2.0;

// Telegram is the active alert channel — matches the scan cron's sendHeartbeat.
// The old Twilio SMS / email-to-SMS path was retired (carrier 30034 block,
// T-Mobile gateway filtering). A Telegram failure never breaks the close loop.
async function sendHeartbeat(text: string): Promise<void> {
  await sendTelegramAlert(text).catch(() => {});
}

// Strike from the trailing 8 digits of an OCC option symbol (thousandths).
function occStrike(optionSymbol: string | null | undefined): string {
  const match = String(optionSymbol ?? "").match(/(\d{8})$/);
  return match ? String(Number(match[1]) / 1000) : "?";
}

// Call/put from the side flag immediately before the 8-digit strike.
function occRight(optionSymbol: string | null | undefined): string {
  const match = String(optionSymbol ?? "").match(/([CP])\d{8}$/);
  return match ? (match[1] === "C" ? "call" : "put") : "";
}

function spreadLabel(spreadType: string | null | undefined): string {
  if (spreadType === "bear_call_spread") return "bear call";
  if (spreadType === "bull_put_spread") return "bull put";
  return "spread";
}

type OptionTradeDetail = {
  id: string | number;
  paper_trade_id: string;
  stock_symbol: string | null;
  expiration_date: string | null;
  option_symbol: string | null;
  mid_price: number | null;
  contracts: number | null;
  option_status: string | null;
  option_pnl: number | null;
  spread_type: string | null;
  short_leg_option_symbol: string | null;
  long_leg_option_symbol: string | null;
  net_credit: number | null;
  max_loss: number | null;
};

type PaperTrade = {
  id: string;
  entry_price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
};

type TradierOption = {
  symbol?: string;
  bid?: number | null;
  ask?: number | null;
  last?: number | null;
};

function toNumber(value: unknown, fallback = 0): number {
  const numberValue = Number(value);
  return Number.isNaN(numberValue) ? fallback : numberValue;
}

function getOptionArray(data: any): TradierOption[] {
  const rawOptions = data?.options?.option;
  if (!rawOptions) return [];
  return Array.isArray(rawOptions) ? rawOptions : [rawOptions];
}

// Mid from a REAL two-sided quote only. No stale `last` / zero fallback — a
// missing quote must surface as null so the close loop SKIPS the position rather
// than acting on a fabricated price (which previously booked phantom TP/SL).
//   "strict"  (short leg / single leg): require bid>0 AND ask>0. A dead short
//             quote collapsing to 0 is exactly what fabricates fake take-profits.
//   "lenient" (long leg): ask>0 is enough — deep-OTM long legs legitimately have
//             bid=0; mid=(bid+ask)/2 still values them sanely. null only if ask<=0.
function getMid(
  option: TradierOption | undefined,
  mode: "strict" | "lenient" = "strict"
): number | null {
  if (!option) return null;
  const bid = toNumber(option.bid, 0);
  const ask = toNumber(option.ask, 0);
  if (bid > 0 && ask > 0) return (bid + ask) / 2;
  if (mode === "lenient" && ask > 0) return (bid + ask) / 2;
  return null;
}

async function fetchChain(
  stockSymbol: string,
  expirationDate: string,
  cache: Map<string, TradierOption[]>
): Promise<TradierOption[]> {
  const key = `${stockSymbol}:${expirationDate}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const result = await tradierRequest({
    path: `/markets/options/chains?symbol=${encodeURIComponent(
      stockSymbol
    )}&expiration=${encodeURIComponent(expirationDate)}&greeks=false`,
    method: "GET",
  });

  const options = result.ok ? getOptionArray(result.data) : [];
  cache.set(key, options);
  return options;
}

// Current underlying last price via Tradier — used ONLY to add a reference hint
// to the expired-position alert (win/loss guess). NEVER used to book P&L.
async function fetchStockLast(symbol: string): Promise<number | null> {
  const result = await tradierRequest({
    path: `/markets/quotes?symbols=${encodeURIComponent(symbol)}`,
    method: "GET",
  });
  if (!result.ok) return null;
  const q = (result.data as { quotes?: { quote?: unknown } })?.quotes?.quote;
  const one = (Array.isArray(q) ? q[0] : q) as { last?: number; close?: number } | undefined;
  const last = Number(one?.last ?? one?.close);
  return Number.isFinite(last) && last > 0 ? last : null;
}

function getNowDateStringNewYork(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(now);
}

function computeDTE(expirationDate: string, now: Date): number {
  const todayStr = getNowDateStringNewYork(now);
  const today = new Date(`${todayStr}T00:00:00Z`);
  const exp = new Date(`${expirationDate}T00:00:00Z`);
  return Math.round((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function isMarketHoursNowInNewYork(now: Date): boolean {
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
  const marketOpenMinutes = 9 * 60 + 30;
  const marketCloseMinutes = 16 * 60;

  return (
    isWeekday &&
    nowMinutes >= marketOpenMinutes &&
    nowMinutes <= marketCloseMinutes
  );
}

function getNewYorkUtcOffsetHours(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    timeZoneName: "short",
  }).formatToParts(date);
  const tzName = parts.find((p) => p.type === "timeZoneName")?.value;
  return tzName === "EDT" ? 4 : 5;
}

function getStartOfTodayNewYorkISO(now: Date): string {
  const nyDateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
  }).format(now);
  const offset = String(getNewYorkUtcOffsetHours(now)).padStart(2, "0");
  return new Date(`${nyDateStr}T00:00:00.000-${offset}:00`).toISOString();
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
  for (const p of parts) m[p.type] = p.value;
  return `${m.year}-${m.month}-${m.day} ${m.hour}:${m.minute} ET`;
}

// True only for the final in-market-hours run of the day on the */30 schedule
// (the ~16:00 ET tick). Used to fire exactly ONE end-of-day digest instead of a
// Telegram on every 30-min run.
function isFinalMarketRunNewYork(now: Date): boolean {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(now);
  const m: Record<string, string> = {};
  for (const p of parts) m[p.type] = p.value;
  const nowMinutes = Number(m.hour) * 60 + Number(m.minute);
  const marketCloseMinutes = 16 * 60;
  return nowMinutes > marketCloseMinutes - 30 && nowMinutes <= marketCloseMinutes;
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

  const now = new Date();

  if (!isMarketHoursNowInNewYork(now)) {
    return NextResponse.json({
      success: true,
      route: ROUTE,
      skipped: true,
      message: "Outside market hours (9:30 AM - 4:00 PM ET, weekdays). Skipping.",
    });
  }

  try {
    const { data, error } = await supabase
      .from("option_trade_details")
      .select(
        "id, paper_trade_id, stock_symbol, expiration_date, option_symbol, mid_price, contracts, option_status, option_pnl, spread_type, short_leg_option_symbol, long_leg_option_symbol, net_credit, max_loss"
      )
      .is("option_pnl", null);

    if (error) {
      console.error("Auto-close check query failed:", error);
      await sendHeartbeat(
        `\u{1F6A8}\u{1F6A8} OPTIMA AUTO-CLOSE FAILURE ${formatEtStamp(now)}\n` +
          `Open-position query failed: ${error.message}\nCheck Supabase + Vercel logs.`
      );
      return NextResponse.json(
        { success: false, route: ROUTE, message: error.message },
        { status: 500 }
      );
    }

    const openTrades = (data || []).filter(
      (d): d is OptionTradeDetail =>
        String(d.option_status || "").toLowerCase() !== "closed"
    );

    const chainCache = new Map<string, TradierOption[]>();
    const closedResults: Array<{
      stockSymbol: string;
      result: "WIN" | "LOSS";
      optionPnl: number;
    }> = [];
    // Reverse-desync collector: option leg closed but paper_trades failed to close.
    // These are NOT successful closes — surfaced via 🚨 + the response JSON.
    const desyncs: Array<{
      paperTradeId: string;
      stockSymbol: string;
      result: "WIN" | "LOSS";
      optionPnl: number;
    }> = [];
    // Expired positions (DTE < 0 — contract gone): need MANUAL settlement, never
    // auto-settled. Unpriceable (no quote this run, not expired): the recurring-
    // stuck signal. Both surfaced in the response every run; alerted once daily.
    const expired: Array<{
      paperTradeId: string;
      symbol: string;
      expiration: string;
      isSpread: boolean;
      spreadType: string | null;
      shortStrike: string;
      longStrike: string;
      netCredit: number | null;
      maxLoss: number | null;
      contracts: number;
    }> = [];
    const unpriceable: Array<{ paperTradeId: string; symbol: string; dte: number }> = [];

    for (const trade of openTrades) {
      const stockSymbol = trade.stock_symbol;
      const expirationDate = trade.expiration_date;

      if (!stockSymbol || !expirationDate) continue;

      // DTE computed once at the top (relocated from below — same value). Reused by
      // the expiry check here and the live dte<=21 trigger further down, unchanged.
      const dte = computeDTE(expirationDate, now);

      // Expired (contract gone from the chain): a market close is impossible. Do
      // NOT auto-settle (risks false P&L) — collect for the once-daily manual-
      // settlement alert and skip.
      if (dte < 0) {
        const spreadFlag = Boolean(
          trade.spread_type &&
            trade.spread_type !== "single_leg" &&
            trade.short_leg_option_symbol &&
            trade.long_leg_option_symbol
        );
        expired.push({
          paperTradeId: trade.paper_trade_id,
          symbol: stockSymbol,
          expiration: expirationDate,
          isSpread: spreadFlag,
          spreadType: trade.spread_type ?? null,
          shortStrike: occStrike(
            spreadFlag ? trade.short_leg_option_symbol : trade.option_symbol
          ),
          longStrike: spreadFlag ? occStrike(trade.long_leg_option_symbol) : "",
          netCredit: trade.net_credit,
          maxLoss: trade.max_loss ?? null,
          contracts: trade.contracts || 1,
        });
        continue;
      }

      const chain = await fetchChain(stockSymbol, expirationDate, chainCache);

      let entry: number | null = null;
      let current: number | null = null;

      const isSpread =
        trade.spread_type &&
        trade.spread_type !== "single_leg" &&
        trade.short_leg_option_symbol &&
        trade.long_leg_option_symbol;

      if (isSpread) {
        const shortOption = chain.find(
          (o) => o.symbol === trade.short_leg_option_symbol
        );
        const longOption = chain.find(
          (o) => o.symbol === trade.long_leg_option_symbol
        );

        const shortMid = getMid(shortOption, "strict");
        const longMid = getMid(longOption, "lenient");

        if (shortMid !== null && longMid !== null) {
          current = shortMid - longMid;
        }

        entry = trade.net_credit;
      } else {
        const option = chain.find((o) => o.symbol === trade.option_symbol);
        current = getMid(option, "strict");
        entry = trade.mid_price;
      }

      // Skip on any incomplete/fabricated price. current <= 0 means a leg quote
      // is broken (non-positive spread value is impossible for a live credit
      // spread) — never close on it, or we book a phantom max-profit win.
      if (entry === null || current === null || entry <= 0 || current <= 0) {
        // No valid quote this run (not expired — that's handled above). Flag for
        // the once-daily stuck report; the same symbol recurring across days is
        // the persistently-stuck signal (no schema/state needed).
        if (current === null) {
          unpriceable.push({
            paperTradeId: trade.paper_trade_id,
            symbol: stockSymbol,
            dte,
          });
        }
        continue;
      }

      const takeProfitTriggered = current <= TAKE_PROFIT_FACTOR * entry;
      const stopLossTriggered = current >= STOP_LOSS_FACTOR * entry;
      const dteTriggered = dte <= 21;

      if (!takeProfitTriggered && !stopLossTriggered && !dteTriggered) continue;

      const contracts = trade.contracts || 1;
      const optionPnl = (entry - current) * contracts * 100;

      let result: "WIN" | "LOSS";
      let closeReason: "take_profit" | "stop_loss" | "dte_21";
      if (takeProfitTriggered) {
        result = "WIN";
        closeReason = "take_profit";
      } else if (stopLossTriggered) {
        result = "LOSS";
        closeReason = "stop_loss";
      } else {
        result = optionPnl >= 0 ? "WIN" : "LOSS";
        closeReason = "dte_21";
      }

      const { error: optionUpdateError } = await supabase
        .from("option_trade_details")
        .update({
          option_status: "closed",
          exit_option_price: current,
          option_pnl: optionPnl,
        })
        .eq("id", trade.id);

      if (optionUpdateError) {
        console.error("Auto-close option update failed:", optionUpdateError);
        continue;
      }

      const sign = optionPnl >= 0 ? "+" : "-";
      const absAmount = Math.abs(optionPnl).toFixed(2);

      const contractDesc = isSpread
        ? `${stockSymbol} ${occStrike(trade.short_leg_option_symbol)}/${occStrike(
            trade.long_leg_option_symbol
          )} ${spreadLabel(trade.spread_type)}`
        : `${stockSymbol} ${occStrike(trade.option_symbol)} ${occRight(
            trade.option_symbol
          )}`.trim();

      // Second half of the close: bring paper_trades to closed. Track success so a
      // failure here (lookup error, missing row, OR update error) is treated as a
      // reverse-desync — never reported as a successful close.
      let paperClosed = false;

      const { data: paperTrade, error: paperTradeError } = await supabase
        .from("paper_trades")
        .select("id, entry_price, stop_loss, take_profit")
        .eq("id", trade.paper_trade_id)
        .maybeSingle();

      if (paperTradeError) {
        console.error("Auto-close paper trade lookup failed:", paperTradeError);
      } else if (paperTrade) {
        const pt = paperTrade as PaperTrade;
        const exitPrice =
          result === "WIN"
            ? pt.take_profit ?? pt.entry_price ?? 0
            : pt.stop_loss ?? pt.entry_price ?? 0;

        const { error: paperUpdateError } = await supabase
          .from("paper_trades")
          .update({
            status: "closed",
            exit_price: exitPrice,
            closed_at: now.toISOString(),
            // Parent row previously left pnl=0 / result=null on option closes,
            // silently corrupting any analysis over paper_trades.pnl. Write the
            // SAME optionPnl recorded in option_trade_details.option_pnl above, and
            // the WIN/LOSS already computed for the alert (uppercase, matching the
            // existing paper_trades.result convention in close-paper-trade).
            pnl: optionPnl,
            result,
          })
          .eq("id", trade.paper_trade_id);

        if (paperUpdateError) {
          console.error("Auto-close paper trade update failed:", paperUpdateError);
        } else {
          paperClosed = true;
        }
      }

      if (!paperClosed) {
        // Reverse desync: the option leg is closed (correct P&L recorded) but
        // paper_trades did not close. Do NOT count this as a close — fire ONE loud
        // 🚨 with the exact reconcile action and flag it in the response. No
        // rollback: the option close is correct data; paper_trades is fixed forward.
        console.error(
          "Auto-close reverse desync — paper_trades not closed:",
          trade.paper_trade_id
        );
        await sendHeartbeat(
          `\u{1F6A8}\u{1F6A8} OPTIMA AUTO-CLOSE DESYNC — ${contractDesc}\n` +
            `Option leg closed (${result} ${sign}$${absAmount}) but paper_trades did NOT close.\n` +
            `Reconcile paper_trade ${trade.paper_trade_id}: set status='closed', closed_at. ` +
            `NOT counted as a close.`
        );
        desyncs.push({
          paperTradeId: trade.paper_trade_id,
          stockSymbol,
          result,
          optionPnl,
        });
        continue;
      }

      closedResults.push({ stockSymbol, result, optionPnl });

      const reasonText =
        closeReason === "take_profit"
          ? "Profit target hit (50%)"
          : closeReason === "stop_loss"
          ? "Stop hit (1× credit)"
          : `21-DTE gamma close (${dte} DTE)`;

      // Telegram — same channel as the scan cron. Replaces the retired SMS path.
      await sendHeartbeat(
        `OPTIMA AUTO-CLOSE — ${contractDesc}\n${reasonText} | ${result} | P&L: ${sign}$${absAmount}`
      );
    }

    // --- End-of-day digest (once daily, on the final market-hours run) ---
    // Kills the "ran vs never-ran" blindness without spamming a Telegram on every
    // 30-min run. Immediate per-close alerts are sent above; this is the wrap-up.
    if (isFinalMarketRunNewYork(now)) {
      const startOfTodayISO = getStartOfTodayNewYorkISO(now);

      const { data: closedTodayPT } = await supabase
        .from("paper_trades")
        .select("id")
        .gte("closed_at", startOfTodayISO);
      const closedIds = (closedTodayPT ?? []).map((r) => r.id);
      const closedToday = closedIds.length;

      let tp = 0;
      let sl = 0;
      let dte = 0;
      if (closedIds.length > 0) {
        const { data: legs } = await supabase
          .from("option_trade_details")
          .select("net_credit, exit_option_price")
          .in("paper_trade_id", closedIds)
          .eq("option_status", "closed");
        // Recompute the close reason from exit vs credit — mirrors this cron's own
        // TP/SL precedence exactly. The remainder bucket = DTE (or a non-threshold
        // manual close).
        for (const leg of legs ?? []) {
          const credit = toNumber(leg.net_credit, 0);
          const exit = toNumber(leg.exit_option_price, 0);
          if (credit > 0 && exit <= TAKE_PROFIT_FACTOR * credit) tp++;
          else if (credit > 0 && exit >= STOP_LOSS_FACTOR * credit) sl++;
          else dte++;
        }
      }

      await sendHeartbeat(
        `OPTIMA AUTO-CLOSE ✅ ${formatEtStamp(now)} — checked ${openTrades.length} open, ` +
          `closed ${closedToday} today (TP ${tp} / SL ${sl} / DTE ${dte})`
      );

      // Once-daily stuck-positions alert. Expired = needs MANUAL settlement (never
      // auto-settled — booking a wrong settlement corrupts the proof data).
      // Unpriceable = the recurring-stuck signal. Alert only.
      if (expired.length > 0 || unpriceable.length > 0) {
        const lines = [
          `\u{1F6A8}\u{1F6A8} OPTIMA AUTO-CLOSE — STUCK POSITIONS ${formatEtStamp(now)}`,
        ];

        if (expired.length > 0) {
          lines.push("EXPIRED — needs MANUAL settlement:");
          for (const p of expired) {
            const legLabel = p.isSpread
              ? `${p.spreadType === "bull_put_spread" ? "bull put, short put" : "bear call, short call"} $${p.shortStrike}${p.longStrike ? ` / long $${p.longStrike}` : ""}`
              : `short $${p.shortStrike}`;

            const last = await fetchStockLast(p.symbol);
            const k = Number(p.shortStrike);
            let hint: string;
            if (last == null || Number.isNaN(k)) {
              hint =
                "Hint (reference only): stock price unavailable — verify manually before settling.";
            } else {
              const worthless =
                p.spreadType === "bull_put_spread"
                  ? last > k
                  : p.spreadType === "bear_call_spread"
                  ? last < k
                  : null;
              const verdict =
                worthless === true
                  ? "likely expired WORTHLESS → keep full credit (max profit)"
                  : worthless === false
                  ? "likely expired IN-THE-MONEY → loss"
                  : "compare to short strike";
              hint = `Hint (reference only, NOT booked): stock $${last.toFixed(2)} vs short $${p.shortStrike} → ${verdict}. VERIFY before settling.`;
            }

            lines.push(
              `• ${p.symbol} (exp ${p.expiration}) ${legLabel} — credit $${
                p.netCredit != null ? p.netCredit.toFixed(2) : "N/A"
              }, max loss $${p.maxLoss != null ? p.maxLoss.toFixed(2) : "N/A"}`
            );
            lines.push(`  ${hint}`);
            lines.push(
              `  Settle: dashboard "Close @ Price" (or POST /api/close-option-trade) with price 0 if worthless — books the full credit as max profit — else the real settlement value.`
            );
          }
        }

        if (unpriceable.length > 0) {
          lines.push(
            `UNPRICEABLE this run (not expired): ${unpriceable
              .map((u) => `${u.symbol} (${u.dte} DTE)`)
              .join(", ")} — if the same name recurs across days, investigate/settle manually.`
          );
        }

        await sendHeartbeat(lines.join("\n"));
      }
    }

    return NextResponse.json({
      success: true,
      route: ROUTE,
      checked: openTrades.length,
      closed: closedResults.length,
      results: closedResults,
      desyncCount: desyncs.length,
      desyncs,
      expiredCount: expired.length,
      expired,
      unpriceableCount: unpriceable.length,
      unpriceable,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Unexpected server error during auto-close check.";

    console.error("Auto-close check route error:", error);

    await sendHeartbeat(
      `\u{1F6A8}\u{1F6A8} OPTIMA AUTO-CLOSE FAILURE ${formatEtStamp(now)}\n` +
        `${errorMessage}\nCheck Vercel logs.`
    );

    return NextResponse.json(
      { success: false, route: ROUTE, message: errorMessage },
      { status: 500 }
    );
  }
}
