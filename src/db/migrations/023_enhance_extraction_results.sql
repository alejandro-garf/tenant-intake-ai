-- Enhance extraction_results to support multiple extraction runs and full metadata
-- Each extraction run creates a new batch of results with the same run_id

-- Add columns for extraction metadata
ALTER TABLE extraction_results ADD COLUMN IF NOT EXISTS run_id UUID NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE extraction_results ADD COLUMN IF NOT EXISTS extractor_name VARCHAR(50) NOT NULL DEFAULT 'unknown';
ALTER TABLE extraction_results ADD COLUMN IF NOT EXISTS raw_text TEXT; -- Full OCR output, SENSITIVE (contains PII)

-- Create index on run_id for grouping extraction results from the same run
CREATE INDEX IF NOT EXISTS idx_extraction_results_run ON extraction_results(run_id);

-- Add comment explaining append-only behavior
COMMENT ON TABLE extraction_results IS 'Append-only extraction proposals. Re-running extraction creates NEW records with a new run_id. Results NEVER feed the rules engine directly (Golden Rule 2).';
COMMENT ON COLUMN extraction_results.raw_text IS 'SENSITIVE: Full OCR text output. Contains applicant PII. Never log, never display publicly.';
