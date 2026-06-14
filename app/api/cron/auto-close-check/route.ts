import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { tradierRequest } from "@/lib/tradierClient";
import { sendPhoneAlertSms } from "@/lib/sms/sendPhoneAlertSms";
import { sendPhoneAlertEmailSms } from "@/lib/sms/sendPhoneAlertEmailSms";

const ROUTE = "/api/cron/auto-close-check";

const TAKE_PROFIT_FACTOR = 0.5;
const STOP_LOSS_FACTOR = 2.0;

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

function getMid(option: TradierOption | undefined): number | null {
  if (!option) return null;
  const bid = toNumber(option.bid, 0);
  const ask = toNumber(option.ask, 0);
  if (bid > 0 && ask > 0) return (bid + ask) / 2;
  return toNumber(option.last, 0);
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
        "id, paper_trade_id, stock_symbol, expiration_date, option_symbol, mid_price, contracts, option_status, option_pnl, spread_type, short_leg_option_symbol, long_leg_option_symbol, net_credit"
      )
      .is("option_pnl", null);

    if (error) {
      console.error("Auto-close check query failed:", error);
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

    for (const trade of openTrades) {
      const stockSymbol = trade.stock_symbol;
      const expirationDate = trade.expiration_date;

      if (!stockSymbol || !expirationDate) continue;

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

        const shortMid = getMid(shortOption);
        const longMid = getMid(longOption);

        if (shortMid !== null && longMid !== null) {
          current = shortMid - longMid;
        }

        entry = trade.net_credit;
      } else {
        const option = chain.find((o) => o.symbol === trade.option_symbol);
        current = getMid(option);
        entry = trade.mid_price;
      }

      if (entry === null || current === null || entry <= 0) continue;

      const takeProfitTriggered = current <= TAKE_PROFIT_FACTOR * entry;
      const stopLossTriggered = current >= STOP_LOSS_FACTOR * entry;

      if (!takeProfitTriggered && !stopLossTriggered) continue;

      const result: "WIN" | "LOSS" = takeProfitTriggered ? "WIN" : "LOSS";
      const contracts = trade.contracts || 1;
      const optionPnl = (entry - current) * contracts * 100;

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
          })
          .eq("id", trade.paper_trade_id);

        if (paperUpdateError) {
          console.error("Auto-close paper trade update failed:", paperUpdateError);
        }
      }

      closedResults.push({ stockSymbol, result, optionPnl });

      const sign = optionPnl >= 0 ? "+" : "-";
      const message = `OPTIMA AUTO-CLOSE: ${stockSymbol} ${result} — P&L: ${sign}$${Math.abs(
        optionPnl
      ).toFixed(2)}. Position closed automatically.`;

      const smsResult = await sendPhoneAlertSms(message);
      if (!smsResult.success) {
        await sendPhoneAlertEmailSms(message);
      }
    }

    return NextResponse.json({
      success: true,
      route: ROUTE,
      checked: openTrades.length,
      closed: closedResults.length,
      results: closedResults,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Unexpected server error during auto-close check.";

    console.error("Auto-close check route error:", error);

    return NextResponse.json(
      { success: false, route: ROUTE, message: errorMessage },
      { status: 500 }
    );
  }
}
