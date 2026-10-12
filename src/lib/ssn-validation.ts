// SSN last-4 validation utilities
// SENSITIVE: These utilities handle partial SSN data

/**
 * Calculate age from date of birth
 * Returns null if date string is invalid
 */
export function calculateAge(dateOfBirth: string): number | null {
  if (!dateOfBirth) return null;

  const dob = new Date(dateOfBirth);
  if (isNaN(dob.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }

  return age;
}

/**
 * Validate SSN last-4 format
 * Must be exactly 4 digits, numeric only
 * Returns error message if invalid, null if valid
 */
export function validateSsnLast4(value: string): string | null {
  if (!value) {
    // Empty is allowed (optional field)
    return null;
  }

  if (!/^\d{4}$/.test(value)) {
    return "Must be exactly 4 digits";
  }

  return null;
}

/**
 * Check if member requires SSN based on age
 * CTCAC Part II requirement: members 15+ years old
 */
export function requiresSsn(dateOfBirth: string): boolean {
  const age = calculateAge(dateOfBirth);
  return age !== null && age >= 15;
}
