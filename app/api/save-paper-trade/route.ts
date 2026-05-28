import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { MarketScan } from "@/lib/mockScans";
import type { TradePlan } from "@/lib/createTradePlan";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

type SavePaperTradeBody = {
  scan: MarketScan;
  tradePlan: TradePlan;
};

export async function POST(request: Request) {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { success: false, error: "Supabase is not configured" },
        { status: 500 }
      );
    }

    const body = (await request.json()) as SavePaperTradeBody;
    const { scan, tradePlan } = body;

    if (!scan || !tradePlan) {
      return NextResponse.json(
        { success: false, error: "Missing scan or trade plan" },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data: existingTrade, error: existingError } = await supabase
      .from("paper_trades")
      .select("id, ticker, status")
      .eq("ticker", scan.ticker)
      .eq("status", "OPEN")
      .maybeSingle();

    if (existingError) {
      return NextResponse.json(
        { success: false, error: existingError.message },
        { status: 500 }
      );
    }

    if (existingTrade) {
      return NextResponse.json({
        success: true,
        duplicate: true,
        message: `${scan.ticker} is already in open paper trades`,
        paperTrade: existingTrade,
      });
    }

    const rowToInsert = {
      ticker: scan.ticker,
      company: scan.company,
      entry_price: scan.price,
      setup_grade: scan.setupGrade,
      decision: scan.decision,
      trade_plan_action: tradePlan.action,
      bias: tradePlan.bias,
      risk_level: tradePlan.riskLevel,
      notes: tradePlan.notes,
      status: "OPEN",
    };

    const { data, error } = await supabase
      .from("paper_trades")
      .insert(rowToInsert)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      duplicate: false,
      message: `Saved ${scan.ticker} to paper trades`,
      paperTrade: data,
    });
  } catch (error) {
    console.error("Save paper trade error:", error);

    return NextResponse.json(
      { success: false, error: "Something went wrong while saving paper trade" },
      { status: 500 }
    );
  }
}