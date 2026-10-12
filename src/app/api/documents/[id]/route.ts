/**
 * Document Access API
 *
 * GET /api/documents/[id]
 * Generates a short-lived signed URL for document access.
 *
 * DELETE /api/documents/[id]
 * Deletes a document from both R2 and database.
 *
 * SECURITY:
 * - Verifies ownership before issuing signed URL
 * - Signed URLs expire in 5 minutes
 * - Never logs storage keys or signed URLs
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/get-current-user";
import { getDocumentUrl, deleteDocument } from "@/lib/storage";
import { getPool } from "@/db/connection";
import { logDocumentAction } from "@/lib/document-audit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Verify authentication
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // 2. Await params (Next.js 15+ requirement)
    const { id } = await params;

    // 3. Fetch document metadata
    const db = getPool();
    const result = await db.query(
      `SELECT
        d.id,
        d.storage_key,
        d.original_filename,
        d.application_id,
        a.applicant_email as application_owner_email,
        a.version as application_version
       FROM documents d
       JOIN applications a ON d.application_id = a.id
       WHERE d.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    const document = result.rows[0];

    // 4. Access control
    // - Applicants can only access their own documents (matched by email)
    // - Reviewers need TOTP verification and can access any document
    if (session.user.role === "applicant") {
      if (document?.application_owner_email !== session.user.email) {
        return NextResponse.json(
          { error: "You can only access your own documents" },
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

    // 5. Generate signed URL (expires in 5 minutes)
    const signedUrl = await getDocumentUrl(document?.storage_key);

    // 6. Log view action to audit trail (signed URL issued)
    await logDocumentAction(
      parseInt(id),
      "viewed",
      {
        userId: session.user.id,
        userEmail: session.user.email,
        userRole: session.user.role,
      },
      document?.application_id,
      document?.application_version || 1,
      {} // No metadata for view action (don't log signed URL)
    );

    return NextResponse.json({
      url: signedUrl,
      filename: document?.original_filename,
      expiresIn: 300, // seconds
    });
  } catch (error) {
    console.error("Document access error:", error);
    return NextResponse.json(
      { error: "Failed to generate document access URL" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Verify authentication
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // 2. Await params (Next.js 15+ requirement)
    const { id } = await params;

    // 3. Fetch document metadata
    const db = getPool();
    const result = await db.query(
      `SELECT
        d.id,
        d.storage_key,
        d.application_id,
        a.applicant_email as application_owner_email,
        a.status as application_status,
        a.version as application_version
       FROM documents d
       JOIN applications a ON d.application_id = a.id
       WHERE d.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    const document = result.rows[0];

    // 4. Access control - only the applicant who owns the application can delete (matched by email)
    // (Reviewers should NOT be able to delete applicant documents)
    if (
      session.user.role !== "applicant" ||
      document?.application_owner_email !== session.user.email
    ) {
      return NextResponse.json(
        { error: "You can only delete documents from your own applications" },
        { status: 403 }
      );
    }

    // 5. Can't delete documents from submitted applications
    if (document?.application_status !== "draft") {
      return NextResponse.json(
        {
          error:
            "Cannot delete documents from submitted applications. Create a new version to make changes.",
        },
        { status: 400 }
      );
    }

    // 6. Log deletion to audit trail BEFORE deleting
    // (audit trail persists even after document is deleted)
    await logDocumentAction(
      parseInt(id),
      "deleted",
      {
        userId: session.user.id,
        userEmail: session.user.email,
        userRole: session.user.role,
      },
      document?.application_id,
      document?.application_version || 1,
      {} // No metadata for deletion (reason could be added if needed)
    );

    // 7. Delete from database first
    await db.query("DELETE FROM documents WHERE id = $1", [id]);

    // 8. Check if any other documents still reference this storage_key
    // CRITICAL: Only delete from R2 if NO other version references it
    // This preserves documents for prior versions (part of audit trail)
    const refCount = await db.query(
      `SELECT COUNT(*) as count FROM documents WHERE storage_key = $1`,
      [document?.storage_key]
    );
    const remainingReferences = parseInt(refCount.rows[0]?.count || "0");

    // 9. Only delete from R2 if this was the last reference
    if (remainingReferences === 0) {
      await deleteDocument(document?.storage_key);
    }

    return NextResponse.json({
      message: "Document deleted successfully",
    });
  } catch (error) {
    console.error("Document delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 }
    );
  }
}
