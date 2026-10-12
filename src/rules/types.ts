// Types for the deterministic rules engine
// No LLM, no randomness, no network calls

export interface RuleConfig {
  incomeCapAnnual: number;
  maxOccupancy: number;
  passbookRate: number; // CTCAC TIC April 2021, Part IV: 0.0006 for 0.06%
  assetThreshold: number;
}

export interface HouseholdMember {
  name: string;
  dateOfBirth: Date;
  relationship: string;
  isFullTimeStudent: boolean;
  studentExemptionType?: StudentExemption;
  incomeSources: IncomeSource[];
  assets: Asset[];
}

export interface IncomeSource {
  sourceType: string;
  annualAmount: number;
}

export interface Asset {
  assetType: string;
  cashValue: number;
  annualIncome: number;
}

// CTCAC TIC Part VII: Five specific student exemptions (April 2021)
// Each exemption corresponds to a numbered code (1-5) required on the TIC form
export type StudentExemption =
  | "receives_assistance_tanf"    // Code 1: AFDC/TANF Assistance
  | "enrolled_job_training"        // Code 2: Job Training Program
  | "single_parent_with_child"     // Code 3: Single Parent/Dependent Child
  | "married_filing_jointly"       // Code 4: Married/Joint Return
  | "former_foster_care";          // Code 5: Former Foster Care

export const STUDENT_EXEMPTION_CODES: Record<StudentExemption, number> = {
  receives_assistance_tanf: 1,
  enrolled_job_training: 2,
  single_parent_with_child: 3,
  married_filing_jointly: 4,
  former_foster_care: 5,
};

export interface ScreeningInput {
  household: HouseholdMember[];
  ruleConfig: RuleConfig;
}

export interface ScreeningResult {
  passed: boolean;
  failureReasons: string[];
  grossIncome: number;
  imputedAssetIncome: number | null;
  householdSize: number;
}

export interface RuleViolation {
  rule: string;
  reason: string;
}
