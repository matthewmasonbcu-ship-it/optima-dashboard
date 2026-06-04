import { NextRequest, NextResponse } from "next/server";
import { tradierRequest } from "@/lib/tradierClient";

export const dynamic = "force-dynamic";

type TradierOption = {
  symbol?: string;
  description?: string;
  bid?: number | null;
  ask?: number | null;
  last?: number | null;
  volume?: number | null;
  open_interest?: number | null;
  strike?: number | null;
  expiration_date?: string | null;
  option_type?: string | null;
  root_symbol?: string | null;
  underlying?: string | null;
  greeks?: {
    delta?: number | null;
    gamma?: number | null;
    theta?: number | null;
    vega?: number | null;
    rho?: number | null;
    mid_iv?: number | null;
    bid_iv?: number | null;
    ask_iv?: number | null;
    smv_vol?: number | null;
  } | null;
};

function toNumber(value: unknown, fallback = 0): number {
  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) return fallback;

  return numberValue;
}

function normalizeTradierOption(option: TradierOption) {
  const bid = toNumber(option.bid, 0);
  const ask = toNumber(option.ask, 0);
  const mid = bid > 0 && ask > 0 ? (bid + ask) / 2 : toNumber(option.last, 0);

  const spread = ask > 0 && bid > 0 ? ask - bid : 0;
  const spreadPercent = mid > 0 ? (spread / mid) * 100 : 0;

  const optionType = String(option.option_type || "").toUpperCase();

  return {
    source: "tradier",
    option_symbol: option.symbol || "",
    optionSymbol: option.symbol || "",
    symbol: option.symbol || "",

    description: option.description || "",

    stock_symbol: option.underlying || option.root_symbol || "",
    stockSymbol: option.underlying || option.root_symbol || "",

    trade_direction: optionType === "PUT" ? "PUT" : "CALL",
    tradeDirection: optionType === "PUT" ? "PUT" : "CALL",

    option_type: optionType,
    optionType,

    expiration_date: option.expiration_date || null,
    expirationDate: option.expiration_date || null,

    strike_price: toNumber(option.strike, 0),
    strikePrice: toNumber(option.strike, 0),

    bid_price: bid,
    bidPrice: bid,
    bid,

    ask_price: ask,
    askPrice: ask,
    ask,

    mid_price: mid,
    midPrice: mid,
    mid,

    spread,
    spread_percent: spreadPercent,
    spreadPercent,

    volume: toNumber(option.volume, 0),
    open_interest: toNumber(option.open_interest, 0),
    openInterest: toNumber(option.open_interest, 0),

    last: toNumber(option.last, 0),

    delta: option.greeks?.delta ?? null,
    gamma: option.greeks?.gamma ?? null,
    theta: option.greeks?.theta ?? null,
    vega: option.greeks?.vega ?? null,
    rho: option.greeks?.rho ?? null,

    implied_volatility:
      option.greeks?.mid_iv ??
      option.greeks?.smv_vol ??
      option.greeks?.bid_iv ??
      option.greeks?.ask_iv ??
      null,
    impliedVolatility:
      option.greeks?.mid_iv ??
      option.greeks?.smv_vol ??
      option.greeks?.bid_iv ??
      option.greeks?.ask_iv ??
      null,

    contracts: 1,
    estimated_cost: mid * 100,
    estimatedCost: mid * 100,
    max_risk: mid * 100,
    maxRisk: mid * 100,

    qualityGrade: "UNKNOWN",
    contractQualityGrade: "UNKNOWN",
    grade: "UNKNOWN",

    recommendationReason:
      "Real Tradier contract loaded read-only. Quality grade will be assigned by dashboard filters.",
    whyThisContract: [
      "Loaded from Tradier sandbox option chain.",
      "Read-only market data only.",
      "Risk Guard still controls approval before saving.",
    ],
  };
}

function getOptionArray(data: any): TradierOption[] {
  const rawOptions = data?.options?.option;

  if (!rawOptions) return [];

  if (Array.isArray(rawOptions)) return rawOptions;

  return [rawOptions];
}

export async function GET(request: NextRequest) {
  try {
    const token = process.env.TRADIER_ACCESS_TOKEN;

    const searchParams = request.nextUrl.searchParams;
    const symbol = searchParams.get("symbol")?.toUpperCase() || "NVDA";
    const expiration = searchParams.get("expiration");

    if (!token) {
      return NextResponse.json({
        success: true,
        connected: false,
        route: "/api/tradier/options/chain",
        mode: process.env.TRADIER_ENV || "sandbox",
        status: "WAITING_VERIFICATION",
        symbol,
        expiration,
        message:
          "Tradier access token is not set yet. This is expected while waiting for Tradier verification.",
        chainAvailable: false,
        contracts: [],
        ordersEnabled: false,
        liveTradingEnabled: false,
      });
    }

    if (!expiration) {
      return NextResponse.json(
        {
          success: false,
          connected: true,
          route: "/api/tradier/options/chain",
          mode: process.env.TRADIER_ENV || "sandbox",
          status: "MISSING_EXPIRATION",
          symbol,
          message:
            "Missing expiration query parameter. Example: /api/tradier/options/chain?symbol=NVDA&expiration=2026-06-19",
          chainAvailable: false,
          contracts: [],
          ordersEnabled: false,
          liveTradingEnabled: false,
        },
        { status: 400 }
      );
    }

    const result = await tradierRequest({
      path: `/markets/options/chains?symbol=${encodeURIComponent(
        symbol
      )}&expiration=${encodeURIComponent(expiration)}&greeks=true`,
      method: "GET",
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          success: false,
          connected: false,
          route: "/api/tradier/options/chain",
          message: "Tradier option chain request failed.",
          status: result.status,
          symbol,
          expiration,
          data: result.data,
          chainAvailable: false,
          contracts: [],
          ordersEnabled: false,
          liveTradingEnabled: false,
        },
        { status: result.status }
      );
    }

    const rawOptions = getOptionArray(result.data);
    const contracts = rawOptions.map(normalizeTradierOption);

    return NextResponse.json({
      success: true,
      connected: true,
      route: "/api/tradier/options/chain",
      mode: process.env.TRADIER_ENV || "sandbox",
      status: "CONNECTED",
      symbol,
      expiration,
      chainAvailable: true,
      contractCount: contracts.length,
      contracts,
      ordersEnabled: false,
      liveTradingEnabled: false,
      data: result.data,
    });
  } catch (error) {
    console.error("Tradier option chain route error:", error);

    return NextResponse.json(
      {
        success: false,
        connected: false,
        route: "/api/tradier/options/chain",
        message: "Unexpected server error while loading Tradier option chain.",
        error: error instanceof Error ? error.message : "Unknown error",
        chainAvailable: false,
        contracts: [],
        ordersEnabled: false,
        liveTradingEnabled: false,
      },
      { status: 500 }
    );
  }
}