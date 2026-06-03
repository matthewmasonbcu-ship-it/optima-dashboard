import { NextRequest, NextResponse } from "next/server";

type TradeDirection = "CALL" | "PUT";

type MockContract = {
  option_symbol: string;
  optionSymbol: string;
  symbol: string;

  stock_symbol: string;
  stockSymbol: string;

  trade_direction: TradeDirection;
  tradeDirection: TradeDirection;

  expiration_date: string;
  expirationDate: string;

  strike_price: number;
  strikePrice: number;

  bid_price: number;
  bidPrice: number;
  bid: number;

  ask_price: number;
  askPrice: number;
  ask: number;

  mid_price: number;
  midPrice: number;
  mid: number;

  contracts: number;

  estimated_cost: number;
  estimatedCost: number;

  max_risk: number;
  maxRisk: number;

  spreadPercent: number;
  spread_percent: number;
  bidAskSpreadPercent: number;

  volume: number;
  openInterest: number;
  open_interest: number;

  liquidityScore: number;
  liquidity_score: number;

  recommendationScore: number;
  recommendation_score: number;

  qualityGrade: "A+" | "A" | "B" | "C" | "BLOCKED";
  contractQualityGrade: "A+" | "A" | "B" | "C" | "BLOCKED";
  grade: "A+" | "A" | "B" | "C" | "BLOCKED";

  recommendationReason: string;
  whyThisContract: string[];
};

function getMockStockPrice(symbol: string) {
  const prices: Record<string, number> = {
    AAPL: 312,
    MSFT: 485,
    NVDA: 180,
    TSLA: 350,
    SPY: 590,
  };

  return prices[symbol.toUpperCase()] || 250;
}

function getNextFridayDate(daysOut: number) {
  const date = new Date();
  date.setDate(date.getDate() + daysOut);

  return date.toISOString().split("T")[0];
}

function buildContract(params: {
  stockSymbol: string;
  direction: TradeDirection;
  stockPrice: number;
  strikeOffset: number;
  bid: number;
  ask: number;
  expirationDays: number;
  volume: number;
  openInterest: number;
  liquidityScore: number;
  recommendationScore: number;
  qualityGrade: "A+" | "A" | "B" | "C" | "BLOCKED";
  reason: string;
}): MockContract {
  const {
    stockSymbol,
    direction,
    stockPrice,
    strikeOffset,
    bid,
    ask,
    expirationDays,
    volume,
    openInterest,
    liquidityScore,
    recommendationScore,
    qualityGrade,
    reason,
  } = params;

  const strike =
    direction === "CALL"
      ? Math.round(stockPrice + strikeOffset)
      : Math.round(stockPrice - strikeOffset);

  const mid = Number(((bid + ask) / 2).toFixed(2));
  const contracts = 1;
  const estimatedCost = Number((mid * contracts * 100).toFixed(2));
  const maxRisk = estimatedCost;
  const spreadPercent =
    mid > 0 ? Number((((ask - bid) / mid) * 100).toFixed(1)) : 999;

  const expirationDate = getNextFridayDate(expirationDays);

  const optionType = direction === "CALL" ? "C" : "P";
  const cleanDate = expirationDate.replaceAll("-", "").slice(2);

  const optionSymbol = `${stockSymbol}${cleanDate}${optionType}${String(
    Math.round(strike * 1000)
  ).padStart(8, "0")}`;

  return {
    option_symbol: optionSymbol,
    optionSymbol,
    symbol: optionSymbol,

    stock_symbol: stockSymbol,
    stockSymbol,

    trade_direction: direction,
    tradeDirection: direction,

    expiration_date: expirationDate,
    expirationDate,

    strike_price: strike,
    strikePrice: strike,

    bid_price: bid,
    bidPrice: bid,
    bid,

    ask_price: ask,
    askPrice: ask,
    ask,

    mid_price: mid,
    midPrice: mid,
    mid,

    contracts,

    estimated_cost: estimatedCost,
    estimatedCost,

    max_risk: maxRisk,
    maxRisk,

    spreadPercent,
    spread_percent: spreadPercent,
    bidAskSpreadPercent: spreadPercent,

    volume,
    openInterest,
    open_interest: openInterest,

    liquidityScore,
    liquidity_score: liquidityScore,

    recommendationScore,
    recommendation_score: recommendationScore,

    qualityGrade,
    contractQualityGrade: qualityGrade,
    grade: qualityGrade,

    recommendationReason: reason,
    whyThisContract: [
      reason,
      `Grade: ${qualityGrade}`,
      `Spread: ${spreadPercent}%`,
      `Liquidity score: ${liquidityScore}`,
      `Recommendation score: ${recommendationScore}`,
      `Max risk: $${maxRisk.toFixed(2)}`,
    ],
  };
}

