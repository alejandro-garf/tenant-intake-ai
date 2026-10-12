-- Household members
CREATE TABLE IF NOT EXISTS household_members (
  id SERIAL PRIMARY KEY,
  application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  date_of_birth DATE NOT NULL,
  relationship VARCHAR(100) NOT NULL, -- e.g., applicant, spouse, child, other
  is_full_time_student BOOLEAN NOT NULL DEFAULT FALSE,
  student_exemption_type VARCHAR(100), -- one of the five TIC Part VII exemptions, or NULL
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_household_members_application ON household_members(application_id);
