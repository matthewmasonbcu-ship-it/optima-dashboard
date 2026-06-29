import { supabase } from "@/lib/supabaseClient";

// Persistence for scan observability. Writes ONE scan_runs summary row plus one
// scan_candidates row per contract-graded symbol. NON-FATAL by design: any DB
// error is logged and swallowed so persistence can never abort or fail a scan.

export type ScanCandidateRecord = {
  symbol: string;
  setup_score: number | null;
  direction: string | null;
  expiration: string | null;
  short_strike: number | null;
  short_delta: number | null;
  open_interest: number | null;
  bid: number | null;
  ask: number | null;
  grade: string | null;
  status: "PASSED" | "BLOCKED";
  queued: boolean;
  block_reason: string | null;
};

export type ScanRunRecord = {
  run_at: string;
  watchlist_size: number;
  symbols_scanned: number;
  symbols_graded: number;
  candidates_passed: number;
  candidates_blocked: number;
  blocked_reasons: Record<string, number>;
  completed_fully: boolean;
  market_condition: string | null;
  vix_regime: string | null;
};

export async function persistScanRun(
  run: ScanRunRecord,
  candidates: ScanCandidateRecord[]
): Promise<{ runId: string | null }> {
  try {
    const { data, error } = await supabase
      .from("scan_runs")
      .insert(run)
      .select("id")
      .single();

    if (error || !data) {
      console.warn("persistScanRun: scan_runs insert failed (non-fatal):", error?.message);
      return { runId: null };
    }

    const runId = data.id as string;

    if (candidates.length > 0) {
      const rows = candidates.map((c) => ({ ...c, run_id: runId }));
      const { error: candErr } = await supabase.from("scan_candidates").insert(rows);
      if (candErr) {
        console.warn(
          "persistScanRun: scan_candidates insert failed (non-fatal):",
          candErr.message
        );
      }
    }

    return { runId };
  } catch (err) {
    console.warn(
      "persistScanRun: unexpected error (non-fatal):",
      err instanceof Error ? err.message : err
    );
    return { runId: null };
  }
}
