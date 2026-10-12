/**
 * TIC DATA ADAPTER
 *
 * Maps stored application version data from the database to TIC fill input types.
 * All calculated values come from the canonical rules engine output stored in
 * screening_results — we NEVER recalculate here (Golden Rule 1).
 */

import type {
  TICFillInput,
  TICHouseholdMember,
  TICIncomeSource,
  TICAsset,
  TICAssetCalculations,
  TICStudentStatus,
  RelationshipCode,
  StudentStatus,
} from './types';
import type { StudentExemptionCode } from './field-map';
import { convertToAnnual } from '@/lib/income';

/**
 * Raw application data from database (joined queries)
 */
export interface DBHouseholdMember {
  id: number;
  name: string;
  date_of_birth: string; // ISO date string
  relationship: string; // H, S, A, C, etc.
  is_full_time_student: boolean;
  ssn_last_4: string | null; // Last 4 digits of SSN, or null if not provided
  student_exemption_type: string | null; // '1', '2', '3', '4', '5'
}

export interface DBIncomeSource {
  id: number;
  household_member_id: number;
  source_type: string; // e.g., "employment", "social_security", "public_assistance", "other"
  amount: number;
  frequency: string; // "hourly", "weekly", "biweekly", "semimonthly", "monthly", "annual"
  annual_amount: number; // Pre-calculated by submit route
}

export interface DBAsset {
  id: number;
  household_member_id: number;
  asset_type: string; // e.g., "checking", "savings", "stocks"
  cash_value: number;
  annual_income: number;
}

export interface DBScreeningResult {
  passed: boolean;
  failure_reasons: string[] | null;
  gross_income: number; // Total income from Part III (E)
  imputed_asset_income: number | null; // (J) - only if assets > threshold
  household_size: number;
  created_at: Date;
}

export interface DBRuleVersion {
  income_cap_annual: number;
  max_occupancy: number;
  asset_imputation_threshold: number; // e.g., 5000
  passbook_rate: number; // e.g., 0.0006 for 0.06%
}

export interface DBApplicationData {
  applicationId: number;
  applicationVersion: number;
  submittedAt: Date | null;
  householdMembers: DBHouseholdMember[];
  incomeSources: DBIncomeSource[];
  assets: DBAsset[];
  screeningResult: DBScreeningResult;
  ruleVersion: DBRuleVersion;
}

/**
 * Map database relationship values to CTCAC single-letter codes
 */
function mapRelationshipCode(dbRelationship: string): RelationshipCode {
  const mapping: Record<string, RelationshipCode> = {
    applicant: 'H', // Head of household
    spouse: 'S',    // Spouse
    adult: 'A',     // Other adult
    child: 'C',     // Child
    'live-in aide': 'L',
    'foster child': 'F',
    other: 'O',
    none: 'N',
  };

  const normalized = dbRelationship.toLowerCase().trim();
  return mapping[normalized] || 'O'; // Default to 'Other' if unknown
}

/**
 * Adapt database application data to TIC fill input.
 * Uses pre-calculated values from screening_results table.
 */
