import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function DELETE() {
  if (!supabase) {
    return NextResponse.json(
      { success: false, error: "Supabase is not configured" },
      { status: 500 }
    );
  }

  const { error } = await supabase
    .from("scans")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "All scans cleared",
  });
}