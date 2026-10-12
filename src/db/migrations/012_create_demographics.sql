-- Demographics table: PHYSICALLY ISOLATED for HERA reporting ONLY
-- Golden Rule 4: NO foreign keys, NO joins into rules engine or decision views
-- This table must NEVER be imported, referenced, or joined by:
--   - rules engine
--   - decision views
--   - waitlist ordering
-- Any such reference is a bug.

CREATE TABLE IF NOT EXISTS demographics (
  id SERIAL PRIMARY KEY,
  application_id INTEGER NOT NULL, -- NO FOREIGN KEY - intentionally isolated
  race VARCHAR(100),
  ethnicity VARCHAR(100),
  household_income_range VARCHAR(50),
  reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_demographics_application ON demographics(application_id);

COMMENT ON TABLE demographics IS 'ISOLATED: HERA reporting ONLY. Never join to rules, decisions, or waitlist.';
