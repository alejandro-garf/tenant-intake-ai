/**
 * Document Upload API
 *
 * POST /api/documents/upload
 * Uploads a document to R2 and creates a database record.
 *
 * SECURITY:
 * - Validates file type (PDF, JPG, PNG, HEIC only)
 * - Enforces 10 MB size limit
 * - Verifies authenticated user owns the application
 * - Never logs storage keys or signed URLs
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/get-current-user";
import { putDocument } from "@/lib/storage";
import { getPool } from "@/db/connection";
import { logDocumentAction } from "@/lib/document-audit";

// Allowed content types
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/heic",
]);

// 10 MB limit
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    // 1. Verify authentication
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // 2. Parse multipart form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const applicationId = formData.get("applicationId") as string | null;
    const documentType = formData.get("documentType") as string | null;
    const householdMemberId = formData.get("householdMemberId") as
      | string
      | null;
    const incomeSourceId = formData.get("incomeSourceId") as string | null;

    if (!file || !applicationId || !documentType) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: file, applicationId, and documentType are required",
        },
        { status: 400 }
      );
    }

    // 3. Validate file type
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        {
          error: `Invalid file type: ${file.type}. Allowed types: PDF, JPG, PNG, HEIC`,
        },
        { status: 400 }
      );
    }

    // 4. Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File too large: ${(file.size / 1024 / 1024).toFixed(2)} MB. Maximum: 10 MB`,
        },
        { status: 400 }
      );
    }

    // 5. Verify user owns this application
    const db = getPool();
    const appCheck = await db.query(
      `SELECT id, applicant_email, status, version
       FROM applications
       WHERE id = $1`,
      [applicationId]
    );

    if (appCheck.rows.length === 0) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    const application = appCheck.rows[0];

    // Applicants can only upload to their own applications (matched by email)
    // Reviewers can upload documents to any application (for verification purposes)
    if (
      session.user.role === "applicant" &&
      application?.applicant_email !== session.user.email
    ) {
      return NextResponse.json(
        { error: "You can only upload documents to your own applications" },
        { status: 403 }
      );
    }

    // Can only upload to draft or submitted applications, not to superseded versions
    if (application?.status === "superseded") {
      return NextResponse.json(
        {
          error:
            "Cannot upload documents to superseded application versions. Upload to the latest version instead.",
        },
        { status: 400 }
      );
    }

    // 6. Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 7. Upload to R2 (generates opaque key, no PII)
    const metadata = await putDocument(buffer, file.name, file.type);

    // 8. Insert into database
    const result = await db.query(
      `INSERT INTO documents (
        application_id,
        document_type,
        storage_key,
        original_filename,
        file_size,
        content_type,
        household_member_id,
        income_source_id,
        uploaded_by,
        file_path
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, uploaded_at`,
      [
        applicationId,
        documentType,
        metadata.key,
        metadata.filename,
        metadata.size,
        metadata.contentType,
        householdMemberId || null,
        incomeSourceId || null,
        session.user.id,
        metadata.key, // Backfill file_path for compatibility
      ]
    );

    const document = result.rows[0];

    // Log upload action to audit trail
    if (document) {
      await logDocumentAction(
        document.id,
        "uploaded",
        {
          userId: session.user.id,
          userEmail: session.user.email,
          userRole: session.user.role,
        },
        parseInt(applicationId),
        application?.version || 1,
        {
          original_filename: metadata.filename,
          file_size: metadata.size,
          content_type: metadata.contentType,
        }
      );
    }

    return NextResponse.json(
      {
        id: document?.id,
        documentType: documentType,
        filename: metadata.filename,
        size: metadata.size,
        contentType: metadata.contentType,
        uploadedAt: document?.uploaded_at,
        message: "Document uploaded successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Document upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload document" },
      { status: 500 }
    );
  }
}
