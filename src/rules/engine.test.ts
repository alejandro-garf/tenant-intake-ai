import { describe, it, expect } from "vitest";
import {
  screenApplication,
  calculateGrossIncome,
  calculateImputedAssetIncome,
  checkFullTimeStudentRule,
} from "./engine";
import type {
  HouseholdMember,
  RuleConfig,
  ScreeningInput,
} from "./types";

const DEFAULT_CONFIG: RuleConfig = {
  incomeCapAnnual: 50000,
  maxOccupancy: 8,
  passbookRate: 0.0006, // 0.06% (CTCAC TIC April 2021, Part IV)
  assetThreshold: 5000,
};

function createMember(
  name: string,
  overrides: Partial<HouseholdMember> = {}
): HouseholdMember {
  return {
    name,
    dateOfBirth: new Date("1990-01-01"),
    relationship: "applicant",
    isFullTimeStudent: false,
    incomeSources: [],
    assets: [],
    ...overrides,
  };
}

describe("Income Cap Rule", () => {
  it("should pass when income is below cap", () => {
    const household = [
      createMember("Alice", {
        incomeSources: [{ sourceType: "employment", annualAmount: 40000 }],
      }),
    ];

    const result = screenApplication({ household, ruleConfig: DEFAULT_CONFIG });

    expect(result.passed).toBe(true);
    expect(result.grossIncome).toBe(40000);
    expect(result.failureReasons).toHaveLength(0);
  });

  it("should pass when income is exactly at cap", () => {
    const household = [
      createMember("Alice", {
        incomeSources: [{ sourceType: "employment", annualAmount: 50000 }],
      }),
    ];

    const result = screenApplication({ household, ruleConfig: DEFAULT_CONFIG });

    expect(result.passed).toBe(true);
    expect(result.grossIncome).toBe(50000);
  });

  it("should fail when income exceeds cap", () => {
    const household = [
      createMember("Alice", {
        incomeSources: [{ sourceType: "employment", annualAmount: 50001 }],
      }),
    ];

    const result = screenApplication({ household, ruleConfig: DEFAULT_CONFIG });

    expect(result.passed).toBe(false);
    expect(result.failureReasons).toContain(
      "Gross income $50001.00 exceeds cap of $50000.00"
    );
  });

  it("should combine income from multiple household members", () => {
    const household = [
      createMember("Alice", {
        incomeSources: [{ sourceType: "employment", annualAmount: 30000 }],
      }),
      createMember("Bob", {
        relationship: "spouse",
        incomeSources: [{ sourceType: "employment", annualAmount: 25000 }],
      }),
    ];

    const result = screenApplication({ household, ruleConfig: DEFAULT_CONFIG });

    expect(result.grossIncome).toBe(55000);
    expect(result.passed).toBe(false); // exceeds $50k cap
  });
});

describe("Occupancy Limits Rule", () => {
  it("should pass when household size is below max", () => {
    const household = [
      createMember("Alice"),
      createMember("Bob"),
      createMember("Charlie"),
    ];

    const result = screenApplication({ household, ruleConfig: DEFAULT_CONFIG });

    expect(result.passed).toBe(true);
    expect(result.householdSize).toBe(3);
  });

  it("should pass when household size equals max", () => {
    const household = Array.from({ length: 8 }, (_, i) =>
      createMember(`Person${i}`)
    );

    const result = screenApplication({ household, ruleConfig: DEFAULT_CONFIG });

    expect(result.passed).toBe(true);
    expect(result.householdSize).toBe(8);
  });

  it("should fail when household size exceeds max", () => {
    const household = Array.from({ length: 9 }, (_, i) =>
      createMember(`Person${i}`)
    );

    const result = screenApplication({ household, ruleConfig: DEFAULT_CONFIG });

    expect(result.passed).toBe(false);
    expect(result.failureReasons).toContain(
      "Household size 9 exceeds maximum occupancy of 8"
    );
  });
});

