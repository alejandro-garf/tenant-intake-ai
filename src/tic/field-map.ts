/**
 * TIC FORM FIELD MAPPING
 *
 * Maps the CTCAC Tenant Income Certification (April 2021) AcroForm fields
 * to their semantic purposes. The blank PDF has 253 fields total.
 *
 * Fields are organized by form section. We ONLY fill fields that we have
 * verified data for — leaving the rest blank for the human reviewer.
 *
 * CRITICAL: Part IX (demographics) fields are NEVER filled per Golden Rule 4.
 */

/**
 * PART I - DEVELOPMENT DATA
 * Left blank — not collected in applicant intake yet.
 */
export const PART_I_FIELDS = {
  // Certification type
  EFFECTIVE_DATE: 'Effective Date',
  INITIAL_CERTIFICATION: 'Initial Certification',
  RECERTIFICATION: 'Recertification',
  OTHER: 'Other',
  OTHER_DESCRIPTION: 'TENANT INCOME CERTIFICATION', // Field for "Other ____"
  MOVE_IN_DATE: 'MoveIn Date',

  // Property information (not collected yet)
  PROPERTY_NAME: 'Property Name',
  COUNTY: 'County',
  TCAC_NUMBER: 'TCAC',
  BIN_NUMBER: 'BIN',
  ADDRESS: 'Address',
  CDLAC_NUMBER: 'If applicable CDLAC',
  UNIT_NUMBER: 'Unit Number',
  BEDROOMS: 'Bedrooms',
  SQUARE_FOOTAGE: 'Square Footage',

  // Income restrictions (not filled - reviewer selects)
  INCOME_RESTRICTION_60: '60%',
  INCOME_RESTRICTION_50: '50%',
} as const;

/**
 * PART II - HOUSEHOLD COMPOSITION
 * We fill member 1-7 based on application data.
 */
export const PART_II_FIELDS = {
  VACANT: 'Vacant',

  // Member 1 (HEAD)
  MEMBER_1_LAST_NAME: 'Last Name1',
  MEMBER_1_FIRST_NAME: 'First Name1',
  MEMBER_1_MIDDLE_INITIAL: 'Middle Initial1',
  // Relationship is always "HEAD" for member 1 (pre-printed in form)
  MEMBER_1_DOB: 'Date of Birth MMDDYYYYHEAD', // Note: field name includes "HEAD"
  MEMBER_1_STUDENT_FT: 'FT',
  MEMBER_1_STUDENT_PT: 'PT',
  MEMBER_1_STUDENT_NA: 'NA',
  MEMBER_1_SSN_LAST_4: 'Last 4 digits of Social Security HEAD',

  // Member 2
  MEMBER_2_LAST_NAME: 'Last Name2',
  MEMBER_2_FIRST_NAME: 'First Name2',
  MEMBER_2_MIDDLE_INITIAL: 'Middle Initial2',
  MEMBER_2_RELATIONSHIP: 'HEAD2', // Field for relationship code
  MEMBER_2_DOB: 'Date of Birth MMDDYYYY2',
  MEMBER_2_STUDENT_FT: 'FT1',
  MEMBER_2_STUDENT_PT: 'PT1',
  MEMBER_2_STUDENT_NA: 'NA1',
  MEMBER_2_SSN_LAST_4: 'Last 4 digits of Social Security 2',

  // Member 3
  MEMBER_3_LAST_NAME: 'Last Name3',
  MEMBER_3_FIRST_NAME: 'First Name3',
  MEMBER_3_MIDDLE_INITIAL: 'Middle Initial3',
  MEMBER_3_RELATIONSHIP: 'HEAD3',
  MEMBER_3_DOB: 'Date of Birth MMDDYYYY3',
  MEMBER_3_STUDENT_FT: 'FT2',
  MEMBER_3_STUDENT_PT: 'PT2',
  MEMBER_3_STUDENT_NA: 'NA2',
  MEMBER_3_SSN_LAST_4: 'Last 4 digits of Social Security 3',

  // Member 4
  MEMBER_4_LAST_NAME: 'Last Name4',
  MEMBER_4_FIRST_NAME: 'First Name4',
  MEMBER_4_MIDDLE_INITIAL: 'Middle Initial4',
  MEMBER_4_RELATIONSHIP: 'HEAD4',
  MEMBER_4_DOB: 'Date of Birth MMDDYYYY4',
  MEMBER_4_STUDENT_FT: 'FT3',
  MEMBER_4_STUDENT_PT: 'PT3',
  MEMBER_4_STUDENT_NA: 'NA3',
  MEMBER_4_SSN_LAST_4: 'Last 4 digits of Social Security 4',

  // Member 5
  MEMBER_5_LAST_NAME: 'Last Name5',
  MEMBER_5_FIRST_NAME: 'First Name5',
  MEMBER_5_MIDDLE_INITIAL: 'Middle Initial5',
  MEMBER_5_RELATIONSHIP: 'HEAD5',
  MEMBER_5_DOB: 'Date of Birth MMDDYYYY5',
  MEMBER_5_STUDENT_FT: 'FT4',
  MEMBER_5_STUDENT_PT: 'PT4',
  MEMBER_5_STUDENT_NA: 'NA4',
  MEMBER_5_SSN_LAST_4: 'Last 4 digits of Social Security 5',

  // Member 6
  MEMBER_6_LAST_NAME: 'Last Name6',
  MEMBER_6_FIRST_NAME: 'First Name6',
  MEMBER_6_MIDDLE_INITIAL: 'Middle Initial6',
  MEMBER_6_RELATIONSHIP: 'HEAD6',
  MEMBER_6_DOB: 'Date of Birth MMDDYYYY6',
  MEMBER_6_STUDENT_FT: 'FT5',
  MEMBER_6_STUDENT_PT: 'PT5',
  MEMBER_6_STUDENT_NA: 'NA5',
  MEMBER_6_SSN_LAST_4: 'Last 4 digits of Social Security 6',

  // Member 7
  MEMBER_7_LAST_NAME: 'Last Name7',
  MEMBER_7_FIRST_NAME: 'First Name7',
  MEMBER_7_MIDDLE_INITIAL: 'Middle Initial7',
  MEMBER_7_RELATIONSHIP: 'HEAD7',
  MEMBER_7_DOB: 'Date of Birth MMDDYYYY7',
  MEMBER_7_STUDENT_FT: 'FT6',
  MEMBER_7_STUDENT_PT: 'PT6',
  MEMBER_7_STUDENT_NA: 'NA6',
  MEMBER_7_SSN_LAST_4: 'Last 4 digits of Social Security 7',
} as const;

