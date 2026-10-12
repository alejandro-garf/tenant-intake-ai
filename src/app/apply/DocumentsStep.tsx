"use client";

/**
 * Documents Step
 *
 * Applicants upload income verification, ID, and asset statements.
 * Documents attach to the application and optionally to specific
 * household members or income sources.
 */

import { useState, useEffect } from "react";
import { List, Row } from "@/components/List";
import { DocumentUpload } from "@/components/DocumentUpload";
import type { ApplicationDraft } from "./types";

interface UploadedDocument {
  id: number;
  documentType?: string;
  filename: string;
  size: number;
  contentType: string;
  uploadedAt: string;
  householdMemberId?: number;
  incomeSourceId?: number;
}

interface DocumentsStepProps {
  draft: ApplicationDraft;
  onUpdate: (draft: ApplicationDraft) => void;
}

export function DocumentsStep({ draft, onUpdate }: DocumentsStepProps) {
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch existing documents
  useEffect(() => {
    if (!draft.id) {
      setLoading(false);
      return;
    }

    async function fetchDocuments() {
      try {
        const response = await fetch(
          `/api/documents?applicationId=${draft.id}`
        );
        if (response.ok) {
          const data = await response.json();
          setDocuments(data.documents);
        }
      } catch (error) {
        console.error("Failed to fetch documents:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchDocuments();
  }, [draft.id]);

  const handleUploadComplete = (doc: UploadedDocument) => {
    setDocuments((prev) => [doc, ...prev]);
  };

  const handleDeleteComplete = (documentId: number) => {
    setDocuments((prev) => prev.filter((d) => d.id !== documentId));
  };

  if (!draft.id) {
    return (
      <div className="p-6 text-center">
        <div className="text-secondaryLabel text-sm">
          Please save your application data first before uploading documents.
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="text-secondaryLabel text-sm">Loading documents...</div>
      </div>
    );
  }

  const incomeVerificationDocs = documents.filter(
    (d) => d.documentType === "income_verification"
  );
  const idDocs = documents.filter((d) => d.documentType === "id_document");
  const assetDocs = documents.filter(
    (d) => d.documentType === "asset_statement"
  );

  return (
    <div className="space-y-6 px-4 pt-6 pb-24">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-label mb-2">
          Upload Documents
        </h2>
        <p className="text-sm text-secondaryLabel">
          Upload supporting documents for your application. Accepted formats:
          PDF, JPG, PNG, HEIC (max 10 MB per file).
        </p>
      </div>

      {/* Income Verification */}
      <div>
        <div className="px-4 pb-2">
          <h3 className="text-xs font-semibold text-secondaryLabel uppercase tracking-wide">
            INCOME VERIFICATION
          </h3>
        </div>
        <List>
          <Row>
            <div className="py-2">
              <DocumentUpload
                applicationId={draft.id}
                documentType="income_verification"
                documents={incomeVerificationDocs}
                onUploadComplete={handleUploadComplete}
                onDeleteComplete={handleDeleteComplete}
                label="Add Income Document"
              />
            </div>
          </Row>
        </List>
        <div className="px-4 pt-2 pb-4">
          <p className="text-xs text-tertiaryLabel">
            Upload pay stubs, W-2s, 1099s, Social Security award letters,
            pension statements, or other proof of income for all household
            members.
          </p>
        </div>
      </div>

      {/* ID Documents */}
      <div>
        <div className="px-4 pb-2">
          <h3 className="text-xs font-semibold text-secondaryLabel uppercase tracking-wide">
            IDENTIFICATION
          </h3>
        </div>
        <List>
          <Row>
            <div className="py-2">
              <DocumentUpload
                applicationId={draft.id}
                documentType="id_document"
                documents={idDocs}
                onUploadComplete={handleUploadComplete}
                onDeleteComplete={handleDeleteComplete}
                label="Add ID Document"
              />
            </div>
          </Row>
        </List>
        <div className="px-4 pt-2 pb-4">
          <p className="text-xs text-tertiaryLabel">
            Upload government-issued photo ID (driver's license, passport, state
            ID) for each household member.
          </p>
        </div>
      </div>

      {/* Asset Statements */}
      {draft.assets.length > 0 && (
        <div>
          <div className="px-4 pb-2">
            <h3 className="text-xs font-semibold text-secondaryLabel uppercase tracking-wide">
              ASSET STATEMENTS
            </h3>
          </div>
          <List>
            <Row>
              <div className="py-2">
                <DocumentUpload
                  applicationId={draft.id}
                  documentType="asset_statement"
                  documents={assetDocs}
                  onUploadComplete={handleUploadComplete}
                  onDeleteComplete={handleDeleteComplete}
                  label="Add Asset Document"
                />
              </div>
            </Row>
          </List>
          <div className="px-4 pt-2 pb-4">
            <p className="text-xs text-tertiaryLabel">
              Upload recent bank statements, brokerage statements, or other
              documentation for reported assets.
            </p>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="px-4 py-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-sm">
        <div className="font-medium mb-1">Documents uploaded</div>
        <div>
          {incomeVerificationDocs.length} income verification •{" "}
          {idDocs.length} ID documents •{" "}
          {assetDocs.length} asset statements
        </div>
      </div>

      {documents.length === 0 && (
        <div className="px-4 py-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 text-sm">
          No documents uploaded yet. While documents are helpful for faster
          review, you can submit your application and upload documents later.
        </div>
      )}
    </div>
  );
}
