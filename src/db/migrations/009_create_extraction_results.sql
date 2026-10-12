-- Extraction results: proposed values from OCR/extraction, not final truth
CREATE TABLE IF NOT EXISTS extraction_results (
  id SERIAL PRIMARY KEY,
  document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  field_name VARCHAR(100) NOT NULL,
  proposed_value TEXT NOT NULL,
  confidence DECIMAL(5, 4), -- 0.0 to 1.0
  extracted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_extraction_results_document ON extraction_results(document_id);
