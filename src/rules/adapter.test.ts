import { describe, it, expect } from "vitest";
import { adaptDraftToEngineInput } from "./adapter";
import type { FlatScreeningInput } from "./adapter";

describe("adaptDraftToEngineInput", () => {
  it("should convert flat structure to nested structure", () => {
    const flat: FlatScreeningInput = {
      household: [
        {
          id: "m1",
          name: "Alice",
          dateOfBirth: "1990-01-01",
          relationship: "applicant",
          isFullTimeStudent: false,
        },
        {
          id: "m2",
          name: "Bob",
          dateOfBirth: "1992-05-15",
          relationship: "spouse",
          isFullTimeStudent: false,
        },
      ],
      incomeSources: [
        {
          id: "i1",
          householdMemberId: "m1",
          sourceType: "employment",
          amount: 3000,
          frequency: "monthly",
        },
        {
          id: "i2",
          householdMemberId: "m2",
          sourceType: "employment",
          amount: 20,
          frequency: "hourly",
        },
      ],
      assets: [
        {
          id: "a1",
          householdMemberId: "m1",
          assetType: "checking",
          cashValue: 2000,
          annualIncome: 20,
        },
      ],
    };

    const result = adaptDraftToEngineInput(flat);

    expect(result).toHaveLength(2);

    // First member
    expect(result[0]?.name).toBe("Alice");
    // Use local timezone construction for date comparison (not UTC)
    expect(result[0]?.dateOfBirth).toEqual(new Date(1990, 0, 1));
    expect(result[0]?.relationship).toBe("applicant");
    expect(result[0]?.isFullTimeStudent).toBe(false);
    expect(result[0]?.incomeSources).toHaveLength(1);
    expect(result[0]?.incomeSources[0]?.sourceType).toBe("employment");
    expect(result[0]?.incomeSources[0]?.annualAmount).toBe(36000); // 3000 × 12
    expect(result[0]?.assets).toHaveLength(1);
    expect(result[0]?.assets[0]?.assetType).toBe("checking");
    expect(result[0]?.assets[0]?.cashValue).toBe(2000);

    // Second member
    expect(result[1]?.name).toBe("Bob");
    expect(result[1]?.incomeSources).toHaveLength(1);
    expect(result[1]?.incomeSources[0]?.annualAmount).toBe(41600); // 20 × 2080
    expect(result[1]?.assets).toHaveLength(0);
  });

  it("should handle members with no income or assets", () => {
    const flat: FlatScreeningInput = {
      household: [
        {
          id: "m1",
          name: "Alice",
          dateOfBirth: "1990-01-01",
          relationship: "applicant",
          isFullTimeStudent: false,
        },
      ],
      incomeSources: [],
      assets: [],
    };

    const result = adaptDraftToEngineInput(flat);

    expect(result).toHaveLength(1);
    expect(result[0]?.incomeSources).toHaveLength(0);
    expect(result[0]?.assets).toHaveLength(0);
  });

  it("should preserve student exemption type", () => {
    const flat: FlatScreeningInput = {
      household: [
        {
          id: "m1",
          name: "Student",
          dateOfBirth: "2000-01-01",
          relationship: "applicant",
          isFullTimeStudent: true,
          studentExemptionType: "single_parent_with_child",
        },
      ],
      incomeSources: [],
      assets: [],
    };

    const result = adaptDraftToEngineInput(flat);

    expect(result[0]?.studentExemptionType).toBe("single_parent_with_child");
  });

  it("should handle undefined student exemption type", () => {
    const flat: FlatScreeningInput = {
      household: [
        {
          id: "m1",
          name: "Student",
          dateOfBirth: "2000-01-01",
          relationship: "applicant",
          isFullTimeStudent: true,
        },
      ],
      incomeSources: [],
      assets: [],
    };

    const result = adaptDraftToEngineInput(flat);

    expect(result[0]?.studentExemptionType).toBeUndefined();
  });

  it("should correctly map multiple income sources to correct members", () => {
    const flat: FlatScreeningInput = {
      household: [
        {
          id: "m1",
          name: "Alice",
          dateOfBirth: "1990-01-01",
          relationship: "applicant",
          isFullTimeStudent: false,
        },
        {
          id: "m2",
          name: "Bob",
          dateOfBirth: "1992-05-15",
          relationship: "spouse",
          isFullTimeStudent: false,
        },
      ],
      incomeSources: [
        {
          id: "i1",
          householdMemberId: "m1",
          sourceType: "employment",
          amount: 2000,
          frequency: "monthly",
        },
        {
          id: "i2",
          householdMemberId: "m1",
          sourceType: "social_security",
          amount: 500,
          frequency: "monthly",
        },
        {
          id: "i3",
          householdMemberId: "m2",
          sourceType: "employment",
          amount: 1500,
          frequency: "monthly",
        },
      ],
      assets: [],
    };

    const result = adaptDraftToEngineInput(flat);

    expect(result[0]?.incomeSources).toHaveLength(2);
    expect(result[0]?.incomeSources[0]?.annualAmount).toBe(24000);
    expect(result[0]?.incomeSources[1]?.annualAmount).toBe(6000);
    expect(result[1]?.incomeSources).toHaveLength(1);
    expect(result[1]?.incomeSources[0]?.annualAmount).toBe(18000);
  });

  it("should handle biweekly vs semimonthly conversion correctly", () => {
    const flat: FlatScreeningInput = {
      household: [
        {
          id: "m1",
          name: "Biweekly Worker",
          dateOfBirth: "1990-01-01",
          relationship: "applicant",
          isFullTimeStudent: false,
        },
        {
          id: "m2",
          name: "Semimonthly Worker",
          dateOfBirth: "1992-01-01",
          relationship: "spouse",
          isFullTimeStudent: false,
        },
      ],
      incomeSources: [
        {
          id: "i1",
          householdMemberId: "m1",
          sourceType: "employment",
          amount: 2000,
          frequency: "biweekly",
        },
        {
          id: "i2",
          householdMemberId: "m2",
          sourceType: "employment",
          amount: 2000,
          frequency: "semimonthly",
        },
      ],
      assets: [],
    };

    const result = adaptDraftToEngineInput(flat);

    // Biweekly: 2000 × 26 = 52000
    expect(result[0]?.incomeSources[0]?.annualAmount).toBe(52000);

    // Semimonthly: 2000 × 24 = 48000
    expect(result[1]?.incomeSources[0]?.annualAmount).toBe(48000);
  });

  it("should handle multiple assets for the same member", () => {
    const flat: FlatScreeningInput = {
      household: [
        {
          id: "m1",
          name: "Alice",
          dateOfBirth: "1990-01-01",
          relationship: "applicant",
          isFullTimeStudent: false,
        },
      ],
      incomeSources: [],
      assets: [
        {
          id: "a1",
          householdMemberId: "m1",
          assetType: "checking",
          cashValue: 2000,
          annualIncome: 20,
        },
        {
          id: "a2",
          householdMemberId: "m1",
          assetType: "savings",
          cashValue: 5000,
          annualIncome: 100,
        },
        {
          id: "a3",
          householdMemberId: "m1",
          assetType: "stocks_bonds",
          cashValue: 10000,
          annualIncome: 500,
        },
      ],
    };

    const result = adaptDraftToEngineInput(flat);

    expect(result[0]?.assets).toHaveLength(3);
    expect(result[0]?.assets[0]?.cashValue).toBe(2000);
    expect(result[0]?.assets[1]?.cashValue).toBe(5000);
    expect(result[0]?.assets[2]?.cashValue).toBe(10000);
  });
});
