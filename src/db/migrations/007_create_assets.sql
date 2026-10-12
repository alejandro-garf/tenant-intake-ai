-- Assets for TIC Part IV asset imputation calculation
CREATE TABLE IF NOT EXISTS assets (
  id SERIAL PRIMARY KEY,
  household_member_id INTEGER NOT NULL REFERENCES household_members(id) ON DELETE CASCADE,
  asset_type VARCHAR(100) NOT NULL, -- e.g., checking, savings, stocks, bonds, etc.
  cash_value DECIMAL(12, 2) NOT NULL,
  annual_income DECIMAL(12, 2) NOT NULL DEFAULT 0, -- actual income from asset
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assets_member ON assets(household_member_id);
