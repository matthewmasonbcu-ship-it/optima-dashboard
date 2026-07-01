-- Fix: phone_review_tokens was created with Row-Level Security ENABLED and no
-- policies, so every token insert from the anon-key phone-review flow was
-- rejected (Postgres 42501) and swallowed by savePhoneReviewToken's error log.
-- Result: tokens never persisted (table empty), so the Telegram approval LINK
-- was silently dead — tapping it could never validate the token in /respond.
-- Same failure class as scan_runs (see supabase_migrations_scan_tables_disable_rls.sql).
--
-- Restores the RLS-off posture of every other table in the project (all written
-- via the public anon client). Single-user app on a public anon key — see
-- HARDENING.md (RLS posture) for the multi-user caveat.
--
-- Run in the Supabase SQL editor. Idempotent. The companion code change stops
-- swallowing this insert error so a future regression can't hide again.

ALTER TABLE phone_review_tokens DISABLE ROW LEVEL SECURITY;
