// Application draft types for the intake flow

// CTCAC TIC Part VII: Five specific student exemptions (April 2021)
export type StudentExemption =
  | "receives_assistance_tanf"    // Code 1: AFDC/TANF Assistance
  | "enrolled_job_training"        // Code 2: Job Training Program
  | "single_parent_with_child"     // Code 3: Single Parent/Dependent Child
  | "married_filing_jointly"       // Code 4: Married/Joint Return
  | "former_foster_care";          // Code 5: Former Foster Care

export interface HouseholdMemberDraft {
  id: string; // client-side UUID for tracking
  name: string;
  dateOfBirth: string; // ISO date string
  relationship: string;
  isFullTimeStudent: boolean;
  studentExemptionType?: StudentExemption;
  ssnLast4?: string; // SENSITIVE: Last 4 digits only, required for members 15+
}

export type IncomeSourceType =
  | "employment"
  | "social_security"
  | "pension"
  | "tanf"
  | "child_support"
  | "other";

export type IncomeFrequency =
  | "hourly"
  | "weekly"
  | "biweekly"
  | "semimonthly"
  | "monthly"
  | "annually";

export interface IncomeSourceDraft {
  id: string; // client-side UUID for tracking
  householdMemberId: string; // references HouseholdMemberDraft.id
  sourceType: IncomeSourceType;
  employerPayerName?: string; // optional, e.g., employer name or "Social Security Administration"
  amount: number;
  frequency: IncomeFrequency;
}

export type AssetType =
  | "checking"
  | "savings"
  | "cd"
  | "stocks_bonds"
  | "real_property"
  | "retirement_account"
  | "other";

export interface AssetDraft {
  id: string; // client-side UUID for tracking
  householdMemberId: string; // references HouseholdMemberDraft.id
  assetType: AssetType;
  cashValue: number;
  annualIncome: number; // actual annual income from the asset
}

export interface ApplicationDraft {
  id?: number; // DB id if saved
  propertyId?: string;
  household: HouseholdMemberDraft[];
  incomeSources: IncomeSourceDraft[];
  assets: AssetDraft[];
}

export interface SaveDraftResponse {
  id: number;
  message: string;
}
