-- Add TOTP verification tracking to sessions
-- Reviewer sessions must have totp_verified = true to access /review routes
-- Applicant sessions always have totp_verified = true (they don't need TOTP)
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS totp_verified BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_sessions_totp_verified ON sessions(totp_verified);
