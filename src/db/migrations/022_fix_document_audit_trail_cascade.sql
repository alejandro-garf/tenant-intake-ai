-- Fix document_audit_trail to preserve records after document deletion
-- The audit trail must persist even after documents are deleted

-- Drop and recreate without CASCADE on document_id
DROP TABLE IF EXISTS document_audit_trail CASCADE;

CREATE TABLE document_audit_trail (
  id SERIAL PRIMARY KEY,
  document_id INTEGER NOT NULL, -- No foreign key to preserve audit trail after deletion
  action VARCHAR(20) NOT NULL CHECK (action IN ('uploaded', 'viewed', 'deleted', 'carried_forward')),

  -- Who performed the action (from authenticated session)
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  user_email TEXT NOT NULL, -- Denormalized for audit permanence (email can change in users table)
  user_role VARCHAR(20) NOT NULL, -- applicant or reviewer

  -- Context
  application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  application_version INTEGER NOT NULL,

  -- When
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,

  -- Action-specific metadata (JSON for flexibility)
  -- For 'uploaded': {original_filename, file_size, content_type}
  -- For 'viewed': {} (no sensitive data)
  -- For 'deleted': {reason: string} (optional)
  -- For 'carried_forward': {source_application_id, source_version}
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for audit queries
CREATE INDEX idx_document_audit_trail_document_id ON document_audit_trail(document_id);
CREATE INDEX idx_document_audit_trail_user_id ON document_audit_trail(user_id);
CREATE INDEX idx_document_audit_trail_application_id ON document_audit_trail(application_id);
CREATE INDEX idx_document_audit_trail_created_at ON document_audit_trail(created_at DESC);
CREATE INDEX idx_document_audit_trail_doc_created ON document_audit_trail(document_id, created_at DESC);

COMMENT ON TABLE document_audit_trail IS 'Append-only audit trail for all document actions. Never UPDATE or DELETE rows. Persists after document deletion.';
COMMENT ON COLUMN document_audit_trail.document_id IS 'Document ID - no foreign key to preserve audit after document deletion';
COMMENT ON COLUMN document_audit_trail.action IS 'uploaded | viewed | deleted | carried_forward';
COMMENT ON COLUMN document_audit_trail.user_email IS 'Denormalized from users.email for audit permanence';
COMMENT ON COLUMN document_audit_trail.metadata IS 'Action-specific context. NEVER log storage keys, signed URLs, or document content.';