export function adaptApplicationToTIC(data: DBApplicationData): TICFillInput {
  // Map household members
  const householdMembers: TICHouseholdMember[] = data.householdMembers.map(
    (member, index) => {
      // Parse name (assuming "First Last" format, or just use full name)
      const nameParts = member.name.trim().split(/\s+/);
      const firstName = nameParts[0] || 'Unknown';
      const lastName = nameParts.length > 1 ? (nameParts[nameParts.length - 1] || 'Unknown') : 'Unknown';
      const middleInitial =
        nameParts.length > 2 ? nameParts[1]?.charAt(0).toUpperCase() : undefined;

      // Student status
      let studentStatus: StudentStatus = 'NA';
      if (member.is_full_time_student) {
        studentStatus = 'FT';
        // Note: We don't have part-time tracking yet; assume FT or NA
      }

      // Student exemption code (only for FT students)
      let studentExemptionCode: StudentExemptionCode | undefined;
      if (
        member.is_full_time_student &&
        member.student_exemption_type &&
        ['1', '2', '3', '4', '5'].includes(member.student_exemption_type)
      ) {
        studentExemptionCode = member.student_exemption_type as StudentExemptionCode;
      }

      // Format date of birth as MM/DD/YYYY (timezone-safe)
      // Parse ISO date string (YYYY-MM-DD) using component extraction, not Date constructor
      const isoRegex = /^(\d{4})-(\d{2})-(\d{2})$/;
      const dobMatch = member.date_of_birth.match(isoRegex);
      if (!dobMatch) {
        throw new Error(`Invalid date format for member ${member.name}: ${member.date_of_birth}`);
      }
      const year = parseInt(dobMatch[1] ?? '0');
      const month = parseInt(dobMatch[2] ?? '1');
      const day = parseInt(dobMatch[3] ?? '1');
      const dateOfBirth = `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}/${year}`;

      // Calculate age to determine if SSN is required (using local timezone construction)
      const dob = new Date(year, month - 1, day);
      const age = Math.floor(
        (Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
      );

      // Per CTCAC: use 0000 for members under 15 or when genuinely unavailable
      const ssnLast4 = age < 15 ? '0000' : (member.ssn_last_4 || '0000');

      return {
        lastName,
        firstName,
        middleInitial,
        relationship: mapRelationshipCode(member.relationship),
        dateOfBirth,
        studentStatus,
        ssnLast4,
        studentExemptionCode,
      };
    }
  );

  // Map income sources - group by household member for Part III rows
  // Note: TIC Part III is NOT per-member-per-source, but aggregated by category
  // We need to create income rows that sum sources by type
  const incomeSourcesByMember = new Map<number, DBIncomeSource[]>();
  data.incomeSources.forEach((source) => {
    const existing = incomeSourcesByMember.get(source.household_member_id) || [];
    existing.push(source);
    incomeSourcesByMember.set(source.household_member_id, existing);
  });

  const incomeSources: TICIncomeSource[] = [];
  data.householdMembers.forEach((member, index) => {
    const memberSources = incomeSourcesByMember.get(member.id) || [];
    if (memberSources.length === 0) return;

    // Aggregate by income category (A, B, C, D)
    let employmentWages = 0;
    let socSecurityPensions = 0;
    let publicAssistance = 0;
    let otherIncome = 0;

    memberSources.forEach((source) => {
      const annual = source.annual_amount; // Already converted by submit route

      // Map source types to TIC columns
      const sourceType = source.source_type.toLowerCase();
      if (
        sourceType.includes('employment') ||
        sourceType.includes('wage') ||
        sourceType.includes('salary')
      ) {
        employmentWages += annual;
      } else if (
        sourceType.includes('social_security') ||
        sourceType.includes('pension') ||
        sourceType.includes('retirement')
      ) {
        socSecurityPensions += annual;
      } else if (
        sourceType.includes('public_assistance') ||
        sourceType.includes('tanf') ||
        sourceType.includes('disability')
      ) {
        publicAssistance += annual;
      } else {
        otherIncome += annual;
      }
    });

    // Only create a row if there's actual income
    if (
      employmentWages > 0 ||
      socSecurityPensions > 0 ||
      publicAssistance > 0 ||
      otherIncome > 0
    ) {
      incomeSources.push({
        householdMemberNumber: index + 1, // 1-indexed
        employmentWages: employmentWages > 0 ? employmentWages : undefined,
        socSecurityPensions: socSecurityPensions > 0 ? socSecurityPensions : undefined,
        publicAssistance: publicAssistance > 0 ? publicAssistance : undefined,
        otherIncome: otherIncome > 0 ? otherIncome : undefined,
      });
    }
  });

  // Map assets
  const assets: TICAsset[] = data.assets.map((asset, index) => {
    // Find which household member this asset belongs to
    const memberIndex = data.householdMembers.findIndex((m) => m.id === asset.household_member_id);
    const householdMemberNumber = memberIndex >= 0 ? memberIndex + 1 : 1;

    return {
      householdMemberNumber,
      type: formatAssetType(asset.asset_type),
      cashValue: asset.cash_value,
      annualIncome: asset.annual_income,
      currentOrImputed: 'C', // All current assets for now; imputed would be for disposed assets
    };
  });

  // Calculate asset totals and imputation from screening result
  const totalAssetCashValue = assets.reduce((sum, a) => sum + a.cashValue, 0);
  const totalAssetAnnualIncome = assets.reduce((sum, a) => sum + a.annualIncome, 0);

  const assetCalculations: TICAssetCalculations = {
    totalCashValue: totalAssetCashValue,
    totalAnnualIncome: totalAssetAnnualIncome,
    passbackRate: data.ruleVersion.passbook_rate,
    imputedIncome: data.screeningResult.imputed_asset_income, // From rules engine
    totalIncomeFromAssets:
      data.screeningResult.imputed_asset_income != null
        ? Math.max(totalAssetAnnualIncome, data.screeningResult.imputed_asset_income)
        : totalAssetAnnualIncome,
  };

  // Student status for Part VII
  const allFullTimeStudents = data.householdMembers.every((m) => m.is_full_time_student);
  const firstExemptionCode = data.householdMembers.find(
    (m) => m.student_exemption_type && ['1', '2', '3', '4', '5'].includes(m.student_exemption_type)
  )?.student_exemption_type as StudentExemptionCode | undefined;

  const studentStatus: TICStudentStatus = {
    allFullTimeStudents,
    exemptionCode: allFullTimeStudents ? firstExemptionCode : undefined,
  };

  // Total income from Part III (E) - sum of all income sources, NO assets
  const totalIncome = incomeSources.reduce((sum, source) => {
    return sum +
      (source.employmentWages || 0) +
      (source.socSecurityPensions || 0) +
      (source.publicAssistance || 0) +
      (source.otherIncome || 0);
  }, 0);

  // Total annual income (L) = (E) + (K)
  const totalAnnualIncome = totalIncome + assetCalculations.totalIncomeFromAssets;

  // Format dates
  const submittedAt = data.submittedAt || new Date();
  const effectiveDate = `${String(submittedAt.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(submittedAt.getDate()).padStart(2, '0')}-${submittedAt.getFullYear()}`;
  const moveInDate = effectiveDate; // Same as effective date for now

  return {
    applicationId: data.applicationId,
    applicationVersion: data.applicationVersion,
    effectiveDate,
    moveInDate,
    householdMembers,
    incomeSources,
    totalIncome, // (E) from rules engine
    assets,
    assetCalculations,
    studentStatus,
    totalAnnualIncome, // (L) = (E) + (K)
  };
}

/**
 * Format asset type for display on TIC form
 */
function formatAssetType(type: string): string {
  const formatted: Record<string, string> = {
    checking: 'Checking Account',
    savings: 'Savings Account',
    stocks: 'Stocks/Bonds',
    retirement: 'Retirement Account',
    other: 'Other Asset',
  };

  return formatted[type.toLowerCase()] || type;
}
