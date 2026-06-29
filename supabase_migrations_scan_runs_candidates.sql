-- Scan observability tables for the market-open cron.
--   scan_runs:       one row per cron fire (run-level summary).
--   scan_candidates: one row per contract-graded symbol in that run.
-- Written only by the server-side cron via the shared Supabase client.
-- Additive only — no existing tables are touched. scan_history is left in place
-- and remains unused; these purpose-built tables supersede it.

CREATE TABLE IF NOT EXISTS scan_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at timestamptz NOT NULL DEFAULT now(),
  watchlist_size integer NOT NULL DEFAULT 0,
  symbols_scanned integer NOT NULL DEFAULT 0,
  symbols_graded integer NOT NULL DEFAULT 0,
  candidates_passed integer NOT NULL DEFAULT 0,
  candidates_blocked integer NOT NULL DEFAULT 0,
  blocked_reasons jsonb NOT NULL DEFAULT '{}'::jsonb,
  completed_fully boolean NOT NULL DEFAULT false,
  market_condition text,
  vix_regime text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scan_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES scan_runs(id) ON DELETE CASCADE,
  symbol text NOT NULL,
  setup_score integer,
  direction text,
  expiration date,
  short_strike numeric,
  short_delta numeric,
  open_interest integer,
  bid numeric,
  ask numeric,
  grade text,
  status text NOT NULL DEFAULT 'BLOCKED',  -- PASSED | BLOCKED (grading outcome)
  queued boolean NOT NULL DEFAULT false,   -- became the day's queued trade
  block_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS scan_runs_run_at_idx ON scan_runs (run_at DESC);
CREATE INDEX IF NOT EXISTS scan_candidates_run_id_idx ON scan_candidates (run_id);
CREATE INDEX IF NOT EXISTS scan_candidates_symbol_idx ON scan_candidates (symbol);
