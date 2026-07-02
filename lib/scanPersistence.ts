import { supabase } from "@/lib/supabaseClient";

// Persistence for scan observability. Writes ONE scan_runs summary row plus one
// scan_candidates row per contract-graded symbol. NON-FATAL by design: any DB
// error is logged and RETURNED via persistError (so the caller can alert) — it
// never aborts or fails the scan. Silent persistence failure is the pattern that
// hid the 3-week RLS bug, so the failure must reach the caller, not be swallowed.

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
): Promise<{ runId: string | null; persistError: string | null }> {
  try {
    const { data, error } = await supabase
      .from("scan_runs")
      .insert(run)
      .select("id")
      .single();

    if (error || !data) {
      const msg = error?.message ?? "no row returned";
      console.warn("persistScanRun: scan_runs insert failed (non-fatal):", msg);
      // Total loss: no run row was created, so no candidates either.
      return { runId: null, persistError: `scan_runs insert failed: ${msg}` };
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
        // Run row saved, but the per-candidate rows are missing.
        return {
          runId,
          persistError: `scan_candidates insert failed (${rows.length} rows): ${candErr.message}`,
        };
      }
    }

    return { runId, persistError: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("persistScanRun: unexpected error (non-fatal):", msg);
    return { runId: null, persistError: `unexpected: ${msg}` };
  }
}
