-- Credit spread support for option_trade_details
-- Additive, nullable columns only. Existing columns (option_symbol, strike_price,
-- bid_price, ask_price, mid_price, max_risk, contract_quality, etc.) are unchanged
-- and continue to be populated from the short leg / max_loss for backward
-- compatibility with PaperTradeTracker.tsx and PaperTradeAnalytics.tsx.

ALTER TABLE option_trade_details
  ADD COLUMN IF NOT EXISTS spread_type text DEFAULT 'single_leg',
  ADD COLUMN IF NOT EXISTS short_leg_option_symbol text,
  ADD COLUMN IF NOT EXISTS short_leg_strike_price numeric,
  ADD COLUMN IF NOT EXISTS short_leg_bid_price numeric,
  ADD COLUMN IF NOT EXISTS short_leg_ask_price numeric,
  ADD COLUMN IF NOT EXISTS short_leg_mid_price numeric,
  ADD COLUMN IF NOT EXISTS long_leg_option_symbol text,
  ADD COLUMN IF NOT EXISTS long_leg_strike_price numeric,
  ADD COLUMN IF NOT EXISTS long_leg_bid_price numeric,
  ADD COLUMN IF NOT EXISTS long_leg_ask_price numeric,
  ADD COLUMN IF NOT EXISTS long_leg_mid_price numeric,
  ADD COLUMN IF NOT EXISTS net_credit numeric,
  ADD COLUMN IF NOT EXISTS spread_width numeric,
  ADD COLUMN IF NOT EXISTS max_loss numeric,
  ADD COLUMN IF NOT EXISTS max_profit numeric;
