-- Spread support for phone_alert_events
-- Additive, nullable columns only. Default 'single_leg' preserves existing rows.
-- Required for Pipeline 2: spread data logged to phone_alert_events so the
-- full audit trail captures both legs of any auto-selected credit spread.

ALTER TABLE phone_alert_events
  ADD COLUMN IF NOT EXISTS spread_type text DEFAULT 'single_leg',
  ADD COLUMN IF NOT EXISTS short_leg_option_symbol text,
  ADD COLUMN IF NOT EXISTS short_leg_strike_price numeric,
  ADD COLUMN IF NOT EXISTS long_leg_option_symbol text,
  ADD COLUMN IF NOT EXISTS long_leg_strike_price numeric,
  ADD COLUMN IF NOT EXISTS net_credit numeric,
  ADD COLUMN IF NOT EXISTS spread_width numeric,
  ADD COLUMN IF NOT EXISTS max_loss numeric,
  ADD COLUMN IF NOT EXISTS max_profit numeric;
