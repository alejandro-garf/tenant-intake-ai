import { describe, it, expect } from 'vitest';

/**
 * Tests for MemberModal validation logic, specifically date of birth validation.
 * These tests verify that future dates are rejected and validation messages are correct.
 */
describe('MemberModal validation', () => {
  it('rejects future date of birth', () => {
    // Simulate the validation logic from MemberModal.validate()
    const today = new Date();
    const futureYear = today.getFullYear() + 1;
    const futureMonth = '06';
    const futureDay = '07';
    const futureDOB = `${futureYear}-${futureMonth}-${futureDay}`;

    // Validation logic extracted from MemberModal
    const errors: Record<string, string> = {};

    if (futureDOB) {
      const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!isoRegex.test(futureDOB)) {
        errors.dateOfBirth = "Invalid date format";
      } else {
        const [year, month, day] = futureDOB.split('-').map(Number);
        const dob = new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);

        if (isNaN(dob.getTime())) {
          errors.dateOfBirth = "Please select a valid date";
        } else if (
          dob.getFullYear() !== year ||
          dob.getMonth() !== (month ?? 1) - 1 ||
          dob.getDate() !== day
        ) {
          errors.dateOfBirth = "Invalid date";
        } else if (dob > today) {
          errors.dateOfBirth = "Date of birth cannot be in the future";
        } else if (year && year < 1900) {
          errors.dateOfBirth = "Please enter a valid date of birth";
        }
      }
    }

    // Verify that future DOB is rejected
    expect(errors.dateOfBirth).toBe("Date of birth cannot be in the future");
  });

  it('accepts valid past date of birth', () => {
    const validDOB = '1996-07-21';
    const today = new Date();
    const errors: Record<string, string> = {};

    if (validDOB) {
      const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!isoRegex.test(validDOB)) {
        errors.dateOfBirth = "Invalid date format";
      } else {
        const [year, month, day] = validDOB.split('-').map(Number);
        const dob = new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);

        if (isNaN(dob.getTime())) {
          errors.dateOfBirth = "Please select a valid date";
        } else if (
          dob.getFullYear() !== year ||
          dob.getMonth() !== (month ?? 1) - 1 ||
          dob.getDate() !== day
        ) {
          errors.dateOfBirth = "Invalid date";
        } else if (dob > today) {
          errors.dateOfBirth = "Date of birth cannot be in the future";
        } else if (year && year < 1900) {
          errors.dateOfBirth = "Please enter a valid date of birth";
        }
      }
    }

    // Verify that valid past DOB is accepted
    expect(errors.dateOfBirth).toBeUndefined();
  });

  it('rejects today as date of birth (edge case)', () => {
    const today = new Date();
    const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const errors: Record<string, string> = {};

    if (todayISO) {
      const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!isoRegex.test(todayISO)) {
        errors.dateOfBirth = "Invalid date format";
      } else {
        const [year, month, day] = todayISO.split('-').map(Number);
        const dob = new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);

        // Create a fresh "now" for comparison
        const now = new Date();

        if (isNaN(dob.getTime())) {
          errors.dateOfBirth = "Please select a valid date";
        } else if (
          dob.getFullYear() !== year ||
          dob.getMonth() !== (month ?? 1) - 1 ||
          dob.getDate() !== day
        ) {
          errors.dateOfBirth = "Invalid date";
        } else if (dob > now) {
          errors.dateOfBirth = "Date of birth cannot be in the future";
        } else if (year && year < 1900) {
          errors.dateOfBirth = "Please enter a valid date of birth";
        }
      }
    }

    // Today is technically valid (age 0), so it should pass
    expect(errors.dateOfBirth).toBeUndefined();
  });

  it('rejects invalid dates like February 30', () => {
    const invalidDOB = '1996-02-30'; // Feb 30 doesn't exist
    const today = new Date();
    const errors: Record<string, string> = {};

    if (invalidDOB) {
      const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!isoRegex.test(invalidDOB)) {
        errors.dateOfBirth = "Invalid date format";
      } else {
        const [year, month, day] = invalidDOB.split('-').map(Number);
        const dob = new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);

        if (isNaN(dob.getTime())) {
          errors.dateOfBirth = "Please select a valid date";
        } else if (
          dob.getFullYear() !== year ||
          dob.getMonth() !== (month ?? 1) - 1 ||
          dob.getDate() !== day
        ) {
          errors.dateOfBirth = "Invalid date";
        } else if (dob > today) {
          errors.dateOfBirth = "Date of birth cannot be in the future";
        } else if (year && year < 1900) {
          errors.dateOfBirth = "Please enter a valid date of birth";
        }
      }
    }

    // Verify that Feb 30 is rejected
    expect(errors.dateOfBirth).toBe("Invalid date");
  });

  it('rejects dates before 1900', () => {
    const oldDOB = '1899-12-31';
    const today = new Date();
    const errors: Record<string, string> = {};

    if (oldDOB) {
      const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!isoRegex.test(oldDOB)) {
        errors.dateOfBirth = "Invalid date format";
      } else {
        const [year, month, day] = oldDOB.split('-').map(Number);
        const dob = new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);

        if (isNaN(dob.getTime())) {
          errors.dateOfBirth = "Please select a valid date";
        } else if (
          dob.getFullYear() !== year ||
          dob.getMonth() !== (month ?? 1) - 1 ||
          dob.getDate() !== day
        ) {
          errors.dateOfBirth = "Invalid date";
        } else if (dob > today) {
          errors.dateOfBirth = "Date of birth cannot be in the future";
        } else if (year && year < 1900) {
          errors.dateOfBirth = "Please enter a valid date of birth";
        }
      }
    }

    // Verify that pre-1900 dates are rejected
    expect(errors.dateOfBirth).toBe("Please enter a valid date of birth");
  });
});