/**
 * Relationship codes for Part II
 * H = Head, S = Spouse, A = Adult Co-Tenant, C = Child,
 * L = Live-in Caretaker, F = Foster child/adult, O = Other Family Member,
 * N = None of the above, U = Unborn Child/Anticipated Adoption or Foster
 */
export type RelationshipCode = 'H' | 'S' | 'A' | 'C' | 'L' | 'F' | 'O' | 'N' | 'U';

/**
 * PART III - GROSS ANNUAL INCOME
 * Up to 5 rows, with columns A-D for different income types.
 * Fill with ANNUAL amounts only.
 */
export const PART_III_FIELDS = {
  // Row 1
  ROW_1_HH_MEMBER: 'HH Mbr Row1',
  ROW_1_COLUMN_A_EMPLOYMENT: 'A Employment or WagesRow1',
  ROW_1_COLUMN_B_SOC_SEC: 'B Soc SecurityPensionsRow1',
  ROW_1_COLUMN_C_PUBLIC_ASSISTANCE: 'C Public AssistanceRow1',
  ROW_1_COLUMN_D_OTHER: 'D Other IncomeRow1',

  // Row 2
  ROW_2_HH_MEMBER: 'HH Mbr Row2',
  ROW_2_COLUMN_A_EMPLOYMENT: 'A Employment or WagesRow2',
  ROW_2_COLUMN_B_SOC_SEC: 'B Soc SecurityPensionsRow2',
  ROW_2_COLUMN_C_PUBLIC_ASSISTANCE: 'C Public AssistanceRow2',
  ROW_2_COLUMN_D_OTHER: 'D Other IncomeRow2',

  // Row 3
  ROW_3_HH_MEMBER: 'HH Mbr Row3',
  ROW_3_COLUMN_A_EMPLOYMENT: 'A Employment or WagesRow3',
  ROW_3_COLUMN_B_SOC_SEC: 'B Soc SecurityPensionsRow3',
  ROW_3_COLUMN_C_PUBLIC_ASSISTANCE: 'C Public AssistanceRow3',
  ROW_3_COLUMN_D_OTHER: 'D Other IncomeRow3',

  // Row 4
  ROW_4_HH_MEMBER: 'HH Mbr Row4',
  ROW_4_COLUMN_A_EMPLOYMENT: 'A Employment or WagesRow4',
  ROW_4_COLUMN_B_SOC_SEC: 'B Soc SecurityPensionsRow4',
  ROW_4_COLUMN_C_PUBLIC_ASSISTANCE: 'C Public AssistanceRow4',
  ROW_4_COLUMN_D_OTHER: 'D Other IncomeRow4',

  // Row 5
  ROW_5_HH_MEMBER: 'HH Mbr Row5',
  ROW_5_COLUMN_A_EMPLOYMENT: 'A Employment or WagesRow5',
  ROW_5_COLUMN_B_SOC_SEC: 'B Soc SecurityPensionsRow5',
  ROW_5_COLUMN_C_PUBLIC_ASSISTANCE: 'C Public AssistanceRow5',
  ROW_5_COLUMN_D_OTHER: 'D Other IncomeRow5',

  // Totals (auto-calculated in our fill logic)
  TOTAL_COLUMN_A: 'fill_122', // X=93.1, Y=401.3
  TOTAL_COLUMN_B: 'fill_123', // X=221.2, Y=401.3
  TOTAL_COLUMN_C: 'fill_124', // X=349.7, Y=401.3
  TOTAL_COLUMN_D: 'fill_125', // X=457.7, Y=401.3

  // Total Income (E) - sum of columns A-D
  TOTAL_INCOME_E: 'fill_126', // X=457.2, Y=384.0 (below column totals, above assets)
} as const;

