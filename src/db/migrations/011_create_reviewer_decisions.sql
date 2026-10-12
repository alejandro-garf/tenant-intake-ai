-- Reviewer decisions: human always decides final eligibility
CREATE TABLE IF NOT EXISTS reviewer_decisions (
  id SERIAL PRIMARY KEY,
  application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  reviewer_email VARCHAR(255) NOT NULL,
  decision VARCHAR(50) NOT NULL, -- approved, denied, needs_more_info
  notes TEXT,
  decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviewer_decisions_application ON reviewer_decisions(application_id);
