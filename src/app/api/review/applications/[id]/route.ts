import { NextRequest, NextResponse } from "next/server";
import { query } from "@/db/connection";
import { getCurrentSession } from "@/lib/get-current-user";
import type { StudentExemption } from "@/rules/types";

export type ApplicationDetailHouseholdMember = {
  id: number;
  name: string;
  dateOfBirth: string;
  relationship: string;
  isFullTimeStudent: boolean;
  studentExemptionType: StudentExemption | null;
  incomeSources: ApplicationDetailIncomeSource[];
  assets: ApplicationDetailAsset[];
};

export type ApplicationDetailIncomeSource = {
  id: number;
  sourceType: string;
  employerPayerName: string | null;
  amount: number;
  frequency: string;
  annualAmount: number;
};

export type ApplicationDetailAsset = {
  id: number;
  assetType: string;
  cashValue: number;
  annualIncome: number;
};

export type ApplicationDetailScreeningResult = {
  passed: boolean;
  failureReasons: string[];
  grossIncome: number;
  imputedAssetIncome: number | null;
  householdSize: number;
  screenedAt: string;
};

export type ApplicationDetailRuleVersion = {
  id: number;
  version: number;
  incomeCapAnnual: number;
  maxOccupancy: number;
  passbookRate: number;
  assetThreshold: number;
  effectiveDate: string;
};

export type ApplicationVersionInfo = {
  id: number;
  version: number;
  status: string;
  submittedAt: string | null;
  createdAt: string;
};

