import { supabase } from "@/lib/supabaseClient";

export type SaveScanHistoryInput = {
  ticker: string;
  grade?: string;
  score?: number;
  decision?: string;
  strategy?: string;
  entry?: number;
  stop_loss?: number;
  take_profit?: number;
  confidence?: number;
};

export async function saveScanHistory(scan: SaveScanHistoryInput) {
  const { error } = await supabase.from("scan_history").insert({
    ticker: scan.ticker,
    grade: scan.grade ?? null,
    score: scan.score ?? null,
    decision: scan.decision ?? null,
    strategy: scan.strategy ?? null,
    entry: scan.entry ?? null,
    stop_loss: scan.stop_loss ?? null,
    take_profit: scan.take_profit ?? null,
    confidence: scan.confidence ?? null,
  });

  if (error) {
    console.error("Failed to save scan history:", error);

    return {
      success: false,
      error: error.message,
    };
  }

  return {
    success: true,
    error: null,
  };
}