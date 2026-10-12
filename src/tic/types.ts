/**
 * TIC FORM FILL INPUT TYPES
 *
 * These types define the shape of verified application data that will be
 * used to fill the TIC form. All values come from the canonical rules engine
 * output — we NEVER recalculate in the PDF layer.
 */

import type { StudentExemptionCode } from './field-map';

/**
 * Relationship codes from TIC Part II
 */
export type RelationshipCode = 'H' | 'S' | 'A' | 'C' | 'L' | 'F' | 'O' | 'N' | 'U';

/**
 * Student status values
 */
export type StudentStatus = 'FT' | 'PT' | 'NA';

/**
 * Household member for Part II
 */
export interface TICHouseholdMember {
  lastName: string;
  firstName: string;
  middleInitial?: string;
  relationship: RelationshipCode; // HEAD for member 1
  dateOfBirth: string; // MM/DD/YYYY format
  studentStatus: StudentStatus;
  ssnLast4: string; // 4 digits or "0000" if not provided
  studentExemptionCode?: StudentExemptionCode; // Only when studentStatus='FT' and all household is FT
}

/**
 * Income source for Part III
 * NOTE: Amounts must be ANNUAL (already converted from hourly/weekly/etc)
 */
export interface TICIncomeSource {
  householdMemberNumber: number; // 1-7
  employmentWages?: number; // Column A
  socSecurityPensions?: number; // Column B
  publicAssistance?: number; // Column C
  otherIncome?: number; // Column D
}

/**
 * Asset for Part IV
 */
export interface TICAsset {
  householdMemberNumber: number; // 1-7
  type: string; // e.g., "Savings Account", "Checking Account"
  cashValue: number; // Column H
  annualIncome: number; // Column I - actual annual income from this asset
  currentOrImputed: 'C' | 'I'; // Column G - C=Current, I=Imputed (for disposed assets)
}

/**
 * Asset calculation results from rules engine
 * These are PRE-CALCULATED — never compute in PDF layer
 */
export interface TICAssetCalculations {
  totalCashValue: number; // Sum of column H
  totalAnnualIncome: number; // Sum of column I
  passbackRate: number; // e.g., 0.0006 for 0.06%
  imputedIncome: number | null; // (J) Only if totalCashValue > $5000; otherwise null
  totalIncomeFromAssets: number; // (K) Greater of totalAnnualIncome or imputedIncome
}

/**
 * Student household status for Part VII
 */
export interface TICStudentStatus {
  allFullTimeStudents: boolean;
  // If allFullTimeStudents=true, at least one member must have an exemption
  // The exemption code comes from the member's studentExemptionCode field
  // We fill the first valid exemption code we find
  exemptionCode?: StudentExemptionCode;
}

/**
 * Complete TIC fill input
 * This is the verified, pre-calculated data from a specific application version
 */
export interface TICFillInput {
  // Application metadata
  applicationId: number;
  applicationVersion: number; // Which version this PDF represents
  effectiveDate: string; // MM-DD-YYYY
  moveInDate: string; // MM-DD-YYYY

  // Part II - Household Composition
  householdMembers: TICHouseholdMember[]; // Up to 7; overflow handled separately

  // Part III - Income
  incomeSources: TICIncomeSource[]; // Up to 5; overflow handled separately
  totalIncome: number; // (E) Pre-calculated sum of all income

  // Part IV - Assets
  assets: TICAsset[]; // Up to 5; overflow handled separately
  assetCalculations: TICAssetCalculations;

  // Part VII - Student Status
  studentStatus: TICStudentStatus;

  // Total (L) from rules engine
  totalAnnualIncome: number; // (E) + (K)
}

/**
 * Result of filling the TIC form
 */
export interface TICFillResult {
  pdfBytes: Uint8Array; // The filled PDF
  overflow: {
    hasOverflow: boolean;
    householdMembersExcluded: number;
    incomeSourcesExcluded: number;
    assetsExcluded: number;
    message?: string; // Combined overflow warning for reviewer
  };
  metadata: {
    applicationId: number;
    applicationVersion: number;
    filledAt: Date;
    filledBy: string; // System identifier
  };
}
