-- Add trade-plan fields (entry/stop/take-profit) to paper_order_previews
-- so phone-approved previews carry enough data to auto-save a paper trade.

ALTER TABLE paper_order_previews
  ADD COLUMN IF NOT EXISTS entry_price numeric,
  ADD COLUMN IF NOT EXISTS stop_loss numeric,
  ADD COLUMN IF NOT EXISTS take_profit numeric;
