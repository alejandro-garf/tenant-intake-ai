-- Document uploads
CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  document_type VARCHAR(100) NOT NULL, -- e.g., pay_stub, tax_return, bank_statement, id_document
  file_path TEXT NOT NULL, -- path to stored file (kept out of git)
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_application ON documents(application_id);
