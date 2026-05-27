import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET() {
  const { data, error } = await supabase
    .from("scan_history")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}

export async function POST(request: Request) {
  const body = await request.json();

  const { data, error } = await supabase
    .from("scan_history")
    .insert({
      label: body.label,
      best_symbol: body.bestSymbol,
      best_grade: body.bestGrade,
      best_score: body.bestScore,
      tradable_setups: body.tradableSetups,
      buy_signals: body.buySignals,
      total_assets: body.totalAssets,
      reason: body.reason,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}