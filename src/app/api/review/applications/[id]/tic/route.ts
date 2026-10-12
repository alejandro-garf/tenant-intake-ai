import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/db/connection';
import { getCurrentSession } from '@/lib/get-current-user';
import { adaptApplicationToTIC, type DBApplicationData } from '@/tic/adapter';
import { fillTIC } from '@/tic/fill';
import type { StudentExemption } from '@/rules/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // SECURITY: This route does NOT rely on middleware. Enforce auth here.
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.user.role !== 'reviewer') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!session.totpVerified) {
    return NextResponse.json(
      { error: 'TOTP verification required' },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;
    const applicationId = parseInt(id, 10);

    if (isNaN(applicationId)) {
      return NextResponse.json(
        { error: 'Invalid application ID' },
        { status: 400 }
      );
    }

    // Fetch application
    const [application] = await query<{
      id: number;
      version: number;
      submitted_at: string | null;
      status: string;
    }>(
      `SELECT id, version, submitted_at, status
       FROM applications
       WHERE id = $1`,
      [applicationId]
    );

    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Only generate TIC for submitted applications
    if (application.status !== 'submitted') {
      return NextResponse.json(
        { error: 'TIC can only be generated for submitted applications' },
        { status: 400 }
      );
    }

    // Fetch household members
    const householdMembers = await query<{
      id: number;
      name: string;
      date_of_birth: string;
      relationship: string;
      is_full_time_student: boolean;
      ssn_last_4: string | null;
      student_exemption_type: string | null;
    }>(
      `SELECT id, name, date_of_birth, relationship, is_full_time_student, ssn_last_4, student_exemption_type
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
      amount: number;
      frequency: string;
      annual_amount: number;
    }>(
      `SELECT
         is_table.id,
         is_table.household_member_id,
         is_table.source_type,
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

    // Fetch screening result (required for TIC generation)
    const [screeningResult] = await query<{
      passed: boolean;
      failure_reasons: string[] | string | null;
      gross_income: number;
      imputed_asset_income: number | null;
      household_size: number;
      created_at: string;
    }>(
      `SELECT passed, failure_reasons, gross_income, imputed_asset_income, household_size, created_at
       FROM screening_results
       WHERE application_id = $1`,
      [applicationId]
    );

    if (!screeningResult) {
      return NextResponse.json(
        { error: 'Screening result not found for this application' },
        { status: 404 }
      );
    }

    // Normalize failure_reasons: JSONB columns return as arrays directly,
    // but legacy data might be a string. Handle both gracefully.
    let normalizedFailureReasons: string[] | null = null;
    if (screeningResult.failure_reasons) {
      try {
        if (Array.isArray(screeningResult.failure_reasons)) {
          // Modern JSONB data: already an array
          normalizedFailureReasons = screeningResult.failure_reasons;
        } else if (typeof screeningResult.failure_reasons === 'string') {
          // Legacy data: stored as plain string or JSON string
          try {
            const parsed = JSON.parse(screeningResult.failure_reasons);
            normalizedFailureReasons = Array.isArray(parsed) ? parsed : [screeningResult.failure_reasons];
          } catch {
            // Not valid JSON, treat as plain string
            normalizedFailureReasons = [screeningResult.failure_reasons];
          }
        }
      } catch (error) {
        console.error(`Failed to parse failure_reasons for application ${applicationId}:`, error);
        normalizedFailureReasons = null;
      }
    }

    // Fetch rule version used for screening
    const [ruleVersion] = await query<{
      income_cap_annual: number;
      max_occupancy: number;
      passbook_rate: number;
      asset_imputation_threshold: number;
    }>(
      `SELECT rv.income_cap_annual, rv.max_occupancy, rv.passbook_rate, rv.asset_imputation_threshold
       FROM rule_versions rv
       JOIN screening_results sr ON sr.rule_version_id = rv.id
       WHERE sr.application_id = $1`,
      [applicationId]
    );

    if (!ruleVersion) {
      return NextResponse.json(
        { error: 'Rule version not found for this application' },
        { status: 404 }
      );
    }

    // Build DBApplicationData structure
    const dbData: DBApplicationData = {
      applicationId: application.id,
      applicationVersion: application.version,
      submittedAt: application.submitted_at ? new Date(application.submitted_at) : null,
      householdMembers: householdMembers.map((m) => ({
        id: m.id,
        name: m.name,
        date_of_birth: m.date_of_birth,
        relationship: m.relationship,
        is_full_time_student: m.is_full_time_student,
        ssn_last_4: m.ssn_last_4,
        student_exemption_type: m.student_exemption_type,
      })),
      incomeSources: incomeSources.map((s) => ({
        id: s.id,
        household_member_id: s.household_member_id,
        source_type: s.source_type,
        amount: parseFloat(s.amount as unknown as string),
        frequency: s.frequency,
        annual_amount: parseFloat(s.annual_amount as unknown as string),
      })),
      assets: assets.map((a) => ({
        id: a.id,
        household_member_id: a.household_member_id,
        asset_type: a.asset_type,
        cash_value: parseFloat(a.cash_value as unknown as string),
        annual_income: parseFloat(a.annual_income as unknown as string),
      })),
      screeningResult: {
        passed: screeningResult.passed,
        failure_reasons: normalizedFailureReasons,
        gross_income: parseFloat(screeningResult.gross_income as unknown as string),
        imputed_asset_income: screeningResult.imputed_asset_income
          ? parseFloat(screeningResult.imputed_asset_income as unknown as string)
          : null,
        household_size: screeningResult.household_size,
        created_at: new Date(screeningResult.created_at),
      },
      ruleVersion: {
        income_cap_annual: parseFloat(ruleVersion.income_cap_annual as unknown as string),
        max_occupancy: ruleVersion.max_occupancy,
        asset_imputation_threshold: parseFloat(
          ruleVersion.asset_imputation_threshold as unknown as string
        ),
        passbook_rate: parseFloat(ruleVersion.passbook_rate as unknown as string),
      },
    };

    // Adapt DB data to TIC input format
    const ticInput = adaptApplicationToTIC(dbData);

    // Generate filled PDF
    const ticResult = await fillTIC(ticInput);

    // Return PDF as downloadable file
    const filename = `TIC-Application-${application.id}-v${application.version}.pdf`;

    return new NextResponse(Buffer.from(ticResult.pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-TIC-Overflow': ticResult.overflow.hasOverflow ? 'true' : 'false',
        'X-TIC-Overflow-Message': ticResult.overflow.message || '',
      },
    });
  } catch (error) {
    console.error('TIC generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate TIC form' },
      { status: 500 }
    );
  }
}
