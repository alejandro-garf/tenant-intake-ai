/**
 * Document List API
 *
 * GET /api/documents?applicationId=X
 * Lists all documents for an application.
 *
 * SECURITY:
 * - Applicants can only see their own documents
 * - Reviewers can see documents on applications they're reviewing
 * - Returns metadata only, NOT signed URLs (use /api/documents/[id] for access)
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/get-current-user";
import { getPool } from "@/db/connection";

export async function GET(request: NextRequest) {
  try {
    // 1. Verify authentication
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // 2. Get applicationId from query params
    const { searchParams } = new URL(request.url);
    const applicationId = searchParams.get("applicationId");

    if (!applicationId) {
      return NextResponse.json(
        { error: "applicationId query parameter is required" },
        { status: 400 }
      );
    }

    // 3. Verify access to this application
    const db = getPool();
    const appCheck = await db.query(
      `SELECT id, applicant_email, status
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

    // Access control:
    // - Applicants can only see their own documents (matched by email)
    // - Reviewers need TOTP verification and can see any application
    if (session.user.role === "applicant") {
      if (application?.applicant_email !== session.user.email) {
        return NextResponse.json(
          { error: "You can only view documents on your own applications" },
          { status: 403 }
        );
      }
    } else if (session.user.role === "reviewer") {
      if (!session.totpVerified) {
        return NextResponse.json(
          { error: "TOTP verification required for reviewers" },
          { status: 403 }
        );
      }
    }

    // 4. Fetch documents
    const result = await db.query(
      `SELECT
        d.id,
        d.document_type,
        d.original_filename,
        d.file_size,
        d.content_type,
        d.uploaded_at,
        d.household_member_id,
        d.income_source_id,
        u.email as uploaded_by_email
       FROM documents d
       LEFT JOIN users u ON d.uploaded_by = u.id
       WHERE d.application_id = $1
       ORDER BY d.uploaded_at DESC`,
      [applicationId]
    );

    const documents = result.rows.map((row: any) => ({
      id: row.id,
      documentType: row.document_type,
      filename: row.original_filename,
      size: row.file_size,
      contentType: row.content_type,
      uploadedAt: row.uploaded_at,
      householdMemberId: row.household_member_id,
      incomeSourceId: row.income_source_id,
      uploadedBy: row.uploaded_by_email,
    }));

    return NextResponse.json({ documents });
  } catch (error) {
    console.error("Document list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}