/**
 * PART IV - INCOME FROM ASSETS
 * Up to 5 rows with columns F (type), G (C/I), H (cash value), I (annual income).
 */
export const PART_IV_FIELDS = {
  // Row 1
  ROW_1_HH_MEMBER: 'HH Mbr Row1_2',
  ROW_1_COLUMN_F_TYPE: 'F Type of AssetRow1',
  ROW_1_COLUMN_G_CI: 'G CIRow1', // C = Current, I = Imputed
  ROW_1_COLUMN_H_CASH_VALUE: 'H Cash Value of AssetRow1',
  ROW_1_COLUMN_I_ANNUAL_INCOME: 'I Annual Income from AssetRow1',

  // Row 2
  ROW_2_HH_MEMBER: 'HH Mbr Row2_2',
  ROW_2_COLUMN_F_TYPE: 'F Type of AssetRow2',
  ROW_2_COLUMN_G_CI: 'G CIRow2',
  ROW_2_COLUMN_H_CASH_VALUE: 'H Cash Value of AssetRow2',
  ROW_2_COLUMN_I_ANNUAL_INCOME: 'I Annual Income from AssetRow2',

  // Row 3
  ROW_3_HH_MEMBER: 'HH Mbr Row3_2',
  ROW_3_COLUMN_F_TYPE: 'F Type of AssetRow3',
  ROW_3_COLUMN_G_CI: 'G CIRow3',
  ROW_3_COLUMN_H_CASH_VALUE: 'H Cash Value of AssetRow3',
  ROW_3_COLUMN_I_ANNUAL_INCOME: 'I Annual Income from AssetRow3',

  // Row 4
  ROW_4_HH_MEMBER: 'HH Mbr Row4_2',
  ROW_4_COLUMN_F_TYPE: 'F Type of AssetRow4',
  ROW_4_COLUMN_G_CI: 'G CIRow4',
  ROW_4_COLUMN_H_CASH_VALUE: 'H Cash Value of AssetRow4',
  ROW_4_COLUMN_I_ANNUAL_INCOME: 'I Annual Income from AssetRow4',

  // Row 5
  ROW_5_HH_MEMBER: 'HH Mbr Row5_2',
  ROW_5_COLUMN_F_TYPE: 'F Type of AssetRow5',
  ROW_5_COLUMN_G_CI: 'G CIRow5',
  ROW_5_COLUMN_H_CASH_VALUE: 'H Cash Value of AssetRow5',
  ROW_5_COLUMN_I_ANNUAL_INCOME: 'I Annual Income from AssetRow5',

  // Calculation fields
  TOTAL_COLUMN_H: 'fill_127', // X=305.3, Y=261.2 - Total cash value
  TOTAL_COLUMN_I: 'fill_128', // X=458.4, Y=261.2 - Total annual income from assets
  PASSBOOK_RATE_ROW_H_VALUE: 'undefined', // X=160.9, Y=241.3 - "If over $5000 $______ X 0.06%" - fill with column H total
  IMPUTED_INCOME_J: 'fill_129', // X=457.7, Y=236.2 - Imputed income (if H > $5000, then H × 0.06%)
  TOTAL_ASSET_INCOME_K: 'fill_130', // X=457.3, Y=220.7 - Greater of I or J
  TOTAL_ANNUAL_INCOME_L: 'fill_132', // X=460.2, Y=184.4 - (E) + (K) = Total from all sources
} as const;

/**
 * PART V - DETERMINATION OF INCOME ELIGIBILITY
 * Left blank — reviewer fills this section.
 */
