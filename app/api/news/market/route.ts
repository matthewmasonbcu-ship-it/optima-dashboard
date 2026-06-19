import { NextResponse } from "next/server";

type FinnhubNewsItem = {
  category: string;
  datetime: number;
  headline: string;
  id: number;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
};

export type MarketNewsItem = {
  headline: string;
  summary: string;
  source: string;
  datetime: number;
  url: string;
};

export async function GET() {
  const token = process.env.FINNHUB_API_KEY;

  if (!token) {
    return NextResponse.json(
      { success: false, error: "Missing FINNHUB_API_KEY" },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/news?category=general&token=${token}`,
      { next: { revalidate: 600 } }
    );

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: `Finnhub returned ${res.status}` },
        { status: res.status }
      );
    }

    const raw: FinnhubNewsItem[] = await res.json();

    const items: MarketNewsItem[] = (Array.isArray(raw) ? raw : [])
      .slice(0, 20)
      .map((item) => ({
        headline: item.headline,
        summary: item.summary ?? "",
        source: item.source,
        datetime: item.datetime,
        url: item.url,
      }));

    return NextResponse.json({ success: true, items });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
