-- Applications table: versioned, append-only
-- Editing a submitted application creates a NEW version; never overwrite
CREATE TABLE IF NOT EXISTS applications (
  id SERIAL PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES properties(id),
  version INTEGER NOT NULL DEFAULT 1,
  parent_application_id INTEGER REFERENCES applications(id), -- NULL for v1, set for edits

  applicant_email VARCHAR(255) NOT NULL,
  applicant_name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'draft', -- draft, submitted, under_review, approved, denied

  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(property_id, applicant_email, version)
);

CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_parent ON applications(parent_application_id);