export const PART_V_FIELDS = {
  // These fields are on page 2, for recertification and income limits
  // We do not fill these - reviewer determines eligibility
  FEDERAL_LIHTC_INCOME_LIMIT_140: 'Current Federal LIHTC Income Limit x 140%',
  HOUSEHOLD_SIZE_AT_MOVE_IN: 'Household Size at Move-in',
  EXCEEDS_140_YES: 'YES',
  EXCEEDS_140_NO: 'NO',

  // Income restriction checkboxes (reviewer selects based on property rules)
  FEDERAL_INCOME_80: '80%1',
  FEDERAL_INCOME_70: '70%1',
  FEDERAL_INCOME_60_ALT: '60%1',
  FEDERAL_INCOME_50_ALT: '50%1',
  FEDERAL_INCOME_40: '40%1',
  FEDERAL_INCOME_30: '30%1',
  FEDERAL_INCOME_20: '20%1',

  // Rent restriction checkboxes
  RENT_60: '60%3',
  RENT_50: '50%3',
  RENT_80: '80#2',
  RENT_70: '70%2',
  RENT_60_ALT: '60%2',
  RENT_50_ALT: '50%2',
  RENT_40: '40%2',
  RENT_30: '30%2',
  RENT_20: '20%2',
  RENT_60_BOND: '60%4',
  RENT_50_BOND: '50%4',
} as const;

/**
 * PART VI - RENT
 * Not collected yet — left blank for reviewer.
 */
export const PART_VI_FIELDS = {
  // From page 2 (Part VI section)
  TOTAL_MONTHLY_RENT_ASSISTANCE: 'Total Monthly Rent Assistance',
  // Additional rent fields exist on page 2 but not extracted in detail
} as const;

/**
 * PART VII - STUDENT STATUS
 * We fill the all-student household question and exemption code if applicable.
 */
export const PART_VII_FIELDS = {
  // All-student household question
  ALL_STUDENTS_YES: 'YES', // X=502.8, Y=663.3 - Checkbox
  ALL_STUDENTS_NO: 'NO', // X=533.9, Y=663.2 - Checkbox

  // Exemption code (1-5)
  // Fill with CTCAC code 1-5 when household is all full-time students AND an exemption applies
  // Leave blank when NOT all students, or when no exemption selected
  EXEMPTION_CODE: 'Enter 15', // X=323.4, Y=253.2 - Note: "Enter 1-5" → "Enter 15" (hyphen stripped)
} as const;

/**
 * CTCAC TIC Part VII Student Exemption Codes
 * When ALL household members are full-time students, one must qualify under these:
 */
export const STUDENT_EXEMPTION_CODES = {
  AFDC_TANF: '1', // AFDC / TANF Assistance
  JOB_TRAINING: '2', // Job Training Program
  SINGLE_PARENT: '3', // Single Parent/Dependent Child
  MARRIED_JOINT_RETURN: '4', // Married/Joint Return
  FORMER_FOSTER_CARE: '5', // Former Foster Care
} as const;

export type StudentExemptionCode = '1' | '2' | '3' | '4' | '5';

/**
 * PART VIII - PROGRAM TYPE
 * Reviewer selects program types that apply to this property.
 */
export const PART_VIII_FIELDS = {
  PROGRAM_9_PERCENT: '9%',
  PROGRAM_4_PERCENT: '4%',
  PROGRAM_TAX_EXEMPT_BOND: 'Tax-Exempt Bond',
  PROGRAM_HOME: 'HOME',
  PROGRAM_CDBG: 'CDBG',
  PROGRAM_HUD: 'HUD',
  PROGRAM_NATIONAL: 'NATIONAL',
  PROGRAM_USDA: 'USDA',
  PROGRAM_STATE: 'STATE',
} as const;

/**
 * PART IX - SUPPLEMENTAL INFORMATION (DEMOGRAPHICS)
 *
 * CRITICAL: Per Golden Rule 4, we NEVER fill, import, join, or reference
 * these fields. The demographic data is isolated for HERA reporting ONLY.
 *
 * Fields in this section (NOT to be filled by our code):
 * - Last Name1_2 through Last Name7_2
 * - First Name1_2 through First Name7_2
 * - Middle Initial1_2 through Middle Initial7_2
 * - Race1 through Race7
 * - Ethnicity1 through Ethnicity7
 * - Disabled1 through Disabled7
 *
 * These fields appear twice in the extracted data because Part IX duplicates
 * household member names for demographic collection.
 */
