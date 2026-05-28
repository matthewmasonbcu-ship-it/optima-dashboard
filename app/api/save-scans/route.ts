import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { MarketScan } from "@/lib/mockScans";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function POST(request: Request) {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { success: false, error: "Supabase is not configured" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const scans = body.scans as MarketScan[];

    if (!Array.isArray(scans) || scans.length === 0) {
      return NextResponse.json(
        { success: false, error: "No scans provided" },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const rowsToInsert = scans.map((scan) => ({
      ticker: scan.ticker,
      company: scan.company,
      price: scan.price,
      change_percent: scan.changePercent,
      trend: scan.trend,
      volume_score: scan.volumeScore,
      rsi: scan.rsi,
      setup_grade: scan.setupGrade,
      decision: scan.decision,
      reason: scan.reason,
    }));

    const { data, error } = await supabase
      .from("scans")
      .insert(rowsToInsert)
      .select();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      savedCount: data.length,
      scans: data,
    });
  } catch (error) {
    console.error("Save scans error:", error);

    return NextResponse.json(
      { success: false, error: "Something went wrong while saving scans" },
      { status: 500 }
    );
  }
}