describe("Asset Imputation (TIC Part IV)", () => {
  it("should not impute when assets are below threshold", () => {
    const household = [
      createMember("Alice", {
        assets: [
          { assetType: "checking", cashValue: 3000, annualIncome: 50 },
        ],
      }),
    ];

    const imputed = calculateImputedAssetIncome(household, DEFAULT_CONFIG);

    expect(imputed).toBeNull();
  });

  it("should not impute when assets exactly equal threshold", () => {
    const household = [
      createMember("Alice", {
        assets: [
          { assetType: "savings", cashValue: 5000, annualIncome: 100 },
        ],
      }),
    ];

    const imputed = calculateImputedAssetIncome(household, DEFAULT_CONFIG);

    expect(imputed).toBeNull();
  });

  it("should impute when assets exceed threshold and imputed > actual", () => {
    const household = [
      createMember("Alice", {
        assets: [
          { assetType: "savings", cashValue: 10000, annualIncome: 50 },
        ],
      }),
    ];

    const imputed = calculateImputedAssetIncome(household, DEFAULT_CONFIG);

    // Imputed: $10,000 * 0.0006 = $6.00
    // Actual: $50
    // Greater: $50
    expect(imputed).toBe(50);
  });

  it("should match CTCAC TIC Part IV calculation: $10,000 assets → $6.00 imputed", () => {
    // Official CTCAC TIC April 2021, Part IV:
    // "If Column (H) total is over $5,000, multiply total cash value by 0.06% to get (J) Imputed Income"
    const household = [
      createMember("Alice", {
        assets: [
          { assetType: "savings", cashValue: 10000, annualIncome: 0 },
        ],
      }),
    ];

    const imputed = calculateImputedAssetIncome(household, DEFAULT_CONFIG);

    // $10,000 * 0.0006 = $6.00 (not $200!)
    expect(imputed).toBeCloseTo(6, 2);
  });

  it("should use actual income when actual > imputed", () => {
    const household = [
      createMember("Alice", {
        assets: [
          { assetType: "stocks", cashValue: 10000, annualIncome: 500 },
        ],
      }),
    ];

    const imputed = calculateImputedAssetIncome(household, DEFAULT_CONFIG);

    // Imputed: $10,000 * 0.0006 = $6.00
    // Actual: $500
    // Greater: $500
    expect(imputed).toBe(500);
  });

  it("should combine assets from multiple members", () => {
    const household = [
      createMember("Alice", {
        assets: [
          { assetType: "checking", cashValue: 3000, annualIncome: 30 },
        ],
      }),
      createMember("Bob", {
        relationship: "spouse",
        assets: [
          { assetType: "savings", cashValue: 3000, annualIncome: 40 },
        ],
      }),
    ];

    const imputed = calculateImputedAssetIncome(household, DEFAULT_CONFIG);

    // Total assets: $6,000 (exceeds $5,000 threshold)
    // Imputed: $6,000 * 0.0006 = $3.60
    // Actual: $30 + $40 = $70
    // Greater: $70
    expect(imputed).toBe(70);
  });

  it("should add imputed asset income to gross income for income cap check", () => {
    const household = [
      createMember("Alice", {
        incomeSources: [{ sourceType: "employment", annualAmount: 49000 }],
        assets: [
          { assetType: "savings", cashValue: 10000, annualIncome: 50 },
        ],
      }),
    ];

    const result = screenApplication({ household, ruleConfig: DEFAULT_CONFIG });

    // Gross: $49,000
    // Imputed: $6.00 (10000 * 0.0006)
    // Actual: $50 (greater than imputed)
    // Total: $49,050
    expect(result.grossIncome).toBe(49000);
    expect(result.imputedAssetIncome).toBe(50);
    expect(result.passed).toBe(true); // $49,050 <= $50,000
  });
});

