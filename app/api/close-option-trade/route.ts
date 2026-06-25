import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { tradierRequest } from "@/lib/tradierClient";

// Option-aware manual close. Mirrors the P&L math in the auto-close cron
// (app/api/cron/auto-close-check) exactly: entry = net_credit (spread) or
// mid_price (single leg), current = short mid − long mid (spread) or option
// mid (single leg), option_pnl = (entry − current) × contracts × 100.
// Updates BOTH option_trade_details and paper_trades so the option P&L is
// recorded and the cron no longer sees the position as open.

const ROUTE = "/api/close-option-trade";

type TradierOption = {
  symbol?: string;
  bid?: number | null;
  ask?: number | null;
  last?: number | null;
};

function toNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isNaN(n) ? fallback : n;
}

function getOptionArray(data: unknown): TradierOption[] {
  const raw = (data as { options?: { option?: TradierOption | TradierOption[] } })
    ?.options?.option;
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

function getMid(option: TradierOption | undefined): number | null {
  if (!option) return null;
  const bid = toNumber(option.bid, 0);
  const ask = toNumber(option.ask, 0);
  if (bid > 0 && ask > 0) return (bid + ask) / 2;
  return toNumber(option.last, 0);
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const paperTradeId = String(body?.paperTradeId ?? "");
    const hasManual =
      body?.manualPrice !== undefined &&
      body?.manualPrice !== null &&
      body?.manualPrice !== "";
    const manualPrice = hasManual ? Number(body.manualPrice) : null;

    if (!paperTradeId) {
      return NextResponse.json(
        { success: false, route: ROUTE, error: "Missing paperTradeId." },
        { status: 400 }
      );
    }

    if (hasManual && (manualPrice === null || Number.isNaN(manualPrice) || manualPrice < 0)) {
      return NextResponse.json(
        { success: false, route: ROUTE, error: "Invalid manualPrice." },
        { status: 400 }
      );
    }

    // --- Load the option detail for this trade ---
    const { data: detail, error: detailError } = await supabase
      .from("option_trade_details")
      .select(
        "id, paper_trade_id, stock_symbol, expiration_date, option_symbol, mid_price, contracts, option_status, option_pnl, spread_type, short_leg_option_symbol, long_leg_option_symbol, net_credit"
      )
      .eq("paper_trade_id", paperTradeId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (detailError) {
      return NextResponse.json(
        { success: false, route: ROUTE, error: detailError.message },
        { status: 500 }
      );
    }

    if (!detail) {
      return NextResponse.json(
        { success: false, route: ROUTE, error: "No option details found for this trade." },
        { status: 404 }
      );
    }

    if (String(detail.option_status || "").toLowerCase() === "closed" || detail.option_pnl !== null) {
      return NextResponse.json(
        { success: false, route: ROUTE, error: "This option position is already closed." },
        { status: 409 }
      );
    }

    const isSpread = Boolean(
      detail.spread_type &&
        detail.spread_type !== "single_leg" &&
        detail.short_leg_option_symbol &&
        detail.long_leg_option_symbol
    );

    const entry = isSpread ? detail.net_credit : detail.mid_price;
    if (entry === null || entry <= 0) {
      return NextResponse.json(
        {
          success: false,
          route: ROUTE,
          error: "Trade has no valid entry credit/price to compute P&L.",
        },
        { status: 422 }
      );
    }

    // --- Determine the current spread price ---
    let current: number | null = null;
    let priceSource: "manual" | "live" = "manual";

    if (hasManual) {
      current = manualPrice;
      priceSource = "manual";
    } else {
      priceSource = "live";
      if (!detail.stock_symbol || !detail.expiration_date) {
        return NextResponse.json(
          {
            success: false,
            route: ROUTE,
            error:
              "Missing stock symbol or expiration on the trade; cannot fetch a live price. Enter a price manually.",
          },
          { status: 422 }
        );
      }

      const chainResult = await tradierRequest({
        path: `/markets/options/chains?symbol=${encodeURIComponent(
          detail.stock_symbol
        )}&expiration=${encodeURIComponent(detail.expiration_date)}&greeks=false`,
        method: "GET",
      });

      if (!chainResult.ok) {
        return NextResponse.json(
          {
            success: false,
            route: ROUTE,
            error: `Tradier chain fetch failed (${chainResult.status}). Enter a price manually.`,
          },
          { status: 502 }
        );
      }

      const chain = getOptionArray(chainResult.data);

      if (isSpread) {
        const shortMid = getMid(
          chain.find((o) => o.symbol === detail.short_leg_option_symbol)
        );
        const longMid = getMid(
          chain.find((o) => o.symbol === detail.long_leg_option_symbol)
        );
        if (shortMid === null || longMid === null) {
          return NextResponse.json(
            {
              success: false,
              route: ROUTE,
              error: "Could not read both legs from the live chain. Enter a price manually.",
            },
            { status: 422 }
          );
        }
        current = shortMid - longMid;
      } else {
        const optionMid = getMid(chain.find((o) => o.symbol === detail.option_symbol));
        if (optionMid === null) {
          return NextResponse.json(
            {
              success: false,
              route: ROUTE,
              error: "Could not read the option from the live chain. Enter a price manually.",
            },
            { status: 422 }
          );
        }
        current = optionMid;
      }
    }

    if (current === null || Number.isNaN(current)) {
      return NextResponse.json(
        { success: false, route: ROUTE, error: "Could not determine a close price." },
        { status: 422 }
      );
    }

    const contracts = toNumber(detail.contracts, 1) || 1;
    const optionPnl = (entry - current) * contracts * 100;
    const result: "WIN" | "LOSS" = optionPnl >= 0 ? "WIN" : "LOSS";

    // --- Update option_trade_details (the real option P&L record) ---
    const { error: optionUpdateError } = await supabase
      .from("option_trade_details")
      .update({
        option_status: "closed",
        exit_option_price: current,
        option_pnl: optionPnl,
      })
      .eq("id", detail.id);

    if (optionUpdateError) {
      return NextResponse.json(
        { success: false, route: ROUTE, error: `Option detail update failed: ${optionUpdateError.message}` },
        { status: 500 }
      );
    }

    // --- Update paper_trades (the wrapper) ---
    const { error: paperUpdateError } = await supabase
      .from("paper_trades")
      .update({ status: "closed", closed_at: new Date().toISOString() })
      .eq("id", paperTradeId);

    if (paperUpdateError) {
      return NextResponse.json(
        {
          success: false,
          route: ROUTE,
          error: `Option detail closed, but paper_trades update failed: ${paperUpdateError.message}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      route: ROUTE,
      paperTradeId,
      priceSource,
      currentSpreadPrice: current,
      contracts,
      optionPnl,
      result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        route: ROUTE,
        error: error instanceof Error ? error.message : "Unexpected error during option close.",
      },
      { status: 500 }
    );
  }
}
