-- Rule versions table: versioned configuration for screening thresholds
CREATE TABLE IF NOT EXISTS rule_versions (
  id SERIAL PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES properties(id),
  version INTEGER NOT NULL,

  -- Thresholds (never hardcoded in logic)
  income_cap_annual DECIMAL(12, 2) NOT NULL,
  max_occupancy INTEGER NOT NULL,
  passbook_rate DECIMAL(5, 4) NOT NULL, -- e.g., 0.0200 for 2%
  asset_threshold DECIMAL(12, 2) NOT NULL,

  active BOOLEAN NOT NULL DEFAULT FALSE,
  effective_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(property_id, version)
);

CREATE INDEX IF NOT EXISTS idx_rule_versions_active ON rule_versions(property_id, active) WHERE active = TRUE;