export const PART_IX_FIELDS_DO_NOT_USE = {
  // Explicitly documenting that these fields exist but must NOT be filled
  DEMOGRAPHIC_CHECKBOX: 'Resident/Applicant',
  // Member demographic fields omitted - DO NOT USE
} as const;

/**
 * SIGNATURE FIELDS
 * Never auto-sign. Left blank for physical signatures.
 */
export const SIGNATURE_FIELDS = {
  HOUSEHOLD_SIGNATURE_1: 'Signature',
  HOUSEHOLD_DATE_1: 'Date',
  HOUSEHOLD_SIGNATURE_2: 'Signature_2',
  HOUSEHOLD_DATE_2: 'Date_2',
  HOUSEHOLD_SIGNATURE_3: 'Signature_3',
  HOUSEHOLD_DATE_3: 'Date_3',
  HOUSEHOLD_SIGNATURE_4: 'Signature_4',
  HOUSEHOLD_DATE_4: 'Date_4',

  // Demographic opt-out initials (Part IX)
  DEMOGRAPHIC_INITIAL_1: '1_2',
  DEMOGRAPHIC_INITIAL_2: '2_2',
  DEMOGRAPHIC_INITIAL_3: '3',
  DEMOGRAPHIC_INITIAL_4: '4',
  DEMOGRAPHIC_INITIAL_5: '5',
  DEMOGRAPHIC_INITIAL_6: '6',
  DEMOGRAPHIC_INITIAL_7: '7',

  OWNER_SIGNATURE: 'SIGNATURE OF OWNERREPRESENTATIVE',
  OWNER_DATE: 'DATE',
} as const;

/**
 * UNIDENTIFIED/AUTO-GENERATED FIELDS
 *
 * These fields have auto-generated names and could not be confidently
 * identified from position alone. Listing for completeness.
 */
export const UNIDENTIFIED_FIELDS = {
  fill_20: 'fill_20', // Near Part I, large field
  fill_21: 'fill_21', // Near Part III income section
  undefined_3: 'undefined_3', // Part IX area
  undefined_4: 'undefined_4',
  undefined_5: 'undefined_5',
  undefined_6: 'undefined_6',
  undefined_7: 'undefined_7',
  undefined_8: 'undefined_8',
  undefined_9: 'undefined_9',
  undefined_10: 'undefined_10',
  undefined_11: 'undefined_11', // Checkbox in assets section
  undefined_12: 'undefined_12', // Checkbox in assets section
  undefined_20: 'undefined_20', // Part II area

  // Other checkbox likely for relationship "Other" with description field
  Other2: 'Other2',
  Other_2: 'Other_2',
  Other3: 'Other3',
  Other_3: 'Other_3',

  // Single-digit fields (demographic initials)
  '1': '1', // Field name is literally "1"

  // Source field (Part VI rent assistance source)
  Source: 'Source',

  // Enter field
  'Enter 15': 'Enter 15', // Asset imputation entry field
} as const;

/**
 * Helper to get all fillable field names we will populate
 */
export function getFillableFields(): string[] {
  return [
    // Part II - Household Composition
    ...Object.values(PART_II_FIELDS),
    // Part III - Gross Annual Income
    ...Object.values(PART_III_FIELDS),
    // Part IV - Income from Assets
    ...Object.values(PART_IV_FIELDS),
  ];
}

/**
 * Helper to get all fields that must NEVER be filled
 */
export function getProhibitedFields(): string[] {
  // Part IX demographic fields - detected by pattern
  const demographicFields = [
    'Race1', 'Race2', 'Race3', 'Race4', 'Race5', 'Race6', 'Race7',
    'Ethnicity1', 'Ethnicity2', 'Ethnicity3', 'Ethnicity4',
    'Ethnicity5', 'Ethnicity6', 'Ethnicity7',
    'Disabled1', 'Disabled2', 'Disabled3', 'Disabled4',
    'Disabled5', 'Disabled6', 'Disabled7',
    // Demographic duplicate name fields
    'Last Name1_2', 'Last Name2_2', 'Last Name3_2', 'Last Name4_2',
    'Last Name5_2', 'Last Name6_2', 'Last Name7_2',
    'First Name1_2', 'First Name2_2', 'First Name3_2', 'First Name4_2',
    'First Name5_2', 'First Name6_2', 'First Name7_2',
    'Middle Initial1_2', 'Middle Initial2_2', 'Middle Initial3_2',
    'Middle Initial4_2', 'Middle Initial5_2', 'Middle Initial6_2',
    'Middle Initial7_2',
  ];

  // Signature fields
  const signatureFields = Object.values(SIGNATURE_FIELDS);

  return [...demographicFields, ...signatureFields];
}