describe("Full-Time Student Rule (TIC Part VII)", () => {
  it("should pass when no members are students", () => {
    const household = [
      createMember("Alice", { isFullTimeStudent: false }),
      createMember("Bob", { relationship: "spouse", isFullTimeStudent: false }),
    ];

    const violation = checkFullTimeStudentRule(household);

    expect(violation).toBeNull();
  });

  it("should pass when only some members are students", () => {
    const household = [
      createMember("Alice", { isFullTimeStudent: true }),
      createMember("Bob", { relationship: "spouse", isFullTimeStudent: false }),
    ];

    const violation = checkFullTimeStudentRule(household);

    expect(violation).toBeNull();
  });

  it("should fail when all members are students with no exemption", () => {
    const household = [
      createMember("Alice", { isFullTimeStudent: true }),
      createMember("Bob", { relationship: "spouse", isFullTimeStudent: true }),
    ];

    const violation = checkFullTimeStudentRule(household);

    expect(violation).not.toBeNull();
    expect(violation?.rule).toBe("full_time_student");
    expect(violation?.reason).toContain("full-time students with no qualifying exemption");
  });

  it("should pass when all students but one has former_foster_care exemption", () => {
    const household = [
      createMember("Alice", {
        isFullTimeStudent: true,
        studentExemptionType: "former_foster_care",
      }),
      createMember("Bob", { relationship: "spouse", isFullTimeStudent: true }),
    ];

    const violation = checkFullTimeStudentRule(household);

    expect(violation).toBeNull();
  });

  // CTCAC TIC Part VII: Test each of the 5 exemptions individually (April 2021)
  it("should pass with Code 1: AFDC/TANF Assistance exemption", () => {
    const household = [
      createMember("Alice", {
        isFullTimeStudent: true,
        studentExemptionType: "receives_assistance_tanf",
      }),
    ];

    const violation = checkFullTimeStudentRule(household);

    expect(violation).toBeNull();
  });

  it("should pass with Code 2: Job Training Program exemption", () => {
    const household = [
      createMember("Alice", {
        isFullTimeStudent: true,
        studentExemptionType: "enrolled_job_training",
      }),
    ];

    const violation = checkFullTimeStudentRule(household);

    expect(violation).toBeNull();
  });

  it("should pass with Code 3: Single Parent/Dependent Child exemption", () => {
    const household = [
      createMember("Alice", {
        isFullTimeStudent: true,
        studentExemptionType: "single_parent_with_child",
      }),
    ];

    const violation = checkFullTimeStudentRule(household);

    expect(violation).toBeNull();
  });

  it("should pass with Code 4: Married/Joint Return exemption", () => {
    const household = [
      createMember("Alice", {
        isFullTimeStudent: true,
        studentExemptionType: "married_filing_jointly",
      }),
      createMember("Bob", { relationship: "spouse", isFullTimeStudent: true }),
    ];

    const violation = checkFullTimeStudentRule(household);

    expect(violation).toBeNull();
  });

  it("should pass with Code 5: Former Foster Care exemption", () => {
    const household = [
      createMember("Alice", {
        isFullTimeStudent: true,
        studentExemptionType: "former_foster_care",
      }),
    ];

    const violation = checkFullTimeStudentRule(household);

    expect(violation).toBeNull();
  });

  it("should fail when all students have NULL exemptions (Postgres null bug)", () => {
    // This tests the critical bug where Postgres returns null for unset columns
    // and studentExemptionType !== undefined would incorrectly pass null values
    const household = [
      createMember("Alice", {
        isFullTimeStudent: true,
        studentExemptionType: null as any, // Simulating Postgres NULL
      }),
      createMember("Bob", {
        relationship: "spouse",
        isFullTimeStudent: true,
        studentExemptionType: null as any,
      }),
    ];

    const violation = checkFullTimeStudentRule(household);

    expect(violation).not.toBeNull();
    expect(violation?.rule).toBe("full_time_student");
    expect(violation?.reason).toContain(
      "full-time students with no qualifying exemption"
    );
  });
});

describe("Composing Rules (All Failure Reasons)", () => {
  it("should surface all failure reasons, not just the first", () => {
    const household = Array.from({ length: 9 }, (_, i) =>
      createMember(`Person${i}`, {
        isFullTimeStudent: true,
        incomeSources: [{ sourceType: "employment", annualAmount: 10000 }],
      })
    );

    const result = screenApplication({ household, ruleConfig: DEFAULT_CONFIG });

    expect(result.passed).toBe(false);
    // Should fail on income cap ($90k > $50k), occupancy (9 > 8), and student rule
    expect(result.failureReasons.length).toBe(3);

    // Verify all three violations
    expect(result.failureReasons.some(r => r.includes("exceeds cap"))).toBe(true);
    expect(result.failureReasons.some(r => r.includes("exceeds maximum"))).toBe(true);
    expect(result.failureReasons.some(r => r.includes("full-time students"))).toBe(true);
  });

  it("should pass a household that meets all requirements", () => {
    const household = [
      createMember("Alice", {
        incomeSources: [{ sourceType: "employment", annualAmount: 30000 }],
        assets: [
          { assetType: "checking", cashValue: 2000, annualIncome: 20 },
        ],
      }),
      createMember("Bob", {
        relationship: "spouse",
        incomeSources: [{ sourceType: "employment", annualAmount: 15000 }],
      }),
    ];

    const result = screenApplication({ household, ruleConfig: DEFAULT_CONFIG });

    expect(result.passed).toBe(true);
    expect(result.failureReasons).toHaveLength(0);
    expect(result.grossIncome).toBe(45000);
    expect(result.householdSize).toBe(2);
  });
});
