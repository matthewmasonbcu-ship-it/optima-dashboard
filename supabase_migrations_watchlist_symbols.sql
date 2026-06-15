-- Watchlist symbols, shared across dashboard and cron scanner so the
-- scanner watchlist is identical on every device.

CREATE TABLE IF NOT EXISTS watchlist_symbols (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text NOT NULL UNIQUE,
  protected boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO watchlist_symbols (symbol, protected) VALUES
  ('SPY', true),
  ('AAPL', false),
  ('MSFT', false),
  ('NVDA', false),
  ('TSLA', false),
  ('AMD', false),
  ('QQQ', false),
  ('META', false),
  ('GOOGL', false),
  ('JPM', false),
  ('AMZN', false),
  ('IWM', false)
ON CONFLICT (symbol) DO NOTHING;