export type ApplicationDetail = {
  id: number;
  version: number;
  applicantEmail: string;
  applicantName: string;
  status: string;
  submittedAt: string | null;
  createdAt: string;
  household: ApplicationDetailHouseholdMember[];
  screeningResult: ApplicationDetailScreeningResult | null;
  ruleVersion: ApplicationDetailRuleVersion | null;
  versionHistory: ApplicationVersionInfo[];
  // Calculated totals
  totalAnnualIncome: number;
  totalAssetCashValue: number;
  totalActualAssetIncome: number;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // SECURITY: This route does NOT rely on middleware. Enforce auth here.
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "reviewer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!session.totpVerified) {
    return NextResponse.json({ error: "TOTP verification required" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const applicationId = parseInt(id, 10);

    if (isNaN(applicationId)) {
      return NextResponse.json(
        { error: "Invalid application ID" },
        { status: 400 }
      );
    }

    // Fetch application
    const [application] = await query<{
      id: number;
      version: number;
      applicant_email: string;
      applicant_name: string;
      status: string;
      submitted_at: string | null;
      created_at: string;
      parent_application_id: number | null;
    }>(
      `SELECT id, version, applicant_email, applicant_name, status, submitted_at, created_at, parent_application_id
       FROM applications
       WHERE id = $1`,
      [applicationId]
    );

    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    // Fetch household members
    const householdMembers = await query<{
      id: number;
      name: string;
      date_of_birth: string;
      relationship: string;
      is_full_time_student: boolean;
      student_exemption_type: StudentExemption | null;
    }>(
      `SELECT id, name, date_of_birth, relationship, is_full_time_student, student_exemption_type
       FROM household_members
       WHERE application_id = $1
       ORDER BY
         CASE relationship
           WHEN 'applicant' THEN 1
           WHEN 'spouse' THEN 2
           ELSE 3
         END,
         name`,
      [applicationId]
    );

    // Fetch income sources for all members
    const incomeSources = await query<{
      id: number;
      household_member_id: number;
      source_type: string;
      employer_payer_name: string | null;
      amount: number;
      frequency: string;
      annual_amount: number;
    }>(
      `SELECT
         is_table.id,
         is_table.household_member_id,
         is_table.source_type,
         is_table.employer_payer_name,
         is_table.amount,
         is_table.frequency,
         is_table.annual_amount
       FROM income_sources is_table
       JOIN household_members hm ON hm.id = is_table.household_member_id
       WHERE hm.application_id = $1
       ORDER BY is_table.id`,
      [applicationId]
    );

    // Fetch assets for all members
    const assets = await query<{
      id: number;
      household_member_id: number;
      asset_type: string;
      cash_value: number;
      annual_income: number;
    }>(
      `SELECT
         a.id,
         a.household_member_id,
         a.asset_type,
         a.cash_value,
         a.annual_income
       FROM assets a
       JOIN household_members hm ON hm.id = a.household_member_id
       WHERE hm.application_id = $1
       ORDER BY a.id`,
      [applicationId]
    );

    // Build household structure with nested income sources and assets
    const household: ApplicationDetailHouseholdMember[] =
      householdMembers.map((member) => ({
        id: member.id,
        name: member.name,
        dateOfBirth: member.date_of_birth,
        relationship: member.relationship,
        isFullTimeStudent: member.is_full_time_student,
        studentExemptionType: member.student_exemption_type,
        incomeSources: incomeSources
          .filter((source) => source.household_member_id === member.id)
          .map((source) => ({
            id: source.id,
            sourceType: source.source_type,
            employerPayerName: source.employer_payer_name,
            amount: parseFloat(source.amount as unknown as string),
            frequency: source.frequency,
            annualAmount: parseFloat(source.annual_amount as unknown as string),
          })),
        assets: assets
          .filter((asset) => asset.household_member_id === member.id)
          .map((asset) => ({
            id: asset.id,
            assetType: asset.asset_type,
            cashValue: parseFloat(asset.cash_value as unknown as string),
            annualIncome: parseFloat(asset.annual_income as unknown as string),
          })),
      }));

    // Fetch screening result
    let screeningResult: ApplicationDetailScreeningResult | null = null;
    const [screening] = await query<{
      passed: boolean;
      failure_reasons: string[] | string | null;
      gross_income: number;
      imputed_asset_income: number | null;
      household_size: number;
      screened_at: string;
    }>(
      `SELECT passed, failure_reasons, gross_income, imputed_asset_income, household_size, screened_at
       FROM screening_results
       WHERE application_id = $1`,
      [applicationId]
    );

    if (screening) {
      // Normalize failure_reasons: JSONB columns return as arrays directly,
      // but legacy data might be a string. Handle both gracefully.
      let failureReasons: string[] = [];
      if (screening.failure_reasons) {
        try {
          if (Array.isArray(screening.failure_reasons)) {
            // Modern JSONB data: already an array
            failureReasons = screening.failure_reasons;
          } else if (typeof screening.failure_reasons === 'string') {
            // Legacy data: stored as plain string or JSON string
            try {
              const parsed = JSON.parse(screening.failure_reasons);
              failureReasons = Array.isArray(parsed) ? parsed : [screening.failure_reasons];
            } catch {
              // Not valid JSON, treat as plain string
              failureReasons = [screening.failure_reasons];
            }
          }
        } catch (error) {
          console.error(`Failed to parse failure_reasons for application ${applicationId}:`, error);
          failureReasons = [];
        }
      }

      screeningResult = {
        passed: screening.passed,
        failureReasons,
        grossIncome: parseFloat(screening.gross_income as unknown as string),
        imputedAssetIncome: screening.imputed_asset_income
          ? parseFloat(screening.imputed_asset_income as unknown as string)
          : null,
        householdSize: screening.household_size,
        screenedAt: screening.screened_at,
      };
    }

    // Fetch rule version used for screening
    let ruleVersion: ApplicationDetailRuleVersion | null = null;
    if (screening) {
      const [rule] = await query<{
        id: number;
        version: number;
        income_cap_annual: number;
        max_occupancy: number;
        passbook_rate: number;
        asset_threshold: number;
        effective_date: string;
      }>(
        `SELECT rv.id, rv.version, rv.income_cap_annual, rv.max_occupancy, rv.passbook_rate, rv.asset_threshold, rv.effective_date
         FROM rule_versions rv
         JOIN screening_results sr ON sr.rule_version_id = rv.id
         WHERE sr.application_id = $1`,
        [applicationId]
      );

      if (rule) {
        ruleVersion = {
          id: rule.id,
          version: rule.version,
          incomeCapAnnual: parseFloat(
            rule.income_cap_annual as unknown as string
          ),
          maxOccupancy: rule.max_occupancy,
          passbookRate: parseFloat(rule.passbook_rate as unknown as string),
          assetThreshold: parseFloat(rule.asset_threshold as unknown as string),
          effectiveDate: rule.effective_date,
        };
      }
    }

    // Fetch version history (all versions of this application lineage)
    // Find the root application (v1) by following parent chain
    let rootId = applicationId;
    if (application.parent_application_id) {
      const [root] = await query<{ id: number }>(
        `WITH RECURSIVE ancestry AS (
          SELECT id, parent_application_id
          FROM applications
          WHERE id = $1

          UNION ALL

          SELECT a.id, a.parent_application_id
          FROM applications a
          JOIN ancestry anc ON a.id = anc.parent_application_id
        )
        SELECT id FROM ancestry WHERE parent_application_id IS NULL`,
        [applicationId]
      );
      if (root) {
        rootId = root.id;
      }
    }

    // Get all versions in this lineage
    const versions = await query<{
      id: number;
      version: number;
      status: string;
      submitted_at: string | null;
      created_at: string;
    }>(
      `WITH RECURSIVE lineage AS (
        SELECT id, version, status, submitted_at, created_at, parent_application_id
        FROM applications
        WHERE id = $1

        UNION ALL

        SELECT a.id, a.version, a.status, a.submitted_at, a.created_at, a.parent_application_id
        FROM applications a
        JOIN lineage l ON a.parent_application_id = l.id
      )
      SELECT id, version, status, submitted_at, created_at
      FROM lineage
      ORDER BY version DESC`,
      [rootId]
    );

    const versionHistory: ApplicationVersionInfo[] = versions.map((v) => ({
      id: v.id,
      version: v.version,
      status: v.status,
      submittedAt: v.submitted_at,
      createdAt: v.created_at,
    }));

    // Calculate totals
    const totalAnnualIncome = household.reduce(
      (sum, member) =>
        sum +
        member.incomeSources.reduce((s, source) => s + source.annualAmount, 0),
      0
    );

    const totalAssetCashValue = household.reduce(
      (sum, member) =>
        sum + member.assets.reduce((s, asset) => s + asset.cashValue, 0),
      0
    );

    const totalActualAssetIncome = household.reduce(
      (sum, member) =>
        sum + member.assets.reduce((s, asset) => s + asset.annualIncome, 0),
      0
    );

    const detail: ApplicationDetail = {
      id: application.id,
      version: application.version,
      applicantEmail: application.applicant_email,
      applicantName: application.applicant_name,
      status: application.status,
      submittedAt: application.submitted_at,
      createdAt: application.created_at,
      household,
      screeningResult,
      ruleVersion,
      versionHistory,
      totalAnnualIncome,
      totalAssetCashValue,
      totalActualAssetIncome,
    };

    return NextResponse.json(detail);
  } catch (error) {
    console.error("Application detail fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch application detail" },
      { status: 500 }
    );
  }
}
