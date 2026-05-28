import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function GET() {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { success: false, error: "Supabase is not configured" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data, error } = await supabase
      .from("paper_trades")
      .select(
        "id, ticker, company, entry_price, setup_grade, decision, trade_plan_action, bias, risk_level, notes, status, result, exit_price, closed_at, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      paperTrades: data,
    });
  } catch (error) {
    console.error("Get paper trades error:", error);

    return NextResponse.json(
      { success: false, error: "Something went wrong while loading paper trades" },
      { status: 500 }
    );
  }
}