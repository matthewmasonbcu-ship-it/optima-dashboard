import { supabase } from "@/lib/supabaseClient";

// Persistence for scan observability. Writes ONE scan_runs summary row plus one
// scan_candidates row per contract-graded symbol. NON-FATAL by design: any DB
// error is logged and RETURNED via persistError (so the caller can alert) — it
// never aborts or fails the scan. Silent persistence failure is the pattern that
// hid the 3-week RLS bug, so the failure must reach the caller, not be swallowed.

export type ScanCandidateRecord = {
  // Pre-generated in the caller so the exact row can be referenced (FK) by the
  // preview it produces — see market-open-scan provenance link. Passed explicitly
  // instead of relying on the DB default so the id is known BEFORE the insert.
  id: string;
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
  // Selected-spread economics — populated for PASSED candidates only (BLOCKED
  // rows never build a spread, so these stay null). Additive; see
  // supabase_migrations_scan_candidates_spread_columns.sql.
  long_strike: number | null;
  net_credit: number | null;
  spread_width: number | null;
  max_loss: number | null;
  max_profit: number | null;
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
  // Raw scan inputs captured for deterministic replay (additive/nullable; see
  // supabase_migrations_scan_input_snapshots.sql). Run-level globals only —
  // per-symbol chains live in scan_input_snapshots.
  spy_quote?: unknown;
  vix_level?: number | null;
  quotes?: unknown;
};

// One captured input snapshot per graded symbol that reached the chain fetch. Holds
// enough to REPLAY that symbol's selection deterministically: its raw underlying quote,
// the full expiration list, and a bounded ~15-strike window of the option side the
// direction used. Write-only observability — never read back into selection.
export type ScanInputSnapshotRecord = {
  scan_candidate_id: string | null; // soft link to the producing scan_candidates row
  symbol: string;
  direction: string | null;
  option_side: string | null; // PUT | CALL
  evaluated_expiration: string | null;
  expiration_dates: string[];
  underlying_quote: unknown;
  chain_window: unknown;
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

// Writes the per-symbol input snapshots for a run. Same NON-FATAL contract as
// persistScanRun: any DB error is logged and RETURNED, never thrown — the scan has
// already completed by the time this runs. Keyed to run_id (a real FK to scan_runs).
export async function persistScanInputSnapshots(
  runId: string,
  snapshots: ScanInputSnapshotRecord[]
): Promise<{ snapshotError: string | null }> {
  if (snapshots.length === 0) return { snapshotError: null };
  try {
    const rows = snapshots.map((s) => ({ ...s, run_id: runId }));
    const { error } = await supabase.from("scan_input_snapshots").insert(rows);
    if (error) {
      console.warn(
        "persistScanInputSnapshots: insert failed (non-fatal):",
        error.message
      );
      return {
        snapshotError: `scan_input_snapshots insert failed (${rows.length} rows): ${error.message}`,
      };
    }
    return { snapshotError: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("persistScanInputSnapshots: unexpected error (non-fatal):", msg);
    return { snapshotError: `unexpected: ${msg}` };
  }
}
