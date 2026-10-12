/**
 * Demographics module: ISOLATED for HERA reporting ONLY
 *
 * Golden Rule 4: This module must NEVER be imported, joined, or referenced by:
 *   - rules engine (src/rules)
 *   - decision views
 *   - waitlist ordering
 *
 * Any such reference is a bug and violates fair housing requirements.
 */

export interface DemographicData {
  applicationId: number;
  race?: string;
  ethnicity?: string;
  householdIncomeRange?: string;
}

export function recordDemographics(data: DemographicData): void {
  // Placeholder: would save to isolated demographics table
  console.log("Demographics recorded (isolated, HERA reporting only):", data);
}