function buildMockChain(stockSymbol: string, direction: TradeDirection, price: number) {
  const stockPrice = price > 0 ? price : getMockStockPrice(stockSymbol);

  const contracts: MockContract[] = [
    buildContract({
      stockSymbol,
      direction,
      stockPrice,
      strikeOffset: 0,
      bid: 0.95,
      ask: 1.02,
      expirationDays: 14,
      volume: 2400,
      openInterest: 8900,
      liquidityScore: 96,
      recommendationScore: 94,
      qualityGrade: "A+",
      reason: "Best overall contract: tight spread, strong liquidity, and controlled risk.",
    }),

    buildContract({
      stockSymbol,
      direction,
      stockPrice,
      strikeOffset: 2,
      bid: 0.82,
      ask: 0.91,
      expirationDays: 14,
      volume: 1600,
      openInterest: 6200,
      liquidityScore: 88,
      recommendationScore: 86,
      qualityGrade: "A",
      reason: "Strong contract with good spread and healthy liquidity.",
    }),

    buildContract({
      stockSymbol,
      direction,
      stockPrice,
      strikeOffset: 4,
      bid: 0.58,
      ask: 0.72,
      expirationDays: 21,
      volume: 850,
      openInterest: 3300,
      liquidityScore: 72,
      recommendationScore: 70,
      qualityGrade: "B",
      reason: "Acceptable contract, but not the cleanest choice.",
    }),

    buildContract({
      stockSymbol,
      direction,
      stockPrice,
      strikeOffset: 7,
      bid: 0.30,
      ask: 0.48,
      expirationDays: 21,
      volume: 180,
      openInterest: 600,
      liquidityScore: 42,
      recommendationScore: 48,
      qualityGrade: "C",
      reason: "Weak contract for testing: low liquidity and wide spread.",
    }),

    buildContract({
      stockSymbol,
      direction,
      stockPrice,
      strikeOffset: 12,
      bid: 0.08,
      ask: 0.24,
      expirationDays: 7,
      volume: 20,
      openInterest: 75,
      liquidityScore: 12,
      recommendationScore: 18,
      qualityGrade: "BLOCKED",
      reason: "Blocked contract for testing: extremely wide spread and poor liquidity.",
    }),
  ];

  return contracts;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const symbol = (searchParams.get("symbol") || "MSFT").toUpperCase();

    const directionParam = (
      searchParams.get("direction") ||
      searchParams.get("tradeDirection") ||
      "CALL"
    ).toUpperCase();

    const direction: TradeDirection =
      directionParam === "PUT" ? "PUT" : "CALL";

    const priceParam = searchParams.get("price");
    const parsedPrice = priceParam ? Number(priceParam) : 0;
    const price = Number.isFinite(parsedPrice) && parsedPrice > 0
      ? parsedPrice
      : getMockStockPrice(symbol);

    const contracts = buildMockChain(symbol, direction, price);

    return NextResponse.json({
      success: true,
      source: "mock",
      symbol,
      stockSymbol: symbol,
      direction,
      tradeDirection: direction,
      price,
      underlyingPrice: price,
      contracts,
      optionChain: contracts,
      chain: contracts,
      message:
        "Mock option chain loaded with A+, A, B, C, and BLOCKED contracts for testing.",
    });
  } catch (error: any) {
    console.error("Mock option chain error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to load mock option chain.",
      },
      { status: 500 }
    );
  }
}