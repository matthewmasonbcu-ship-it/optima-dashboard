import YahooFinance from "yahoo-finance2";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const yahooFinance = new YahooFinance();

const symbols = ["SPY", "QQQ", "IWM", "SMR"];

export async function GET() {
  try {
    const quotes = await Promise.all(
      symbols.map((symbol) => yahooFinance.quote(symbol))
    );

    const data = quotes.map((quote) => ({
      symbol: quote.symbol,
      name: quote.shortName ?? quote.longName ?? quote.symbol,
      price: quote.regularMarketPrice ?? 0,
      changePercent: quote.regularMarketChangePercent ?? 0,
      volume: quote.regularMarketVolume ?? 0,
    }));

    return NextResponse.json({
      success: true,
      data,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown market data error";

    console.error("Market data error:", message);

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
