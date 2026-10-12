import { NextRequest, NextResponse } from "next/server";
import { query, getPool } from "@/db/connection";
import { getCurrentSession } from "@/lib/get-current-user";
import { logDocumentAction } from "@/lib/document-audit";

export async function POST(request: NextRequest) {
  // SECURITY: This route does NOT rely on middleware. Enforce auth here.
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { applicationId } = await request.json();

    if (!applicationId) {
      return NextResponse.json(
        { error: "Application ID required" },
        { status: 400 }
      );
    }

    // Get the original application
    const [originalApp] = await query<{
      id: number;
      property_id: string;
      applicant_email: string;
      applicant_name: string;
      version: number;
      status: string;
    }>(
      `SELECT id, property_id, applicant_email, applicant_name, version, status
       FROM applications
       WHERE id = $1`,
      [applicationId]
    );

    if (!originalApp) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    if (originalApp.status === "draft") {
      // If still a draft, just return the same ID
      return NextResponse.json({
        newApplicationId: originalApp.id,
        version: originalApp.version,
        message: "Draft can be edited in place",
      });
    }

    // Create a new version (never overwrite a submitted application)
    const newVersion = originalApp.version + 1;

    const [newApp] = await query<{ id: number }>(
      `INSERT INTO applications
       (property_id, applicant_email, applicant_name, version, parent_application_id, status)
       VALUES ($1, $2, $3, $4, $5, 'draft')
       RETURNING id`,
      [
        originalApp.property_id,
        originalApp.applicant_email,
        originalApp.applicant_name,
        newVersion,
        originalApp.id,
      ]
    );

    if (!newApp) {
      throw new Error("Failed to create new version");
    }

    // Copy household members
    const members = await query<{
      name: string;
      date_of_birth: string;
      relationship: string;
      is_full_time_student: boolean;
      student_exemption_type: string | null;
    }>(
      `SELECT name, date_of_birth, relationship, is_full_time_student, student_exemption_type
       FROM household_members
       WHERE application_id = $1`,
      [originalApp.id]
    );

    const memberIdMap = new Map<number, number>();

    for (const member of members) {
      const [newMember] = await query<{ id: number; old_id?: number }>(
        `INSERT INTO household_members
         (application_id, name, date_of_birth, relationship, is_full_time_student, student_exemption_type)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [
          newApp.id,
          member.name,
          member.date_of_birth,
          member.relationship,
          member.is_full_time_student,
          member.student_exemption_type,
        ]
      );

      if (newMember) {
        // We need to track the mapping from old to new member IDs
        // For simplicity, we'll use a sequential approach
        const [oldMember] = await query<{ id: number }>(
          `SELECT id FROM household_members
           WHERE application_id = $1 AND name = $2 AND date_of_birth = $3
           ORDER BY id
           LIMIT 1`,
          [originalApp.id, member.name, member.date_of_birth]
        );
        if (oldMember) {
          memberIdMap.set(oldMember.id, newMember.id);
        }
      }
    }

    // Copy income sources
    const incomeSources = await query<{
      household_member_id: number;
      source_type: string;
      employer_payer_name: string | null;
      amount: string;
      frequency: string;
      annual_amount: string;
    }>(
      `SELECT is_table.household_member_id, is_table.source_type, is_table.employer_payer_name,
              is_table.amount, is_table.frequency, is_table.annual_amount
       FROM income_sources is_table
       WHERE is_table.household_member_id IN (
         SELECT id FROM household_members WHERE application_id = $1
       )`,
      [originalApp.id]
    );

    for (const source of incomeSources) {
      const newMemberId = memberIdMap.get(source.household_member_id);
      if (newMemberId) {
        await query(
          `INSERT INTO income_sources
           (household_member_id, source_type, employer_payer_name, amount, frequency, annual_amount)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            newMemberId,
            source.source_type,
            source.employer_payer_name,
            source.amount,
            source.frequency,
            source.annual_amount,
          ]
        );
      }
    }

    // Copy assets
    const assets = await query<{
      household_member_id: number;
      asset_type: string;
      cash_value: string;
      annual_income: string;
    }>(
      `SELECT a.household_member_id, a.asset_type, a.cash_value, a.annual_income
       FROM assets a
       WHERE a.household_member_id IN (
         SELECT id FROM household_members WHERE application_id = $1
       )`,
      [originalApp.id]
    );

    for (const asset of assets) {
      const newMemberId = memberIdMap.get(asset.household_member_id);
      if (newMemberId) {
        await query(
          `INSERT INTO assets
           (household_member_id, asset_type, cash_value, annual_income)
           VALUES ($1, $2, $3, $4)`,
          [newMemberId, asset.asset_type, asset.cash_value, asset.annual_income]
        );
      }
    }

    // Copy documents (carry forward to new version)
    // CRITICAL: Do NOT duplicate R2 objects - reference same storage_key
    // This preserves audit trail and original upload attribution
    const db = getPool();
    const documents = await db.query(
      `SELECT
        d.id,
        d.document_type,
        d.storage_key,
        d.original_filename,
        d.file_size,
        d.content_type,
        d.household_member_id,
        d.income_source_id,
        d.uploaded_by,
        d.uploaded_at
       FROM documents d
       WHERE d.application_id = $1`,
      [originalApp.id]
    );

    for (const doc of documents.rows) {
      // Map old household_member_id to new one (if applicable)
      const newMemberId = doc.household_member_id
        ? memberIdMap.get(doc.household_member_id)
        : null;

      // Note: income_source_id mapping is more complex (not implemented yet)
      // For now, we'll clear it if it exists
      const newIncomeSourceId = null; // TODO: map income sources if needed

      // Insert document reference pointing to SAME storage_key
      // CRITICAL: Preserve original uploaded_at - this is when the applicant provided the document
      const [newDoc] = await query<{ id: number }>(
        `INSERT INTO documents
         (application_id, document_type, storage_key, original_filename,
          file_size, content_type, household_member_id, income_source_id,
          uploaded_by, uploaded_at, file_path)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id`,
        [
          newApp.id,
          doc.document_type,
          doc.storage_key, // Same storage key - no R2 duplication
          doc.original_filename,
          doc.file_size,
          doc.content_type,
          newMemberId || null,
          newIncomeSourceId,
          doc.uploaded_by, // Preserve original uploader
          doc.uploaded_at, // Preserve original upload timestamp
          doc.storage_key, // Backfill for compatibility
        ]
      );

      // Log carry-forward action to audit trail
      // The audit trail's created_at records WHEN the carry-forward happened
      // The document's uploaded_at records when the applicant originally provided it
      if (newDoc && session) {
        await logDocumentAction(
          newDoc.id,
          "carried_forward",
          {
            userId: session.user.id,
            userEmail: session.user.email,
            userRole: session.user.role,
          },
          newApp.id,
          newVersion,
          {
            source_application_id: originalApp.id,
            source_version: originalApp.version,
            original_uploaded_at: doc.uploaded_at, // Record original timestamp in audit
          }
        );
      }
    }

    return NextResponse.json({
      newApplicationId: newApp.id,
      version: newVersion,
      message: `Created version ${newVersion} for editing`,
    });
  } catch (error) {
    console.error("Edit application error:", error);
    return NextResponse.json(
      { error: "Failed to create new version" },
      { status: 500 }
    );
  }
}
