// Income calculation utilities
// Pure functions for converting income frequencies to annual amounts

import type { IncomeFrequency } from "@/app/apply/types";

/**
 * Convert income amount from given frequency to annual dollars.
 *
 * Conversion factors:
 * - hourly: × 2080 (40 hours/week × 52 weeks)
 * - weekly: × 52
 * - biweekly: × 26 (every two weeks)
 * - semimonthly: × 24 (twice a month, 24 pay periods)
 * - monthly: × 12
 * - annually: × 1
 */
export function convertToAnnual(
  amount: number,
  frequency: IncomeFrequency
): number {
  switch (frequency) {
    case "hourly":
      return amount * 2080;
    case "weekly":
      return amount * 52;
    case "biweekly":
      return amount * 26;
    case "semimonthly":
      return amount * 24;
    case "monthly":
      return amount * 12;
    case "annually":
      return amount;
    default:
      // TypeScript exhaustiveness check
      const _exhaustive: never = frequency;
      throw new Error(`Unknown frequency: ${_exhaustive}`);
  }
}
