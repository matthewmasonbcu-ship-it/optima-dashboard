import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET() {
  const { data, error } = await supabase
    .from("paper_trades")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data });
}

export async function POST(request: Request) {
  const body = await request.json();

  const { data, error } = await supabase
    .from("paper_trades")
    .insert({
      id: body.id,
      symbol: body.symbol,
      entry: body.entry,
      stop_loss: body.stopLoss,
      take_profit: body.takeProfit,
      shares: body.shares,
      risk_amount: body.riskAmount,
      potential_profit: body.potentialProfit,
      risk_reward: body.riskReward,
      confidence: body.confidence,
      final_score: body.finalScore,
      grade: body.grade,
      reason: body.reason,
      status: body.status,
      pnl: body.pnl,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data });
}

export async function PATCH(request: Request) {
  const body = await request.json();

  const { data, error } = await supabase
    .from("paper_trades")
    .update({
      status: body.status,
      pnl: body.pnl,
    })
    .eq("id", body.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data });
}