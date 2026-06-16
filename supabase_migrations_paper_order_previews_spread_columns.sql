-- Spread support for paper_order_previews
-- Additive, nullable columns only. Default 'single_leg' preserves existing rows.
-- Required for Pipeline 2: auto-selected credit spreads must persist both legs
-- through the dashboard and phone approval paths.

ALTER TABLE paper_order_previews
  ADD COLUMN IF NOT EXISTS spread_type text DEFAULT 'single_leg',
  ADD COLUMN IF NOT EXISTS short_leg_option_symbol text,
  ADD COLUMN IF NOT EXISTS short_leg_strike_price numeric,
  ADD COLUMN IF NOT EXISTS long_leg_option_symbol text,
  ADD COLUMN IF NOT EXISTS long_leg_strike_price numeric,
  ADD COLUMN IF NOT EXISTS net_credit numeric,
  ADD COLUMN IF NOT EXISTS spread_width numeric,
  ADD COLUMN IF NOT EXISTS max_loss numeric,
  ADD COLUMN IF NOT EXISTS max_profit numeric;
