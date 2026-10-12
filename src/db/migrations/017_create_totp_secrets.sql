-- TOTP secrets table: stores encrypted TOTP secrets for reviewer 2FA
-- Only reviewers have TOTP secrets (applicants use magic link only)
-- Secrets are encrypted at rest, never stored plaintext
CREATE TABLE IF NOT EXISTS totp_secrets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  encrypted_secret TEXT NOT NULL,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_totp_secrets_user_id ON totp_secrets(user_id);
