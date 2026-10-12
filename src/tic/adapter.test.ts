import { describe, it, expect } from 'vitest';
import { adaptApplicationToTIC, type DBApplicationData } from './adapter';

describe('TIC Data Adapter', () => {
  it('calculates (E) as income-only sum without asset income', () => {
    const testData: DBApplicationData = {
      applicationId: 1,
      applicationVersion: 1,
      submittedAt: new Date('2026-01-15'),
      householdMembers: [
        {
          id: 1,
          name: 'Jane Smith',
          date_of_birth: '1985-03-15',
          relationship: 'applicant',
          is_full_time_student: false,
          ssn_last_4: '1234',
          student_exemption_type: null,
        },
      ],
      incomeSources: [
        {
          id: 1,
          household_member_id: 1,
          source_type: 'employment',
          amount: 3500,
          frequency: 'monthly',
          annual_amount: 42000,
        },
        {
          id: 2,
          household_member_id: 1,
          source_type: 'social_security',
          amount: 500,
          frequency: 'monthly',
          annual_amount: 6000,
        },
      ],
      assets: [
        {
          id: 1,
          household_member_id: 1,
          asset_type: 'savings',
          cash_value: 6500,
          annual_income: 25,
        },
      ],
      screeningResult: {
        passed: false,
        failure_reasons: ['Gross income exceeds cap'],
        gross_income: 48025, // This includes asset income - should NOT be used for (E)
        imputed_asset_income: 3.90,
        household_size: 1,
        created_at: new Date(),
      },
      ruleVersion: {
        income_cap_annual: 50000,
        max_occupancy: 8,
        asset_imputation_threshold: 5000,
        passbook_rate: 0.0006,
      },
    };

    const result = adaptApplicationToTIC(testData);

    // (E) Total Income should be sum of income sources ONLY (42,000 + 6,000 = 48,000)
    expect(result.totalIncome).toBe(48000);

    // Asset calculations
    expect(result.assetCalculations.totalCashValue).toBe(6500);
    expect(result.assetCalculations.totalAnnualIncome).toBe(25);
    expect(result.assetCalculations.imputedIncome).toBe(3.90);
    // (K) should be max(25, 3.90) = 25
    expect(result.assetCalculations.totalIncomeFromAssets).toBe(25);

    // (L) Total Annual Income should be (E) + (K) = 48,000 + 25 = 48,025
    expect(result.totalAnnualIncome).toBe(48025);

    // Verify income sources sum matches totalIncome
    const incomeSum = result.incomeSources.reduce((sum, source) => {
      return sum +
        (source.employmentWages || 0) +
        (source.socSecurityPensions || 0) +
        (source.publicAssistance || 0) +
        (source.otherIncome || 0);
    }, 0);
    expect(incomeSum).toBe(result.totalIncome);

    // Verify (L) = (E) + (K) with no double-counting
    expect(result.totalAnnualIncome).toBe(
      result.totalIncome + result.assetCalculations.totalIncomeFromAssets
    );
  });

  it('maps database relationship values to CTCAC single-letter codes', () => {
    const testData: DBApplicationData = {
      applicationId: 1,
      applicationVersion: 1,
      submittedAt: new Date('2026-01-15'),
      householdMembers: [
        {
          id: 1,
          name: 'Jane Smith',
          date_of_birth: '1985-03-15',
          relationship: 'applicant',
          is_full_time_student: false,
          ssn_last_4: '1234',
          student_exemption_type: null,
        },
        {
          id: 2,
          name: 'John Smith',
          date_of_birth: '1983-07-22',
          relationship: 'spouse',
          is_full_time_student: false,
          ssn_last_4: '5678',
          student_exemption_type: null,
        },
        {
          id: 3,
          name: 'Emma Smith',
          date_of_birth: '2010-11-05',
          relationship: 'child',
          is_full_time_student: false,
          ssn_last_4: null,
          student_exemption_type: null,
        },
      ],
      incomeSources: [],
      assets: [],
      screeningResult: {
        passed: true,
        failure_reasons: null,
        gross_income: 0,
        imputed_asset_income: null,
        household_size: 3,
        created_at: new Date(),
      },
      ruleVersion: {
        income_cap_annual: 50000,
        max_occupancy: 8,
        asset_imputation_threshold: 5000,
        passbook_rate: 0.0006,
      },
    };

    const result = adaptApplicationToTIC(testData);

    // CTCAC Part II requires single-letter codes
    expect(result.householdMembers[0]?.relationship).toBe('H'); // Head of household
    expect(result.householdMembers[1]?.relationship).toBe('S'); // Spouse
    expect(result.householdMembers[2]?.relationship).toBe('C'); // Child
  });
});
