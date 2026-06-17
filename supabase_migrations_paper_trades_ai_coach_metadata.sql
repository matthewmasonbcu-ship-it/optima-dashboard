-- AI Coach foundation: capture market context at trade entry
-- All nullable — existing rows get null, fully backward-compatible.
-- Phone-approved trades will also get null (no real-time market data
-- in the server route at approval time — future enhancement to address).

ALTER TABLE paper_trades
  ADD COLUMN IF NOT EXISTS vix_level numeric,
  ADD COLUMN IF NOT EXISTS vix_regime text,
  ADD COLUMN IF NOT EXISTS market_condition text,
  ADD COLUMN IF NOT EXISTS setup_score integer,
  ADD COLUMN IF NOT EXISTS time_of_day_bucket text,
  ADD COLUMN IF NOT EXISTS day_of_week text;
