-- Screening results from the deterministic rules engine
CREATE TABLE IF NOT EXISTS screening_results (
  id SERIAL PRIMARY KEY,
  application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  rule_version_id INTEGER NOT NULL REFERENCES rule_versions(id),

  passed BOOLEAN NOT NULL,
  failure_reasons JSONB, -- array of all failure reasons, not just the first
  gross_income DECIMAL(12, 2) NOT NULL,
  imputed_asset_income DECIMAL(12, 2),
  household_size INTEGER NOT NULL,

  screened_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_screening_results_application ON screening_results(application_id);
