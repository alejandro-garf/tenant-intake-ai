/**
 * Adapter to convert flat draft/DB structure to nested rules engine input.
 *
 * The canonical rules engine (src/rules/engine.ts) expects a nested structure
 * where household members contain their own income sources and assets.
 * The UI and database use a flat structure with foreign key references.
 *
 * This adapter bridges the gap, ensuring all data transformations happen
 * BEFORE the pure rules engine runs.
 */

import type { HouseholdMember, IncomeSource, Asset } from "./types";
import type {
  HouseholdMemberDraft,
  IncomeSourceDraft,
  AssetDraft,
} from "@/app/apply/types";
import { convertToAnnual } from "@/lib/income";

export interface FlatScreeningInput {
  household: HouseholdMemberDraft[];
  incomeSources: IncomeSourceDraft[];
  assets: AssetDraft[];
}

/**
 * Convert flat draft structure to nested engine structure.
 * - Normalizes income amounts to annual (calls convertToAnnual)
 * - Groups income sources and assets under their respective household members
 * - Converts date strings to Date objects
 */
export function adaptDraftToEngineInput(
  flat: FlatScreeningInput
): HouseholdMember[] {
  return flat.household.map((member) => {
    // Find all income sources for this member and convert to annual
    const incomeSources: IncomeSource[] = flat.incomeSources
      .filter((source) => source.householdMemberId === member.id)
      .map((source) => ({
        sourceType: source.sourceType,
        annualAmount: convertToAnnual(source.amount, source.frequency),
      }));

    // Find all assets for this member
    const assets: Asset[] = flat.assets
      .filter((asset) => asset.householdMemberId === member.id)
      .map((asset) => ({
        assetType: asset.assetType,
        cashValue: asset.cashValue,
        annualIncome: asset.annualIncome,
      }));

    // Parse dateOfBirth using local timezone construction (not UTC)
    // member.dateOfBirth is an ISO date string (YYYY-MM-DD)
    const isoRegex = /^(\d{4})-(\d{2})-(\d{2})$/;
    const dobMatch = member.dateOfBirth.match(isoRegex);
    if (!dobMatch) {
      throw new Error(`Invalid date format for member ${member.name}: ${member.dateOfBirth}`);
    }
    const year = parseInt(dobMatch[1] ?? '0');
    const month = parseInt(dobMatch[2] ?? '1') - 1; // 0-indexed for Date constructor
    const day = parseInt(dobMatch[3] ?? '1');
    const dateOfBirth = new Date(year, month, day);

    return {
      name: member.name,
      dateOfBirth,
      relationship: member.relationship,
      isFullTimeStudent: member.isFullTimeStudent,
      studentExemptionType: member.studentExemptionType,
      incomeSources,
      assets,
    };
  });
}
