/**
 * Deterministic rules engine for LIHTC / CTCAC tenant screening.
 * Pure TypeScript — NO LLM, NO randomness, NO network calls in the rules path.
 *
 * Golden Rules:
 * - Extraction proposes, rules calculate, a human decides.
 * - Thresholds live in versioned configuration, never hardcoded.
 * - Rules compose and surface ALL failure reasons, not just the first.
 */

import type {
  ScreeningInput,
  ScreeningResult,
  RuleViolation,
  HouseholdMember,
  RuleConfig,
} from "./types";

/**
 * Main screening function: runs all rules and composes results.
 */
export function screenApplication(input: ScreeningInput): ScreeningResult {
  const violations: RuleViolation[] = [];
  const { household, ruleConfig } = input;

  // Calculate gross income and imputed asset income
  const grossIncome = calculateGrossIncome(household);
  const imputedAssetIncome = calculateImputedAssetIncome(
    household,
    ruleConfig
  );
  const totalIncome = grossIncome + (imputedAssetIncome ?? 0);
  const householdSize = household.length;

  // Rule 1: Income cap
  if (totalIncome > ruleConfig.incomeCapAnnual) {
    violations.push({
      rule: "income_cap",
      reason: `Gross income $${totalIncome.toFixed(
        2
      )} exceeds cap of $${ruleConfig.incomeCapAnnual.toFixed(2)}`,
    });
  }

  // Rule 2: Occupancy limits
  if (householdSize > ruleConfig.maxOccupancy) {
    violations.push({
      rule: "occupancy",
      reason: `Household size ${householdSize} exceeds maximum occupancy of ${ruleConfig.maxOccupancy}`,
    });
  }

  // Rule 3: Full-time student rule (TIC Part VII)
  const studentViolation = checkFullTimeStudentRule(household);
  if (studentViolation) {
    violations.push(studentViolation);
  }

  return {
    passed: violations.length === 0,
    failureReasons: violations.map((v) => v.reason),
    grossIncome,
    imputedAssetIncome,
    householdSize,
  };
}

/**
 * Calculate total gross income from all household members' income sources.
 */
export function calculateGrossIncome(household: HouseholdMember[]): number {
  return household.reduce((total, member) => {
    const memberIncome = member.incomeSources.reduce(
      (sum, source) => sum + source.annualAmount,
      0
    );
    return total + memberIncome;
  }, 0);
}

/**
 * CTCAC TIC Part IV: Asset imputation (April 2021)
 * When total asset cash value exceeds the threshold, compute imputed income
 * at the passbook rate (0.06%), compare against actual asset income, and add the
 * GREATER of the two to gross income.
 *
 * Returns imputed income if threshold exceeded, otherwise null.
 */
export function calculateImputedAssetIncome(
  household: HouseholdMember[],
  config: RuleConfig
): number | null {
  const totalAssetValue = household.reduce((total, member) => {
    const memberAssets = member.assets.reduce(
      (sum, asset) => sum + asset.cashValue,
      0
    );
    return total + memberAssets;
  }, 0);

  // Only apply imputation if total assets exceed threshold
  if (totalAssetValue <= config.assetThreshold) {
    return null;
  }

  // Calculate imputed income at passbook rate
  const imputedIncome = totalAssetValue * config.passbookRate;

  // Calculate actual asset income
  const actualAssetIncome = household.reduce((total, member) => {
    const memberAssetIncome = member.assets.reduce(
      (sum, asset) => sum + asset.annualIncome,
      0
    );
    return total + memberAssetIncome;
  }, 0);

  // Return the GREATER of imputed vs actual
  return Math.max(imputedIncome, actualAssetIncome);
}

/**
 * CTCAC TIC Part VII: Full-time student rule (April 2021)
 * Households where all members are full-time students are ineligible
 * UNLESS at least one member qualifies for one of the five exemptions:
 *
 * 1. receives_assistance_tanf (AFDC/TANF Assistance)
 * 2. enrolled_job_training (Job Training Program)
 * 3. single_parent_with_child (Single Parent/Dependent Child)
 * 4. married_filing_jointly (Married/Joint Return)
 * 5. former_foster_care (Former Foster Care)
 */
export function checkFullTimeStudentRule(
  household: HouseholdMember[]
): RuleViolation | null {
  if (household.length === 0) {
    return null;
  }

  const allStudents = household.every((m) => m.isFullTimeStudent);

  if (!allStudents) {
    // Not all members are students, rule doesn't apply
    return null;
  }

  // All members are students — check for exemptions
  const hasExemption = household.some((m) => m.studentExemptionType != null);

  if (!hasExemption) {
    return {
      rule: "full_time_student",
      reason:
        "All household members are full-time students with no qualifying exemption (TIC Part VII)",
    };
  }

  // At least one member has an exemption, household passes
  return null;
}
