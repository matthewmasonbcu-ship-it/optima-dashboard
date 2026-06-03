import { NextRequest, NextResponse } from "next/server";

type MockOptionContract = {
  option_symbol: string;
  stock_symbol: string;
  trade_direction: "CALL" | "PUT";
  expiration_date: string;
  strike_price: number;
  bid_price: number;
  ask_price: number;
  mid_price: number;
  contracts: number;
  estimated_cost: number;
  max_risk: number;
  volume: number;
  open_interest: number;
  implied_volatility: number;
  delta: number;
  liquidity_score: number;
  spread_percent: number;
};

function getNextFridays(count = 4) {
  const dates: string[] = [];
  const today = new Date();

  let current = new Date(today);

  while (dates.length < count) {
    current.setDate(current.getDate() + 1);

    if (current.getDay() === 5) {
      dates.push(current.toISOString().split("T")[0]);
    }
  }

  return dates;
}

function calculateMidPrice(bid: number, ask: number) {
  return Number(((bid + ask) / 2).toFixed(2));
}

function buildOptionSymbol(
  stockSymbol: string,
  expirationDate: string,
  strikePrice: number,
  direction: "CALL" | "PUT"
) {
  return `${stockSymbol} ${expirationDate} ${strikePrice}${direction}`;
}

function buildMockContracts(
  stockSymbol: string,
  currentPrice: number,
  direction: "CALL" | "PUT"
): MockOptionContract[] {
  const expirations = getNextFridays(4);

  const strikeSpacing =
    currentPrice >= 500 ? 10 : currentPrice >= 150 ? 5 : currentPrice >= 50 ? 2.5 : 1;

  const baseStrike = Math.round(currentPrice / strikeSpacing) * strikeSpacing;

  const strikeOffsets =
    direction === "CALL"
      ? [-2, -1, 0, 1, 2, 3]
      : [-3, -2, -1, 0, 1, 2];

  const contracts: MockOptionContract[] = [];

  expirations.forEach((expirationDate, expirationIndex) => {
    strikeOffsets.forEach((offset, offsetIndex) => {
      const strikePrice = Number((baseStrike + offset * strikeSpacing).toFixed(2));

      const distanceFromMoney = Math.abs(strikePrice - currentPrice);
      const timeValueBoost = expirationIndex * 0.18;

      const basePremium = Math.max(
        0.35,
        1.15 - distanceFromMoney / Math.max(currentPrice * 0.08, 1) + timeValueBoost
      );

      const bidPrice = Number(Math.max(0.1, basePremium - 0.06 - offsetIndex * 0.005).toFixed(2));
      const askPrice = Number((bidPrice + 0.08 + expirationIndex * 0.01).toFixed(2));
      const midPrice = calculateMidPrice(bidPrice, askPrice);

      const spreadPercent = midPrice > 0 ? Number((((askPrice - bidPrice) / midPrice) * 100).toFixed(1)) : 0;

      const volume = Math.max(10, Math.round(900 - distanceFromMoney * 6 - expirationIndex * 70));
      const openInterest = Math.max(25, Math.round(2200 - distanceFromMoney * 9 - expirationIndex * 120));

      const liquidityScore = Math.max(
        1,
        Math.min(
          100,
          Math.round(
            100 -
              spreadPercent * 2 +
              Math.min(volume / 25, 20) +
              Math.min(openInterest / 100, 20) -
              expirationIndex * 4
          )
        )
      );

      const estimatedCost = Number((midPrice * 100).toFixed(2));

      contracts.push({
        option_symbol: buildOptionSymbol(stockSymbol, expirationDate, strikePrice, direction),
        stock_symbol: stockSymbol,
        trade_direction: direction,
        expiration_date: expirationDate,
        strike_price: strikePrice,
        bid_price: bidPrice,
        ask_price: askPrice,
        mid_price: midPrice,
        contracts: 1,
        estimated_cost: estimatedCost,
        max_risk: estimatedCost,
        volume,
        open_interest: openInterest,
        implied_volatility: Number((0.28 + expirationIndex * 0.03 + offsetIndex * 0.005).toFixed(2)),
        delta:
          direction === "CALL"
            ? Number((0.62 - Math.abs(offset) * 0.05).toFixed(2))
            : Number((-0.62 + Math.abs(offset) * 0.05).toFixed(2)),
        liquidity_score: liquidityScore,
        spread_percent: spreadPercent,
      });
    });
  });

  return contracts.sort((a, b) => b.liquidity_score - a.liquidity_score);
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const symbol = searchParams.get("symbol")?.toUpperCase();
    const directionParam = searchParams.get("direction")?.toUpperCase();
    const priceParam = searchParams.get("price");

    if (!symbol) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required query param: symbol",
        },
        { status: 400 }
      );
    }

    const direction: "CALL" | "PUT" =
      directionParam === "PUT" ? "PUT" : "CALL";

    const currentPrice = Number(priceParam || 100);

    if (!currentPrice || Number.isNaN(currentPrice) || currentPrice <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid or missing price query param.",
        },
        { status: 400 }
      );
    }

    const contracts = buildMockContracts(symbol, currentPrice, direction);

    return NextResponse.json({
      success: true,
      source: "mock",
      message:
        "Mock option chain returned. This route is ready to be swapped with real broker/data API later.",
      symbol,
      direction,
      current_price: currentPrice,
      contracts,
    });
  } catch (error: any) {
    console.error("Options chain route failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Options chain route failed.",
      },
      { status: 500 }
    );
  }
}