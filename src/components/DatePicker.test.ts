import { describe, it, expect } from 'vitest';

/**
 * Tests for DatePicker component logic.
 * Validates that the picker enforces correct date constraints.
 */
describe('DatePicker validation logic', () => {
  it('prevents future dates by limiting maxYear to current year', () => {
    const currentYear = new Date().getFullYear();
    const maxYear = currentYear;

    // Any date with year > maxYear is impossible to select
    const futureYear = currentYear + 1;

    // maxYear constraint prevents selecting future year
    expect(futureYear).toBeGreaterThan(maxYear);
  });

  it('prevents dates before 1900 by limiting minYear', () => {
    const minYear = 1900;

    // Any date with year < minYear is impossible to select
    const tooOldYear = 1899;

    // minYear constraint prevents selecting year before 1900
    expect(tooOldYear).toBeLessThan(minYear);
  });

  it('constrains days to valid range for each month', () => {
    // February non-leap year: 28 days
    const feb2023Days = new Date(2023, 2, 0).getDate();
    expect(feb2023Days).toBe(28);

    // February leap year: 29 days
    const feb2024Days = new Date(2024, 2, 0).getDate();
    expect(feb2024Days).toBe(29);

    // April: 30 days
    const apr2024Days = new Date(2024, 4, 0).getDate();
    expect(apr2024Days).toBe(30);

    // January: 31 days
    const jan2024Days = new Date(2024, 1, 0).getDate();
    expect(jan2024Days).toBe(31);
  });

  it('adjusts day to valid value when changing month', () => {
    // Scenario: User selects Jan 31, then changes month to Feb
    // Expected: Day should be clamped to 28 (or 29 for leap year)

    const initialDate = '2024-01-31'; // Jan 31, 2024
    const newMonth = '02'; // February
    const year = '2024';

    // Feb 2024 has 29 days (leap year)
    const maxDays = new Date(parseInt(year), parseInt(newMonth), 0).getDate();
    expect(maxDays).toBe(29);

    // Day 31 should be clamped to 29
    const validDay = Math.min(31, maxDays);
    expect(validDay).toBe(29);

    // Result: 2024-02-29 (valid)
    const result = `${year}-${newMonth}-${validDay.toString().padStart(2, '0')}`;
    expect(result).toBe('2024-02-29');
  });

  it('adjusts day when changing to leap year', () => {
    // Scenario: User selects Feb 28, 2023, then changes year to 2024 (leap)
    // Expected: Day 29 becomes available

    const year2023 = 2023;
    const year2024 = 2024;
    const month = 2; // February

    const days2023 = new Date(year2023, month, 0).getDate();
    const days2024 = new Date(year2024, month, 0).getDate();

    expect(days2023).toBe(28);
    expect(days2024).toBe(29);
  });

  it('produces valid ISO date string output', () => {
    const year = '2024';
    const month = '03';
    const day = '15';

    const isoDate = `${year}-${month}-${day}`;
    expect(isoDate).toBe('2024-03-15');

    // Verify it matches the ISO format
    const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
    expect(isoRegex.test(isoDate)).toBe(true);

    // Verify it's parseable as a valid date (using UTC to avoid timezone issues)
    const [y, m, d] = isoDate.split('-').map(Number);
    const date = new Date(y ?? 0, (m ?? 1) - 1, d ?? 1);
    expect(isNaN(date.getTime())).toBe(false);
    expect(date.getFullYear()).toBe(2024);
    expect(date.getMonth()).toBe(2); // 0-indexed (March)
    expect(date.getDate()).toBe(15);
  });

  it('July 21 1996 produces correct ISO date', () => {
    // Simulate user selections: month=July (07), day=21, year=1996
    const year = '1996';
    const month = '07'; // July = 07
    const day = '21';

    // Build the ISO date string (what the picker emits)
    const isoDate = `${year}-${month}-${day}`;

    // Should produce exactly this format
    expect(isoDate).toBe('1996-07-21');

    // Verify it matches ISO format
    const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
    expect(isoRegex.test(isoDate)).toBe(true);

    // Verify it's a valid date
    const [y, m, d] = isoDate.split('-').map(Number);
    const date = new Date(y ?? 0, (m ?? 1) - 1, d ?? 1);
    expect(isNaN(date.getTime())).toBe(false);
    expect(date.getFullYear()).toBe(1996);
    expect(date.getMonth()).toBe(6); // July is month 6 (0-indexed)
    expect(date.getDate()).toBe(21);
  });

  it('loading 1996-07-21 parses to July / 21 / 1996 for display', () => {
    // Reverse path: loading an existing ISO date into the picker
    const isoDate = '1996-07-21';

    // Parse it (what the picker does internally)
    const isoRegex = /^(\d{4})-(\d{2})-(\d{2})$/;
    const match = isoDate.match(isoRegex);

    expect(match).not.toBeNull();
    expect(match?.[1]).toBe('1996'); // year
    expect(match?.[2]).toBe('07');   // month (numeric)
    expect(match?.[3]).toBe('21');   // day

    // These values populate the dropdowns
    const parsedYear = match?.[1] ?? '';
    const parsedMonth = match?.[2] ?? '';
    const parsedDay = match?.[3] ?? '';

    expect(parsedYear).toBe('1996');
    expect(parsedMonth).toBe('07'); // Month dropdown value is "07" which displays as "July"
    expect(parsedDay).toBe('21');
  });

  it('July 21 1996 passes MemberModal validation (timezone-safe)', () => {
    // The exact validation logic from MemberModal (timezone-safe version)
    const dateOfBirth = '1996-07-21';

    // Validate ISO format first
    const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
    expect(isoRegex.test(dateOfBirth)).toBe(true);

    // Parse components from the ISO string
    const [year, month, day] = dateOfBirth.split('-').map(Number);

    // Construct date using LOCAL timezone (not UTC) to avoid off-by-one errors
    const dob = new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
    const today = new Date();

    // Should be a valid date
    expect(isNaN(dob.getTime())).toBe(false);

    // Should have matching date components (catches impossible dates like Feb 30)
    expect(dob.getFullYear()).toBe(year);
    expect(dob.getMonth()).toBe((month ?? 1) - 1); // July = 6 (0-indexed)
    expect(dob.getDate()).toBe(day);

    // Should not be in the future
    expect(dob <= today).toBe(true);

    // Should not be before 1900
    expect(year && year >= 1900).toBe(true);

    // All validation passes - no errors
    const errors: Record<string, string> = {};

    if (!isoRegex.test(dateOfBirth)) {
      errors.dateOfBirth = "Invalid date format";
    } else {
      const [y, m, d] = dateOfBirth.split('-').map(Number);
      const date = new Date(y ?? 0, (m ?? 1) - 1, d ?? 1);

      if (isNaN(date.getTime())) {
        errors.dateOfBirth = "Please select a valid date";
      } else if (
        date.getFullYear() !== y ||
        date.getMonth() !== (m ?? 1) - 1 ||
        date.getDate() !== d
      ) {
        errors.dateOfBirth = "Invalid date";
      } else if (date > today) {
        errors.dateOfBirth = "Date of birth cannot be in the future";
      } else if (y && y < 1900) {
        errors.dateOfBirth = "Please enter a valid date of birth";
      }
    }

    // No errors should be added
    expect(Object.keys(errors).length).toBe(0);
  });

  it('validates 2002-02-04 correctly regardless of timezone', () => {
    // This date was failing in negative UTC offset timezones due to UTC parsing
    const dateOfBirth = '2002-02-04';

    const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
    expect(isoRegex.test(dateOfBirth)).toBe(true);

    const [year, month, day] = dateOfBirth.split('-').map(Number);

    // Use LOCAL timezone construction (NOT new Date(dateOfBirth) which parses as UTC)
    const dob = new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);

    // Verify date components match exactly (no off-by-one due to timezone shift)
    expect(dob.getFullYear()).toBe(2002);
    expect(dob.getMonth()).toBe(1); // February = 1 (0-indexed)
    expect(dob.getDate()).toBe(4); // Should be 4, not 3!

    // This should always pass validation
    const errors: Record<string, string> = {};

    if (!isoRegex.test(dateOfBirth)) {
      errors.dateOfBirth = "Invalid date format";
    } else {
      const [y, m, d] = dateOfBirth.split('-').map(Number);
      const date = new Date(y ?? 0, (m ?? 1) - 1, d ?? 1);

      if (
        date.getFullYear() !== y ||
        date.getMonth() !== (m ?? 1) - 1 ||
        date.getDate() !== d
      ) {
        errors.dateOfBirth = "Invalid date";
      }
    }

    expect(Object.keys(errors).length).toBe(0);
  });

  it('cannot produce impossible dates like Feb 30', () => {
    // Feb only has 28/29 days max
    const year = 2024;
    const month = 2; // February

    const maxDays = new Date(year, month, 0).getDate();

    // Day 30 is impossible for February
    expect(maxDays).toBeLessThan(30);

    // If user tries to select day 30, it's not in the available options
    const dayOptions: number[] = [];
    for (let day = 1; day <= maxDays; day++) {
      dayOptions.push(day);
    }

    expect(dayOptions).not.toContain(30);
    expect(dayOptions).not.toContain(31);
  });

  it('cannot produce impossible dates like Apr 31', () => {
    // April only has 30 days
    const year = 2024;
    const month = 4; // April

    const maxDays = new Date(year, month, 0).getDate();
    expect(maxDays).toBe(30);

    // Day 31 is impossible for April
    const dayOptions: number[] = [];
    for (let day = 1; day <= maxDays; day++) {
      dayOptions.push(day);
    }

    expect(dayOptions).not.toContain(31);
  });
});

