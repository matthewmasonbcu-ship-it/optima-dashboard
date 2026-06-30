import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

type ClosePaperTradeBody = {
  id: string;
  result: "WIN" | "LOSS" | "BREAKEVEN";
  exitPrice?: number;
};

// DEPRECATED / orphaned (no callers): stock-only close that writes paper_trades
// only. Neutered below — refuses any trade with an open option leg so it can
// never orphan option_trade_details. Options must close via /api/close-option-trade.
export async function POST(request: Request) {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { success: false, error: "Supabase is not configured" },
        { status: 500 }
      );
    }

    const body = (await request.json()) as ClosePaperTradeBody;
    const { id, result, exitPrice } = body;

    if (!id || !result) {
      return NextResponse.json(
        { success: false, error: "Missing trade id or result" },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Refuse option trades — a stock-only close here would orphan the option leg.
    const { data: openLeg } = await supabase
      .from("option_trade_details")
      .select("id")
      .eq("paper_trade_id", id)
      .is("option_pnl", null)
      .limit(1)
      .maybeSingle();
    if (openLeg) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Trade has an open option leg. Close via /api/close-option-trade so both tables stay in sync.",
        },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from("paper_trades")
      .update({
        status: "CLOSED",
        result,
        exit_price: exitPrice ?? null,
        closed_at: new Date().toISOString(),
      })
      .eq("id", id)
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
      message: `Paper trade closed as ${result}`,
      paperTrade: data,
    });
  } catch (error) {
    console.error("Close paper trade error:", error);

    return NextResponse.json(
      { success: false, error: "Something went wrong while closing paper trade" },
      { status: 500 }
    );
  }
}