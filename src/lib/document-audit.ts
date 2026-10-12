/**
 * Document Audit Trail Utilities
 *
 * Append-only audit logging for all document actions.
 * Records WHO (from authenticated session), WHEN, WHICH application version.
 *
 * SECURITY:
 * - NEVER log storage keys, signed URLs, filenames containing PII, or document content
 * - User identity comes from authenticated session only, never client-supplied
 * - Audit records are NEVER updated or deleted (append-only)
 */

import { getPool } from "@/db/connection";

export type AuditAction = "uploaded" | "viewed" | "deleted" | "carried_forward";

export interface AuditContext {
  userId: number;
  userEmail: string;
  userRole: "applicant" | "reviewer";
}

export interface AuditMetadata {
  // For 'uploaded': file metadata (NOT storage key)
  original_filename?: string;
  file_size?: number;
  content_type?: string;

  // For 'deleted': optional reason
  reason?: string;

  // For 'carried_forward': source version info
  source_application_id?: number;
  source_version?: number;
  original_uploaded_at?: Date | string; // When applicant originally provided the document

  // Never include: storage_key, signed URLs, document content
}

/**
 * Log a document action to the audit trail.
 *
 * @param documentId - The document being acted upon
 * @param action - The action being performed
 * @param context - WHO performed the action (from authenticated session)
 * @param applicationId - The application this document belongs to
 * @param applicationVersion - The version of the application
 * @param metadata - Action-specific context (no sensitive data)
 */
export async function logDocumentAction(
  documentId: number,
  action: AuditAction,
  context: AuditContext,
  applicationId: number,
  applicationVersion: number,
  metadata: AuditMetadata = {}
): Promise<void> {
  const db = getPool();

  // SECURITY: Never log storage keys, signed URLs, or document content
  // Only log safe metadata
  const safeMetadata = {
    ...(metadata.original_filename && { original_filename: metadata.original_filename }),
    ...(metadata.file_size && { file_size: metadata.file_size }),
    ...(metadata.content_type && { content_type: metadata.content_type }),
    ...(metadata.reason && { reason: metadata.reason }),
    ...(metadata.source_application_id && { source_application_id: metadata.source_application_id }),
    ...(metadata.source_version && { source_version: metadata.source_version }),
    ...(metadata.original_uploaded_at && { original_uploaded_at: metadata.original_uploaded_at }),
  };

  await db.query(
    `INSERT INTO document_audit_trail
     (document_id, action, user_id, user_email, user_role, application_id, application_version, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      documentId,
      action,
      context.userId,
      context.userEmail,
      context.userRole,
      applicationId,
      applicationVersion,
      JSON.stringify(safeMetadata),
    ]
  );
}

/**
 * Fetch audit trail for a specific document.
 *
 * @param documentId - The document to fetch audit trail for
 * @returns Array of audit records, newest first
 */
export async function getDocumentAuditTrail(documentId: number) {
  const db = getPool();

  const result = await db.query(
    `SELECT
      id,
      document_id,
      action,
      user_email,
      user_role,
      application_id,
      application_version,
      created_at,
      metadata
     FROM document_audit_trail
     WHERE document_id = $1
     ORDER BY created_at DESC`,
    [documentId]
  );

  return result.rows.map((row: any) => ({
    id: row.id,
    documentId: row.document_id,
    action: row.action as AuditAction,
    userEmail: row.user_email,
    userRole: row.user_role,
    applicationId: row.application_id,
    applicationVersion: row.application_version,
    createdAt: row.created_at,
    metadata: row.metadata,
  }));
}

/**
 * Fetch all audit trail entries for an application.
 *
 * @param applicationId - The application to fetch audit trail for
 * @returns Array of audit records, newest first
 */
export async function getApplicationDocumentAuditTrail(applicationId: number) {
  const db = getPool();

  const result = await db.query(
    `SELECT
      dat.id,
      dat.document_id,
      dat.action,
      dat.user_email,
      dat.user_role,
      dat.application_id,
      dat.application_version,
      dat.created_at,
      dat.metadata,
      d.original_filename,
      d.document_type
     FROM document_audit_trail dat
     JOIN documents d ON dat.document_id = d.id
     WHERE dat.application_id = $1
     ORDER BY dat.created_at DESC`,
    [applicationId]
  );

  return result.rows.map((row: any) => ({
    id: row.id,
    documentId: row.document_id,
    action: row.action as AuditAction,
    userEmail: row.user_email,
    userRole: row.user_role,
    applicationId: row.application_id,
    applicationVersion: row.application_version,
    createdAt: row.created_at,
    metadata: row.metadata,
    documentFilename: row.original_filename,
    documentType: row.document_type,
  }));
}
