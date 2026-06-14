-- Phone review approval tokens for remote SMS-based approve/reject flow.
-- Tokens are single-use, time-limited, and only ever store a SHA-256 hash
-- of the random token value (never the raw token).

CREATE TABLE IF NOT EXISTS phone_review_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_alert_event_id text NOT NULL,
  paper_order_preview_id text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS phone_review_tokens_paper_order_preview_id_idx
  ON phone_review_tokens (paper_order_preview_id);
