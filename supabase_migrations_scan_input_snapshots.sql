-- Scan INPUT snapshots: capture the exact inputs each scan fed its selection logic
-- so a future run can REPLAY a past scan DETERMINISTICALLY (the free structural parity
-- test). Additive + write-only: the scan_runs additions are new nullable columns and
-- the new table is written only after grading completes. Nothing here is read back into
-- scan/scoring/selection/enforcement. RLS disabled to match the other scan-observability
-- tables (scan_runs / scan_candidates). Run in the Supabase SQL editor.

-- --- Run-level global inputs (captured once per scan) ------------------------
--   spy_quote : raw SPY QuoteData that set the market condition for EVERY symbol.
--   vix_level : raw VIX index level (regime input; logging-parity only, off the
--               selection path).
--   quotes    : { symbol -> QuoteData } for every scanned symbol — enough to replay
--               scoring, ranking, and direction for the whole watchlist. Tiny
--               (~60 symbols x 7 numbers).
ALTER TABLE scan_runs ADD COLUMN IF NOT EXISTS spy_quote jsonb;
ALTER TABLE scan_runs ADD COLUMN IF NOT EXISTS vix_level numeric;
ALTER TABLE scan_runs ADD COLUMN IF NOT EXISTS quotes    jsonb;

-- --- Per-graded-symbol chain inputs ------------------------------------------
-- One row per symbol that reached the expirations/chain fetch. chain_window holds a
-- BOUNDED ~15-strike window (the selected short leg +/- CHAIN_SNAPSHOT_HALF_WIDTH
-- strikes) on the ONE option side the direction uses. That window provably spans every
-- short- AND long-leg candidate the selection could pick (in-band 0.20-0.25 short
-- strikes cluster within ~3 strikes of target; the long leg sits a few strikes further
-- OTM within the max-loss cap), so it replays selectBestCreditSpread exactly WITHOUT
-- storing full chains. Stored contracts already carry Tradier's delta, so the structural
-- replay uses the same delta the live run did.
--
-- scan_candidate_id is a SOFT link (no FK): a snapshot is meaningful even if its
-- candidate row is absent, and this keeps the snapshot write decoupled from the
-- candidate insert. run_id IS a real FK (the run row is always written first).
CREATE TABLE IF NOT EXISTS scan_input_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES scan_runs(id) ON DELETE CASCADE,
  scan_candidate_id uuid,                -- soft link to scan_candidates.id (no FK)
  symbol text NOT NULL,
  direction text,
  option_side text,                      -- PUT | CALL (the side selection walked)
  evaluated_expiration date,             -- expiration that produced the pick / last tried
  expiration_dates text[],               -- full raw expiration list (replays the DTE pick)
  underlying_quote jsonb,                -- this symbol's raw QuoteData (c/dp/h/l/...)
  chain_window jsonb,                    -- ~15 normalized contracts (strike/bid/ask/OI/delta)
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS scan_input_snapshots_run_id_idx ON scan_input_snapshots (run_id);
CREATE INDEX IF NOT EXISTS scan_input_snapshots_symbol_idx ON scan_input_snapshots (symbol);

ALTER TABLE scan_input_snapshots DISABLE ROW LEVEL SECURITY;
