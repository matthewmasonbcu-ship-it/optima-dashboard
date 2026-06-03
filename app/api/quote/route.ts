import { NextResponse } from "next/server";

type FinnhubQuote = {
  c: number;  // current price
  d: number;  // change
  dp: number; // percent change
  h: number;  // high
  l: number;  // low
  o: number;  // open
  pc: number; // previous close
};

function isValidQuote(quote: any): quote is FinnhubQuote {
  return (
    quote &&
    typeof quote.c === "number" &&
    quote.c > 0 &&
    typeof quote.d === "number" &&
    typeof quote.dp === "number" &&
    typeof quote.h === "number" &&
    typeof quote.l === "number" &&
    typeof quote.o === "number" &&
    typeof quote.pc === "number"
  );
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol")?.trim().toUpperCase();

    if (!symbol) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing symbol.",
        },
        { status: 400 }
      );
    }

    const token = process.env.FINNHUB_API_KEY;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          symbol,
          error: "Missing FINNHUB_API_KEY in .env.local.",
        },
        { status: 500 }
      );
    }

    const finnhubUrl = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(
      symbol
    )}&token=${token}`;

    const response = await fetch(finnhubUrl, {
      cache: "no-store",
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          symbol,
          error: "Finnhub request failed.",
          details: data,
        },
        { status: response.status }
      );
    }

    if (!isValidQuote(data)) {
      return NextResponse.json(
        {
          success: false,
          symbol,
          error: "Finnhub returned invalid quote data.",
          raw: data,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      symbol,
      quote: {
        c: data.c,
        d: data.d,
        dp: data.dp,
        h: data.h,
        l: data.l,
        o: data.o,
        pc: data.pc,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Unknown quote route error.",
      },
      { status: 500 }
    );
  }
}