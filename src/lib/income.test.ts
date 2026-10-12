import { describe, it, expect } from "vitest";
import { convertToAnnual } from "./income";

describe("convertToAnnual", () => {
  it("converts hourly to annual (40hrs/week × 52 weeks)", () => {
    expect(convertToAnnual(25, "hourly")).toBe(52000); // 25 × 2080
  });

  it("converts weekly to annual", () => {
    expect(convertToAnnual(1000, "weekly")).toBe(52000); // 1000 × 52
  });

  it("converts biweekly to annual (26 pay periods)", () => {
    expect(convertToAnnual(2000, "biweekly")).toBe(52000); // 2000 × 26
  });

  it("converts semimonthly to annual (24 pay periods, NOT 26)", () => {
    expect(convertToAnnual(2000, "semimonthly")).toBe(48000); // 2000 × 24
  });

  it("converts monthly to annual", () => {
    expect(convertToAnnual(4000, "monthly")).toBe(48000); // 4000 × 12
  });

  it("returns annual as-is", () => {
    expect(convertToAnnual(50000, "annually")).toBe(50000);
  });

  it("handles decimal amounts correctly", () => {
    expect(convertToAnnual(15.5, "hourly")).toBe(32240); // 15.5 × 2080
  });

  it("differentiates biweekly vs semimonthly correctly", () => {
    // Critical distinction: biweekly is every 2 weeks (26 periods),
    // semimonthly is twice per month (24 periods)
    const amount = 1000;
    expect(convertToAnnual(amount, "biweekly")).toBe(26000);
    expect(convertToAnnual(amount, "semimonthly")).toBe(24000);
    expect(convertToAnnual(amount, "biweekly")).not.toBe(
      convertToAnnual(amount, "semimonthly")
    );
  });
});
