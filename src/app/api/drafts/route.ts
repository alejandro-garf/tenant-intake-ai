import { NextRequest, NextResponse } from "next/server";
import { query } from "@/db/connection";
import { getCurrentSession } from "@/lib/get-current-user";
import type { ApplicationDraft, SaveDraftResponse, HouseholdMemberDraft, IncomeSourceDraft, AssetDraft, StudentExemption, IncomeSourceType, IncomeFrequency, AssetType } from "@/app/apply/types";

/**
 * Normalize a Date object or ISO date string to YYYY-MM-DD format.
 * CRITICAL: Does NOT use toISOString() to avoid timezone-related off-by-one errors.
 * Postgres DATE columns return Date objects that may shift when converted to UTC.
 * Example: 1986-05-06 in PST becomes 1986-05-05 when .toISOString() is used.
 * Solution: Extract year/month/day directly from the Date object.
 */
function normalizeDateOfBirth(dateValue: Date | string): string {
  // If already a YYYY-MM-DD string, return as-is
  if (typeof dateValue === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return dateValue;
  }

  // Convert to Date if it's a string (ISO timestamp)
  const date = typeof dateValue === "string" ? new Date(dateValue) : dateValue;

  // Extract components using local timezone (NOT UTC)
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/**
 * GET /api/drafts
 * Fetch the current user's existing draft (if any)
 */
export async function GET() {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const applicantEmail = session.user.email;

    // Get first property (seed created one)
    const [property] = await query<{ id: string }>(
      "SELECT id FROM properties LIMIT 1"
    );

    if (!property) {
      return NextResponse.json(
        { error: "No property found" },
        { status: 500 }
      );
    }

    // Find existing draft for this applicant
    const [existingDraft] = await query<{ id: number }>(
      `SELECT id FROM applications
       WHERE property_id = $1 AND applicant_email = $2 AND status = 'draft' AND version = 1`,
      [property.id, applicantEmail]
    );

    if (!existingDraft) {
      // No draft exists yet, return empty draft
      const emptyDraft: ApplicationDraft = {
        household: [],
        incomeSources: [],
        assets: [],
      };
      return NextResponse.json(emptyDraft);
    }

    const applicationId = existingDraft.id;

    // Fetch household members
    const householdMembers = await query<{
      stable_id: string;
      name: string;
      date_of_birth: string;
      relationship: string;
      is_full_time_student: boolean;
      student_exemption_type: string | null;
      ssn_last_4: string | null;
    }>(
      `SELECT stable_id, name, date_of_birth, relationship, is_full_time_student, student_exemption_type, ssn_last_4
       FROM household_members
       WHERE application_id = $1
       ORDER BY id ASC`,
      [applicationId]
    );

    // Fetch income sources (with member mapping)
    const incomeSources = await query<{
      stable_id: string;
      member_stable_id: string;
      source_type: string;
      employer_payer_name: string | null;
      amount: number;
      frequency: string;
    }>(
      `SELECT i.stable_id, m.stable_id AS member_stable_id, i.source_type, i.employer_payer_name, i.amount, i.frequency
       FROM income_sources i
       JOIN household_members m ON i.household_member_id = m.id
       WHERE m.application_id = $1
       ORDER BY i.id ASC`,
      [applicationId]
    );

    // Fetch assets (with member mapping)
    const assets = await query<{
      stable_id: string;
      member_stable_id: string;
      asset_type: string;
      cash_value: number;
      annual_income: number;
    }>(
      `SELECT a.stable_id, m.stable_id AS member_stable_id, a.asset_type, a.cash_value, a.annual_income
       FROM assets a
       JOIN household_members m ON a.household_member_id = m.id
       WHERE m.application_id = $1
       ORDER BY a.id ASC`,
      [applicationId]
    );

    // Map DB rows to client shape
    const household: HouseholdMemberDraft[] = householdMembers.map((m) => ({
      id: m.stable_id,
      name: m.name,
      dateOfBirth: normalizeDateOfBirth(m.date_of_birth),
      relationship: m.relationship,
      isFullTimeStudent: m.is_full_time_student,
      studentExemptionType: (m.student_exemption_type as StudentExemption) || undefined,
      ssnLast4: m.ssn_last_4 || undefined,
    }));

    const incomeSourcesDraft: IncomeSourceDraft[] = incomeSources.map((i) => ({
      id: i.stable_id,
      householdMemberId: i.member_stable_id,
      sourceType: i.source_type as IncomeSourceType,
      employerPayerName: i.employer_payer_name || undefined,
      amount: i.amount,
      frequency: i.frequency as IncomeFrequency,
    }));

    const assetsDraft: AssetDraft[] = assets.map((a) => ({
      id: a.stable_id,
      householdMemberId: a.member_stable_id,
      assetType: a.asset_type as AssetType,
      cashValue: a.cash_value,
      annualIncome: a.annual_income,
    }));

    const draft: ApplicationDraft = {
      id: applicationId,
      propertyId: property.id,
      household,
      incomeSources: incomeSourcesDraft,
      assets: assetsDraft,
    };

    return NextResponse.json(draft);
  } catch (error) {
    console.error("Draft fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch draft" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // SECURITY: This route does NOT rely on middleware. Enforce auth here.
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const draft: ApplicationDraft = await request.json();
    const applicantEmail = session.user.email;

    // Get first property (seed created one)
    const [property] = await query<{ id: string }>(
      "SELECT id FROM properties LIMIT 1"
    );

    if (!property) {
      return NextResponse.json(
        { error: "No property found" },
        { status: 500 }
      );
    }

    // UPSERT logic: check if a draft already exists for this applicant
    // Only look for drafts (not submitted apps) - submitted apps have version locked
    const [existingDraft] = await query<{ id: number }>(
      `SELECT id FROM applications
       WHERE property_id = $1 AND applicant_email = $2 AND status = 'draft'
       ORDER BY version DESC
       LIMIT 1`,
      [property.id, applicantEmail]
    );

    let applicationId: number;

    if (existingDraft) {
      applicationId = existingDraft.id;

      // Update existing draft timestamp
      await query(
        `UPDATE applications
         SET updated_at = NOW()
         WHERE id = $1`,
        [applicationId]
      );
    } else {
      // Create new draft with version = MAX(existing versions) + 1
      // Use atomic subquery to avoid race conditions
      const [app] = await query<{ id: number }>(
        `INSERT INTO applications
         (property_id, applicant_email, applicant_name, status, version)
         VALUES (
           $1,
           $2,
           $3,
           'draft',
           COALESCE(
             (SELECT MAX(version) FROM applications
              WHERE property_id = $1::uuid AND applicant_email = $2::varchar),
             0
           ) + 1
         )
         RETURNING id`,
        [
          property.id,
          applicantEmail,
          "Applicant", // Name will be collected in the application form
        ]
      );

      if (!app) {
        throw new Error("Failed to create draft");
      }

      applicationId = app.id;
    }

    // RECONCILE household members (UPDATE existing, INSERT new, DELETE removed)
    const existingMembers = await query<{ id: number; stable_id: string | null }>(
      "SELECT id, stable_id FROM household_members WHERE application_id = $1",
      [applicationId]
    );

    const existingMemberMap = new Map(
      existingMembers
        .filter((m) => m.stable_id)
        .map((m) => [m.stable_id!, m.id])
    );

    const incomingStableIds = new Set(draft.household.map((m) => m.id));
    const memberIdMap = new Map<string, number>();

    // UPDATE or INSERT household members
    for (const member of draft.household) {
      const existingDbId = existingMemberMap.get(member.id);

      if (existingDbId) {
        // UPDATE existing member
        await query(
          `UPDATE household_members
           SET name = $1, date_of_birth = $2, relationship = $3,
               is_full_time_student = $4, student_exemption_type = $5, ssn_last_4 = $6
           WHERE id = $7`,
          [
            member.name,
            member.dateOfBirth,
            member.relationship,
            member.isFullTimeStudent,
            member.studentExemptionType || null,
            member.ssnLast4 || null,
            existingDbId,
          ]
        );
        memberIdMap.set(member.id, existingDbId);
      } else {
        // INSERT new member
        const [dbMember] = await query<{ id: number }>(
          `INSERT INTO household_members
           (application_id, stable_id, name, date_of_birth, relationship, is_full_time_student, student_exemption_type, ssn_last_4)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING id`,
          [
            applicationId,
            member.id,
            member.name,
            member.dateOfBirth,
            member.relationship,
            member.isFullTimeStudent,
            member.studentExemptionType || null,
            member.ssnLast4 || null,
          ]
        );
        if (dbMember) {
          memberIdMap.set(member.id, dbMember.id);
        }
      }
    }

    // DELETE removed household members (and CASCADE to income_sources, assets, documents)
    for (const [stableId, dbId] of existingMemberMap) {
      if (!incomingStableIds.has(stableId)) {
        await query("DELETE FROM household_members WHERE id = $1", [dbId]);
      }
    }

    // RECONCILE income sources
    const existingIncome = await query<{ id: number; household_member_id: number; stable_id: string | null }>(
      `SELECT id, household_member_id, stable_id FROM income_sources
       WHERE household_member_id IN (SELECT id FROM household_members WHERE application_id = $1)`,
      [applicationId]
    );

    const existingIncomeMap = new Map(
      existingIncome
        .filter((i) => i.stable_id)
        .map((i) => [i.stable_id!, i.id])
    );

    const incomingIncomeIds = new Set(draft.incomeSources.map((s) => s.id));

    // UPDATE or INSERT income sources
    for (const source of draft.incomeSources) {
      const dbMemberId = memberIdMap.get(source.householdMemberId);
      if (!dbMemberId) continue;

      const existingIncomeId = existingIncomeMap.get(source.id);

      if (existingIncomeId) {
        // UPDATE existing income source
        await query(
          `UPDATE income_sources
           SET household_member_id = $1, source_type = $2, employer_payer_name = $3,
               amount = $4, frequency = $5
           WHERE id = $6`,
          [
            dbMemberId,
            source.sourceType,
            source.employerPayerName || null,
            source.amount,
            source.frequency,
            existingIncomeId,
          ]
        );
      } else {
        // INSERT new income source
        await query(
          `INSERT INTO income_sources
           (household_member_id, stable_id, source_type, employer_payer_name, amount, frequency, annual_amount)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            dbMemberId,
            source.id,
            source.sourceType,
            source.employerPayerName || null,
            source.amount,
            source.frequency,
            0, // Placeholder for annual_amount (to be calculated by rules engine)
          ]
        );
      }
    }

    // DELETE removed income sources
    for (const [stableId, dbId] of existingIncomeMap) {
      if (!incomingIncomeIds.has(stableId)) {
        await query("DELETE FROM income_sources WHERE id = $1", [dbId]);
      }
    }

    // RECONCILE assets
    const existingAssets = await query<{ id: number; household_member_id: number; stable_id: string | null }>(
      `SELECT id, household_member_id, stable_id FROM assets
       WHERE household_member_id IN (SELECT id FROM household_members WHERE application_id = $1)`,
      [applicationId]
    );

    const existingAssetMap = new Map(
      existingAssets
        .filter((a) => a.stable_id)
        .map((a) => [a.stable_id!, a.id])
    );

    const incomingAssetIds = new Set(draft.assets.map((a) => a.id));

    // UPDATE or INSERT assets
    for (const asset of draft.assets) {
      const dbMemberId = memberIdMap.get(asset.householdMemberId);
      if (!dbMemberId) continue;

      const existingAssetId = existingAssetMap.get(asset.id);

      if (existingAssetId) {
        // UPDATE existing asset
        await query(
          `UPDATE assets
           SET household_member_id = $1, asset_type = $2, cash_value = $3, annual_income = $4
           WHERE id = $5`,
          [
            dbMemberId,
            asset.assetType,
            asset.cashValue,
            asset.annualIncome,
            existingAssetId,
          ]
        );
      } else {
        // INSERT new asset
        await query(
          `INSERT INTO assets
           (household_member_id, stable_id, asset_type, cash_value, annual_income)
           VALUES ($1, $2, $3, $4, $5)`,
          [dbMemberId, asset.id, asset.assetType, asset.cashValue, asset.annualIncome]
        );
      }
    }

    // DELETE removed assets
    for (const [stableId, dbId] of existingAssetMap) {
      if (!incomingAssetIds.has(stableId)) {
        await query("DELETE FROM assets WHERE id = $1", [dbId]);
      }
    }

    const response: SaveDraftResponse = {
      id: applicationId,
      message: existingDraft ? "Draft updated" : "Draft created",
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Draft save error:", error);

    // Check for unique constraint violation on (property_id, applicant_email, version)
    if (
      error instanceof Error &&
      error.message.includes("applications_property_id_applicant_email_version_key")
    ) {
      return NextResponse.json(
        {
          error:
            "Version conflict: An application with this version already exists. Please refresh and try again.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Failed to save draft" },
      { status: 500 }
    );
  }
}
