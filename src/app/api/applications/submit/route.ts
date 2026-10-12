import { NextRequest, NextResponse } from "next/server";
import { query } from "@/db/connection";
import { getCurrentSession } from "@/lib/get-current-user";
import type { ApplicationDraft } from "@/app/apply/types";
import { screenApplication } from "@/rules/engine";
import type { RuleConfig } from "@/rules/types";
import { adaptDraftToEngineInput } from "@/rules/adapter";
import { convertToAnnual } from "@/lib/income";

export async function POST(request: NextRequest) {
  // SECURITY: This route does NOT rely on middleware. Enforce auth here.
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const draft: ApplicationDraft = await request.json();

    if (!draft.id) {
      return NextResponse.json(
        { error: "Draft must be saved before submission" },
        { status: 400 }
      );
    }

    // Get the property for this draft
    const [app] = await query<{ property_id: string; status: string }>(
      "SELECT property_id, status FROM applications WHERE id = $1",
      [draft.id]
    );

    if (!app) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    if (app.status !== "draft") {
      return NextResponse.json(
        { error: "Application already submitted" },
        { status: 400 }
      );
    }

    // VALIDATION: Check for required documents
    const uploadedDocs = await query<{ document_type: string }>(
      "SELECT document_type FROM documents WHERE application_id = $1",
      [draft.id]
    );

    const docTypes = new Set(uploadedDocs.map((d) => d.document_type));
    const missingDocs: string[] = [];

    // ID document is always required
    if (!docTypes.has("id_document")) {
      missingDocs.push("ID document");
    }

    // Income verification required if any income sources exist
    if (draft.incomeSources.length > 0 && !docTypes.has("income_verification")) {
      missingDocs.push("Income verification");
    }

    // Asset statements required if any assets exist
    if (draft.assets.length > 0 && !docTypes.has("asset_statement")) {
      missingDocs.push("Asset statements");
    }

    if (missingDocs.length > 0) {
      return NextResponse.json(
        {
          error: `Please upload required documents before submitting: ${missingDocs.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Get active rule version for this property
    const [ruleVersion] = await query<{
      id: number;
      income_cap_annual: string;
      max_occupancy: number;
      passbook_rate: string;
      asset_threshold: string;
    }>(
      `SELECT id, income_cap_annual, max_occupancy, passbook_rate, asset_threshold
       FROM rule_versions
       WHERE property_id = $1 AND active = TRUE
       LIMIT 1`,
      [app.property_id]
    );

    if (!ruleVersion) {
      return NextResponse.json(
        { error: "No active rule version found for property" },
        { status: 500 }
      );
    }

    const ruleConfig: RuleConfig = {
      incomeCapAnnual: parseFloat(ruleVersion.income_cap_annual),
      maxOccupancy: ruleVersion.max_occupancy,
      passbookRate: parseFloat(ruleVersion.passbook_rate),
      assetThreshold: parseFloat(ruleVersion.asset_threshold),
    };

    // Adapt flat draft structure to nested engine input
    const household = adaptDraftToEngineInput({
      household: draft.household,
      incomeSources: draft.incomeSources,
      assets: draft.assets,
    });

    // Run the canonical deterministic screening engine
    const screeningResult = screenApplication({
      household,
      ruleConfig,
    });

    // Update application status to submitted
    await query(
      `UPDATE applications
       SET status = 'submitted', submitted_at = NOW()
       WHERE id = $1`,
      [draft.id]
    );

    // Update income sources with annual amounts
    for (const source of draft.incomeSources) {
      const annualAmount = convertToAnnual(source.amount, source.frequency);

      // Get the DB member ID
      const [dbMember] = await query<{ id: number }>(
        `SELECT id FROM household_members
         WHERE application_id = $1 AND name = $2
         LIMIT 1`,
        [draft.id, draft.household.find((m) => m.id === source.householdMemberId)?.name]
      );

      if (dbMember) {
        await query(
          `UPDATE income_sources
           SET annual_amount = $1
           WHERE household_member_id = $2 AND source_type = $3 AND amount = $4`,
          [annualAmount, dbMember.id, source.sourceType, source.amount]
        );
      }
    }

    // Store screening result
    await query(
      `INSERT INTO screening_results
       (application_id, rule_version_id, passed, failure_reasons, gross_income, imputed_asset_income, household_size)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        draft.id,
        ruleVersion.id,
        screeningResult.passed,
        JSON.stringify(screeningResult.failureReasons),
        screeningResult.grossIncome,
        screeningResult.imputedAssetIncome ?? 0,
        screeningResult.householdSize,
      ]
    );

    return NextResponse.json({
      success: true,
      message: "Application submitted successfully",
    });
  } catch (error) {
    console.error("Submission error:", error);
    return NextResponse.json(
      { error: "Failed to submit application" },
      { status: 500 }
    );
  }
}
