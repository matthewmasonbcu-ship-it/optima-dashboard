import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

type ClosePaperTradeBody = {
  id: string;
  result: "WIN" | "LOSS" | "BREAKEVEN";
  exitPrice?: number;
};

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