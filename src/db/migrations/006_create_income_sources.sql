-- Income sources for household members
CREATE TABLE IF NOT EXISTS income_sources (
  id SERIAL PRIMARY KEY,
  household_member_id INTEGER NOT NULL REFERENCES household_members(id) ON DELETE CASCADE,
  source_type VARCHAR(100) NOT NULL, -- e.g., employment, social_security, pension, etc.
  annual_amount DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_income_sources_member ON income_sources(household_member_id);
