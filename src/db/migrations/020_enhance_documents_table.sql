-- Enhance documents table for R2 storage and better metadata
-- Adds storage_key (opaque R2 key), original_filename, file_size, content_type
-- Adds optional references to household_member and income_source
-- Adds uploaded_by user reference

ALTER TABLE documents
  -- Storage metadata
  ADD COLUMN storage_key TEXT, -- Opaque R2 key (UUID-based, no PII)
  ADD COLUMN original_filename TEXT, -- Original filename from upload
  ADD COLUMN file_size INTEGER, -- File size in bytes
  ADD COLUMN content_type VARCHAR(100), -- MIME type (e.g., application/pdf, image/jpeg)

  -- Optional associations (documents can attach to specific members or income sources)
  ADD COLUMN household_member_id INTEGER REFERENCES household_members(id) ON DELETE CASCADE,
  ADD COLUMN income_source_id INTEGER REFERENCES income_sources(id) ON DELETE CASCADE,

  -- Audit: who uploaded it
  ADD COLUMN uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Backfill: file_path becomes storage_key for existing rows (if any)
UPDATE documents SET storage_key = file_path WHERE storage_key IS NULL;

-- Now make storage_key required
ALTER TABLE documents ALTER COLUMN storage_key SET NOT NULL;

-- Deprecate file_path (keep for backward compatibility temporarily)
-- Future migration can drop file_path once we confirm no dependencies

CREATE INDEX IF NOT EXISTS idx_documents_household_member ON documents(household_member_id);
CREATE INDEX IF NOT EXISTS idx_documents_income_source ON documents(income_source_id);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);

COMMENT ON COLUMN documents.storage_key IS 'Opaque R2 object key (UUID-based). MUST NOT contain PII.';
COMMENT ON COLUMN documents.original_filename IS 'Original filename from upload. Used for download Content-Disposition header only.';
COMMENT ON COLUMN documents.household_member_id IS 'Optional: document specific to a household member (e.g., their ID document).';
COMMENT ON COLUMN documents.income_source_id IS 'Optional: document specific to an income source (e.g., pay stub for a specific job).';