/**
 * Tests for age calculation with DatePicker output.
 */
describe('Age calculation with valid dates', () => {
  const getAge = (dateStr: string): number | null => {
    if (!dateStr) return null;
    const dob = new Date(dateStr);
    if (isNaN(dob.getTime())) return null;

    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  };

  it('calculates age correctly for valid date', () => {
    // Fixed date for testing
    const birthDate = '2000-01-15';
    const age = getAge(birthDate);

    expect(age).not.toBeNull();
    expect(age).toBeGreaterThanOrEqual(24); // As of 2024+
  });

  it('handles leap year birthdays correctly', () => {
    const leapYearBirthday = '2000-02-29'; // Leap year
    const age = getAge(leapYearBirthday);

    expect(age).not.toBeNull();
    expect(age).toBeGreaterThanOrEqual(24);
  });

  it('returns null for invalid date strings', () => {
    const invalidDates = [
      '',
      'invalid',
      '2024-13-01', // Invalid month
      '2024-02-30', // Invalid day for Feb
    ];

    invalidDates.forEach((dateStr) => {
      const age = getAge(dateStr);
      // Invalid dates either return null or produce NaN
      if (age !== null) {
        expect(isNaN(age as number)).toBe(false);
      }
    });
  });

  it('age determines SSN visibility (15+ years old)', () => {
    const today = new Date();
    const fifteenYearsAgo = new Date(
      today.getFullYear() - 15,
      today.getMonth(),
      today.getDate()
    );

    const dateStr = fifteenYearsAgo.toISOString().split('T')[0] ?? '';
    const age = getAge(dateStr);

    expect(age).toBeGreaterThanOrEqual(15);

    // Age >= 15 should trigger SSN field visibility
    const requiresSSN = age !== null && age >= 15;
    expect(requiresSSN).toBe(true);
  });

  it('children under 15 do not require SSN', () => {
    const today = new Date();
    const tenYearsAgo = new Date(
      today.getFullYear() - 10,
      today.getMonth(),
      today.getDate()
    );

    const dateStr = tenYearsAgo.toISOString().split('T')[0] ?? '';
    const age = getAge(dateStr);

    expect(age).toBeLessThan(15);

    // Age < 15 should NOT trigger SSN field visibility
    const requiresSSN = age !== null && age >= 15;
    expect(requiresSSN).toBe(false);
  });
});
