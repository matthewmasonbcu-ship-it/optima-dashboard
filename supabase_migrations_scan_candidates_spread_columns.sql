-- Add selected-spread economics to scan_candidates so post-hoc analysis can see
-- WHAT selection picked (long strike, credit, width, max loss/profit), not just
-- the short leg. Populated for PASSED candidates only — BLOCKED rows never build
-- a spread, so their columns stay null.
--
-- Additive, nullable, idempotent. No backfill. RLS already disabled on this table
-- (see supabase_migrations_scan_tables_disable_rls.sql) — no policy change needed.
-- Run in the Supabase SQL editor. The next scan begins writing these fields once
-- the Step 2 code ships.

ALTER TABLE scan_candidates ADD COLUMN IF NOT EXISTS long_strike  numeric;
ALTER TABLE scan_candidates ADD COLUMN IF NOT EXISTS net_credit   numeric;
ALTER TABLE scan_candidates ADD COLUMN IF NOT EXISTS spread_width numeric;
ALTER TABLE scan_candidates ADD COLUMN IF NOT EXISTS max_loss     numeric;
ALTER TABLE scan_candidates ADD COLUMN IF NOT EXISTS max_profit   numeric;
