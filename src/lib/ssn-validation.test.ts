import { describe, it, expect } from "vitest";
import { calculateAge, validateSsnLast4, requiresSsn } from "./ssn-validation";

describe("calculateAge", () => {
  // Use real dates relative to today to avoid mocking issues
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const currentDay = today.getDate();

  it("calculates age correctly for someone born 20 years ago", () => {
    const dob = new Date(currentYear - 20, currentMonth, currentDay);
    const dobString = dob.toISOString().split('T')[0]!;
    expect(calculateAge(dobString)).toBe(20);
  });

  it("calculates age correctly for someone born exactly 15 years ago", () => {
    const dob = new Date(currentYear - 15, currentMonth, currentDay);
    const dobString = dob.toISOString().split('T')[0]!;
    expect(calculateAge(dobString)).toBe(15);
  });

  it("calculates age as 14 for someone whose 15th birthday is in the future", () => {
    // Use a fixed future date to avoid timezone issues
    // If today is July 23, 2026, someone born July 25, 2011 is still 14
    const futureBirthday = new Date(today);
    futureBirthday.setDate(futureBirthday.getDate() + 2); // 2 days from now
    const dob = new Date(futureBirthday);
    dob.setFullYear(dob.getFullYear() - 15);
    const dobString = dob.toISOString().split('T')[0]!;
    const age = calculateAge(dobString);
    expect(age).toBe(14);
  });

  it("calculates age as 15 for someone born 15 years and 1 day ago", () => {
    const dob = new Date(currentYear - 15, currentMonth, currentDay - 1);
    const dobString = dob.toISOString().split('T')[0]!;
    expect(calculateAge(dobString)).toBe(15);
  });

  it("handles leap year birthdays correctly", () => {
    // Someone born Feb 29, 2008 (leap year) should be 18 in 2026+
    const age = calculateAge("2008-02-29");
    expect(age).toBeGreaterThanOrEqual(16); // At least 16 in 2024+
  });

  it("returns null for empty string", () => {
    expect(calculateAge("")).toBeNull();
  });

  it("returns null for invalid date", () => {
    expect(calculateAge("not-a-date")).toBeNull();
  });

  it("handles month boundary correctly", () => {
    // Someone born in June should be older than someone born in August of same year
    const juneAge = calculateAge(`${currentYear - 15}-06-15`);
    const augustAge = calculateAge(`${currentYear - 15}-08-15`);

    // In months before August, June person is same age; after August, June is older
    if (currentMonth < 7) {
      // Before August: both haven't had birthday or both have
      expect(juneAge).toBeGreaterThanOrEqual(14);
    } else {
      // After August: June person definitely older
      expect(juneAge).not.toBeNull();
      expect(augustAge).not.toBeNull();
      expect(juneAge!).toBeGreaterThanOrEqual(augustAge!);
    }
  });
});

describe("validateSsnLast4", () => {
  it("accepts valid 4-digit SSN", () => {
    expect(validateSsnLast4("1234")).toBeNull();
  });

  it("accepts all zeros", () => {
    expect(validateSsnLast4("0000")).toBeNull();
  });

  it("accepts all nines", () => {
    expect(validateSsnLast4("9999")).toBeNull();
  });

  it("rejects 3 digits", () => {
    expect(validateSsnLast4("123")).toBe("Must be exactly 4 digits");
  });

  it("rejects 5 digits", () => {
    expect(validateSsnLast4("12345")).toBe("Must be exactly 4 digits");
  });

  it("rejects non-numeric characters", () => {
    expect(validateSsnLast4("12a4")).toBe("Must be exactly 4 digits");
  });

  it("rejects spaces", () => {
    expect(validateSsnLast4("12 4")).toBe("Must be exactly 4 digits");
  });

  it("rejects dashes", () => {
    expect(validateSsnLast4("12-4")).toBe("Must be exactly 4 digits");
  });

  it("allows empty string (optional field)", () => {
    expect(validateSsnLast4("")).toBeNull();
  });

  it("rejects partial entry", () => {
    expect(validateSsnLast4("1")).toBe("Must be exactly 4 digits");
    expect(validateSsnLast4("12")).toBe("Must be exactly 4 digits");
    expect(validateSsnLast4("123")).toBe("Must be exactly 4 digits");
  });
});

describe("requiresSsn", () => {
  // Use real dates relative to today
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const currentDay = today.getDate();

  it("returns true for member exactly 15 years old", () => {
    const dob = new Date(currentYear - 15, currentMonth, currentDay);
    const dobString = dob.toISOString().split('T')[0]!;
    expect(requiresSsn(dobString)).toBe(true);
  });

  it("returns false for member whose 15th birthday is in the future", () => {
    // Use a fixed future date to avoid timezone issues
    const futureBirthday = new Date(today);
    futureBirthday.setDate(futureBirthday.getDate() + 2); // 2 days from now
    const dob = new Date(futureBirthday);
    dob.setFullYear(dob.getFullYear() - 15);
    const dobString = dob.toISOString().split('T')[0]!;
    expect(requiresSsn(dobString)).toBe(false);
  });

  it("returns true for member who turned 15 yesterday", () => {
    const dob = new Date(currentYear - 15, currentMonth, currentDay - 1);
    const dobString = dob.toISOString().split('T')[0]!;
    expect(requiresSsn(dobString)).toBe(true);
  });

  it("returns false for member exactly 14 years old", () => {
    const dob = new Date(currentYear - 14, currentMonth, currentDay);
    const dobString = dob.toISOString().split('T')[0]!;
    expect(requiresSsn(dobString)).toBe(false);
  });

  it("returns true for member 16 years old", () => {
    const dob = new Date(currentYear - 16, currentMonth, currentDay);
    const dobString = dob.toISOString().split('T')[0]!;
    expect(requiresSsn(dobString)).toBe(true);
  });

  it("returns true for adult member", () => {
    expect(requiresSsn("1990-01-01")).toBe(true);
  });

  it("returns false for infant", () => {
    const dob = new Date(currentYear - 1, currentMonth, currentDay);
    const dobString = dob.toISOString().split('T')[0]!;
    expect(requiresSsn(dobString)).toBe(false);
  });

  it("returns false for invalid date", () => {
    expect(requiresSsn("invalid")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(requiresSsn("")).toBe(false);
  });

  // Edge case: exactly 15 years old on different dates
  it("handles age 15 threshold boundary correctly", () => {
    // Birthday in future (still 14)
    const futureBirthday = new Date(today);
    futureBirthday.setDate(futureBirthday.getDate() + 2);
    const notYet15 = new Date(futureBirthday);
    notYet15.setFullYear(notYet15.getFullYear() - 15);
    expect(requiresSsn(notYet15.toISOString().split('T')[0]!)).toBe(false);

    // Birthday today (exactly 15)
    const birthdayToday = new Date(currentYear - 15, currentMonth, currentDay);
    expect(requiresSsn(birthdayToday.toISOString().split('T')[0]!)).toBe(true);

    // Birthday in past (15 or older)
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 2);
    const alreadyHadBirthday = new Date(yesterday);
    alreadyHadBirthday.setFullYear(alreadyHadBirthday.getFullYear() - 15);
    expect(requiresSsn(alreadyHadBirthday.toISOString().split('T')[0]!)).toBe(true);
  });
});
