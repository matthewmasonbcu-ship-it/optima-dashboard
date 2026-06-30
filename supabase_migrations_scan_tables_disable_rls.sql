-- Fix: scan_runs / scan_candidates were created (in
-- supabase_migrations_scan_runs_candidates.sql) with Row-Level Security ENABLED
-- and no policies. The cron writes via the public anon key, so every insert was
-- rejected with Postgres error 42501 ("new row violates row-level security
-- policy") and swallowed by persistScanRun's non-fatal catch — leaving both
-- tables empty while the scan kept running and sending its Telegram summary.
--
-- This restores the same RLS-off posture as every other table in the project
-- (watchlist_symbols, paper_order_previews, scanner_auto_alerts, paper_trades …),
-- all of which the anon client already writes successfully. Single-user app on a
-- public anon key — see HARDENING.md (RLS posture) for the multi-user caveat.
--
-- Run in the Supabase SQL editor. Idempotent. No code change required; the next
-- scan begins writing rows. Past runs are not recoverable.

ALTER TABLE scan_runs       DISABLE ROW LEVEL SECURITY;
ALTER TABLE scan_candidates DISABLE ROW LEVEL SECURITY;
