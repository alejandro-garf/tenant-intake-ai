/**
 * TIC FORM OVERFLOW DETECTION
 *
 * The TIC form has hard limits:
 * - Part II: 7 household members
 * - Part III: 5 income rows (not per-member, but total across all members)
 * - Part IV: 5 asset rows (not per-member, but total across all members)
 *
 * When data exceeds these limits, we MUST:
 * 1. Fill the available rows (first N entries)
 * 2. Flag the overflow condition with exact counts
 * 3. Surface the overflow to the reviewer UI
 * 4. NEVER silently drop data
 */

export interface OverflowCondition {
  section: 'household' | 'income' | 'assets';
  limit: number;
  actual: number;
  overflow: number; // How many entries didn't fit
  message: string;
}

export interface TICOverflowResult {
  hasOverflow: boolean;
  conditions: OverflowCondition[];
}

/**
 * Check for overflow conditions in application data.
 */
export function detectOverflow(input: {
  householdMemberCount: number;
  incomeSourceCount: number;
  assetCount: number;
}): TICOverflowResult {
  const conditions: OverflowCondition[] = [];

  // Part II: Household composition (7 member limit)
  if (input.householdMemberCount > 7) {
    conditions.push({
      section: 'household',
      limit: 7,
      actual: input.householdMemberCount,
      overflow: input.householdMemberCount - 7,
      message: `Household has ${input.householdMemberCount} members, but TIC form supports only 7. ${
        input.householdMemberCount - 7
      } member(s) not included in PDF. Attach additional sheet with remaining members.`,
    });
  }

  // Part III: Income sources (5 row limit)
  if (input.incomeSourceCount > 5) {
    conditions.push({
      section: 'income',
      limit: 5,
      actual: input.incomeSourceCount,
      overflow: input.incomeSourceCount - 5,
      message: `Application has ${input.incomeSourceCount} income sources, but TIC form supports only 5. ${
        input.incomeSourceCount - 5
      } income source(s) not included in PDF. Attach additional sheet with remaining income sources.`,
    });
  }

  // Part IV: Assets (5 row limit)
  if (input.assetCount > 5) {
    conditions.push({
      section: 'assets',
      limit: 5,
      actual: input.assetCount,
      overflow: input.assetCount - 5,
      message: `Application has ${input.assetCount} assets, but TIC form supports only 5. ${
        input.assetCount - 5
      } asset(s) not included in PDF. Attach additional sheet with remaining assets.`,
    });
  }

  return {
    hasOverflow: conditions.length > 0,
    conditions,
  };
}

/**
 * Get overflow entries that didn't fit in the form.
 * Returns the entries that were excluded (beyond the limit).
 */
export function getOverflowEntries<T>(entries: T[], limit: number): T[] {
  if (entries.length <= limit) return [];
  return entries.slice(limit);
}

/**
 * Get entries that fit within the form limit.
 */
export function getFittingEntries<T>(entries: T[], limit: number): T[] {
  return entries.slice(0, limit);
}
