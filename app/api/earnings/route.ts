import { NextResponse } from "next/server";

// Thin read-only Finnhub earnings-calendar proxy. Mirrors /api/quote's shape and
// provider-key handling. Returns the next on/after-today earnings date for a
// symbol, or null when none is scheduled in the lookahead window.

type FinnhubEarning = { date?: string; symbol?: string; hour?: string };

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol")?.trim().toUpperCase();

    if (!symbol) {
      return NextResponse.json({ success: false, error: "Missing symbol." }, { status: 400 });
    }

    const token = process.env.FINNHUB_API_KEY;
    if (!token) {
      return NextResponse.json(
        { success: false, symbol, error: "Missing FINNHUB_API_KEY in .env.local." },
        { status: 500 }
      );
    }

    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const from = fmt(new Date());
    const to = fmt(new Date(Date.now() + 90 * 86_400_000)); // 90-day lookahead

    const finnhubUrl = `https://finnhub.io/api/v1/calendar/earnings?from=${from}&to=${to}&symbol=${encodeURIComponent(
      symbol
    )}&token=${token}`;

    const response = await fetch(finnhubUrl, { cache: "no-store" });
    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { success: false, symbol, error: "Finnhub earnings request failed.", details: data },
        { status: response.status }
      );
    }

    const calendar = Array.isArray(data?.earningsCalendar)
      ? (data.earningsCalendar as FinnhubEarning[])
      : [];
    const today = from;
    const nextEarningsDate =
      calendar
        .map((e) => String(e?.date ?? ""))
        .filter((d) => d && d >= today)
        .sort()[0] ?? null;

    return NextResponse.json({ success: true, symbol, nextEarningsDate });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown earnings route error.",
      },
      { status: 500 }
    );
  }
}
