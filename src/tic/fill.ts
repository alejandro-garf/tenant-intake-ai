/**
 * TIC FORM FILL IMPLEMENTATION
 *
 * Fills the CTCAC Tenant Income Certification (April 2021) PDF with verified
 * application data. All calculations come from the rules engine — we NEVER
 * recalculate here.
 */

import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import {
  PART_II_FIELDS,
  PART_III_FIELDS,
  PART_IV_FIELDS,
  PART_VII_FIELDS,
} from './field-map';
import { detectOverflow, getFittingEntries } from './overflow';
import type {
  TICFillInput,
  TICFillResult,
  TICHouseholdMember,
  TICIncomeSource,
  TICAsset,
} from './types';

/**
 * Fill the TIC PDF with verified application data
 */
export async function fillTIC(input: TICFillInput): Promise<TICFillResult> {
  // Load the blank TIC PDF
  const blankPdfPath = path.join(process.cwd(), 'assets', 'tic-blank.pdf');
  const blankPdfBytes = fs.readFileSync(blankPdfPath);
  const pdfDoc = await PDFDocument.load(blankPdfBytes);
  const form = pdfDoc.getForm();

  // Detect overflow conditions BEFORE filling
  const overflowResult = detectOverflow({
    householdMemberCount: input.householdMembers.length,
    incomeSourceCount: input.incomeSources.length,
    assetCount: input.assets.length,
  });

  // Get fitting entries (first N that fit in the form)
  const fittingMembers = getFittingEntries(input.householdMembers, 7);
  const fittingIncome = getFittingEntries(input.incomeSources, 5);
  const fittingAssets = getFittingEntries(input.assets, 5);

  // Fill Part II - Household Composition
  fillPartII(form, fittingMembers);

  // Fill Part III - Gross Annual Income
  fillPartIII(form, fittingIncome, input.totalIncome);

  // Fill Part IV - Income from Assets
  fillPartIV(form, fittingAssets, input.assetCalculations, input.totalAnnualIncome);

  // Fill Part VII - Student Status
  fillPartVII(form, input.studentStatus);

  // Flatten the form to prevent further editing
  // (commented out for now - reviewers may need to edit)
  // form.flatten();

  // Serialize the filled PDF
  const filledPdfBytes = await pdfDoc.save();

  // Build overflow message if needed
  let overflowMessage: string | undefined;
  if (overflowResult.hasOverflow) {
    overflowMessage = overflowResult.conditions
      .map((c) => c.message)
      .join('\n\n');
  }

  return {
    pdfBytes: filledPdfBytes,
    overflow: {
      hasOverflow: overflowResult.hasOverflow,
      householdMembersExcluded: Math.max(0, input.householdMembers.length - 7),
      incomeSourcesExcluded: Math.max(0, input.incomeSources.length - 5),
      assetsExcluded: Math.max(0, input.assets.length - 5),
      message: overflowMessage,
    },
    metadata: {
      applicationId: input.applicationId,
      applicationVersion: input.applicationVersion,
      filledAt: new Date(),
      filledBy: 'claude-code-tic-filler-v1',
    },
  };
}

/**
 * Fill Part II - Household Composition
 */
function fillPartII(
  form: ReturnType<PDFDocument['getForm']>,
  members: TICHouseholdMember[]
): void {
  members.forEach((member, index) => {
    const memberNum = index + 1; // 1-indexed

    if (memberNum === 1) {
      // Member 1 is always HEAD
      form.getTextField(PART_II_FIELDS.MEMBER_1_LAST_NAME).setText(member.lastName);
      form.getTextField(PART_II_FIELDS.MEMBER_1_FIRST_NAME).setText(member.firstName);
      if (member.middleInitial) {
        form
          .getTextField(PART_II_FIELDS.MEMBER_1_MIDDLE_INITIAL)
          .setText(member.middleInitial);
      }
      form.getTextField(PART_II_FIELDS.MEMBER_1_DOB).setText(member.dateOfBirth);

      // Student status checkboxes
      if (member.studentStatus === 'FT') {
        form.getCheckBox(PART_II_FIELDS.MEMBER_1_STUDENT_FT).check();
      } else if (member.studentStatus === 'PT') {
        form.getCheckBox(PART_II_FIELDS.MEMBER_1_STUDENT_PT).check();
      } else {
        form.getCheckBox(PART_II_FIELDS.MEMBER_1_STUDENT_NA).check();
      }

      form.getTextField(PART_II_FIELDS.MEMBER_1_SSN_LAST_4).setText(member.ssnLast4);
    } else if (memberNum === 2) {
      form.getTextField(PART_II_FIELDS.MEMBER_2_LAST_NAME).setText(member.lastName);
      form.getTextField(PART_II_FIELDS.MEMBER_2_FIRST_NAME).setText(member.firstName);
      if (member.middleInitial) {
        form
          .getTextField(PART_II_FIELDS.MEMBER_2_MIDDLE_INITIAL)
          .setText(member.middleInitial);
      }
      form.getTextField(PART_II_FIELDS.MEMBER_2_RELATIONSHIP).setText(member.relationship);
      form.getTextField(PART_II_FIELDS.MEMBER_2_DOB).setText(member.dateOfBirth);

      if (member.studentStatus === 'FT') {
        form.getCheckBox(PART_II_FIELDS.MEMBER_2_STUDENT_FT).check();
      } else if (member.studentStatus === 'PT') {
        form.getCheckBox(PART_II_FIELDS.MEMBER_2_STUDENT_PT).check();
      } else {
        form.getCheckBox(PART_II_FIELDS.MEMBER_2_STUDENT_NA).check();
      }

      form.getTextField(PART_II_FIELDS.MEMBER_2_SSN_LAST_4).setText(member.ssnLast4);
    } else if (memberNum === 3) {
      form.getTextField(PART_II_FIELDS.MEMBER_3_LAST_NAME).setText(member.lastName);
      form.getTextField(PART_II_FIELDS.MEMBER_3_FIRST_NAME).setText(member.firstName);
      if (member.middleInitial) {
        form
          .getTextField(PART_II_FIELDS.MEMBER_3_MIDDLE_INITIAL)
          .setText(member.middleInitial);
      }
      form.getTextField(PART_II_FIELDS.MEMBER_3_RELATIONSHIP).setText(member.relationship);
      form.getTextField(PART_II_FIELDS.MEMBER_3_DOB).setText(member.dateOfBirth);

      if (member.studentStatus === 'FT') {
        form.getCheckBox(PART_II_FIELDS.MEMBER_3_STUDENT_FT).check();
      } else if (member.studentStatus === 'PT') {
        form.getCheckBox(PART_II_FIELDS.MEMBER_3_STUDENT_PT).check();
      } else {
        form.getCheckBox(PART_II_FIELDS.MEMBER_3_STUDENT_NA).check();
      }

      form.getTextField(PART_II_FIELDS.MEMBER_3_SSN_LAST_4).setText(member.ssnLast4);
    } else if (memberNum === 4) {
      form.getTextField(PART_II_FIELDS.MEMBER_4_LAST_NAME).setText(member.lastName);
      form.getTextField(PART_II_FIELDS.MEMBER_4_FIRST_NAME).setText(member.firstName);
      if (member.middleInitial) {
        form
          .getTextField(PART_II_FIELDS.MEMBER_4_MIDDLE_INITIAL)
          .setText(member.middleInitial);
      }
      form.getTextField(PART_II_FIELDS.MEMBER_4_RELATIONSHIP).setText(member.relationship);
      form.getTextField(PART_II_FIELDS.MEMBER_4_DOB).setText(member.dateOfBirth);

      if (member.studentStatus === 'FT') {
        form.getCheckBox(PART_II_FIELDS.MEMBER_4_STUDENT_FT).check();
      } else if (member.studentStatus === 'PT') {
        form.getCheckBox(PART_II_FIELDS.MEMBER_4_STUDENT_PT).check();
      } else {
        form.getCheckBox(PART_II_FIELDS.MEMBER_4_STUDENT_NA).check();
      }

      form.getTextField(PART_II_FIELDS.MEMBER_4_SSN_LAST_4).setText(member.ssnLast4);
    } else if (memberNum === 5) {
      form.getTextField(PART_II_FIELDS.MEMBER_5_LAST_NAME).setText(member.lastName);
      form.getTextField(PART_II_FIELDS.MEMBER_5_FIRST_NAME).setText(member.firstName);
      if (member.middleInitial) {
        form
          .getTextField(PART_II_FIELDS.MEMBER_5_MIDDLE_INITIAL)
          .setText(member.middleInitial);
      }
      form.getTextField(PART_II_FIELDS.MEMBER_5_RELATIONSHIP).setText(member.relationship);
      form.getTextField(PART_II_FIELDS.MEMBER_5_DOB).setText(member.dateOfBirth);

      if (member.studentStatus === 'FT') {
        form.getCheckBox(PART_II_FIELDS.MEMBER_5_STUDENT_FT).check();
      } else if (member.studentStatus === 'PT') {
        form.getCheckBox(PART_II_FIELDS.MEMBER_5_STUDENT_PT).check();
      } else {
        form.getCheckBox(PART_II_FIELDS.MEMBER_5_STUDENT_NA).check();
      }

      form.getTextField(PART_II_FIELDS.MEMBER_5_SSN_LAST_4).setText(member.ssnLast4);
    } else if (memberNum === 6) {
      form.getTextField(PART_II_FIELDS.MEMBER_6_LAST_NAME).setText(member.lastName);
      form.getTextField(PART_II_FIELDS.MEMBER_6_FIRST_NAME).setText(member.firstName);
      if (member.middleInitial) {
        form
          .getTextField(PART_II_FIELDS.MEMBER_6_MIDDLE_INITIAL)
          .setText(member.middleInitial);
      }
      form.getTextField(PART_II_FIELDS.MEMBER_6_RELATIONSHIP).setText(member.relationship);
      form.getTextField(PART_II_FIELDS.MEMBER_6_DOB).setText(member.dateOfBirth);

      if (member.studentStatus === 'FT') {
        form.getCheckBox(PART_II_FIELDS.MEMBER_6_STUDENT_FT).check();
      } else if (member.studentStatus === 'PT') {
        form.getCheckBox(PART_II_FIELDS.MEMBER_6_STUDENT_PT).check();
      } else {
        form.getCheckBox(PART_II_FIELDS.MEMBER_6_STUDENT_NA).check();
      }

      form.getTextField(PART_II_FIELDS.MEMBER_6_SSN_LAST_4).setText(member.ssnLast4);
    } else if (memberNum === 7) {
      form.getTextField(PART_II_FIELDS.MEMBER_7_LAST_NAME).setText(member.lastName);
      form.getTextField(PART_II_FIELDS.MEMBER_7_FIRST_NAME).setText(member.firstName);
      if (member.middleInitial) {
        form
          .getTextField(PART_II_FIELDS.MEMBER_7_MIDDLE_INITIAL)
          .setText(member.middleInitial);
      }
      form.getTextField(PART_II_FIELDS.MEMBER_7_RELATIONSHIP).setText(member.relationship);
      form.getTextField(PART_II_FIELDS.MEMBER_7_DOB).setText(member.dateOfBirth);

      if (member.studentStatus === 'FT') {
        form.getCheckBox(PART_II_FIELDS.MEMBER_7_STUDENT_FT).check();
      } else if (member.studentStatus === 'PT') {
        form.getCheckBox(PART_II_FIELDS.MEMBER_7_STUDENT_PT).check();
      } else {
        form.getCheckBox(PART_II_FIELDS.MEMBER_7_STUDENT_NA).check();
      }

      form.getTextField(PART_II_FIELDS.MEMBER_7_SSN_LAST_4).setText(member.ssnLast4);
    }
  });
}

/**
 * Fill Part III - Gross Annual Income
 */
function fillPartIII(
  form: ReturnType<PDFDocument['getForm']>,
  incomeSources: TICIncomeSource[],
  totalIncome: number
): void {
  // Accumulate totals for each column
  let totalColumnA = 0;
  let totalColumnB = 0;
  let totalColumnC = 0;
  let totalColumnD = 0;

  incomeSources.forEach((source, index) => {
    const rowNum = index + 1; // 1-indexed

    // Household member number
    const memberNumStr = source.householdMemberNumber.toString();

    // Format currency values (no dollar sign, commas for thousands)
    const formatCurrency = (val?: number) =>
      val != null ? val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';

    if (rowNum === 1) {
      form.getTextField(PART_III_FIELDS.ROW_1_HH_MEMBER).setText(memberNumStr);
      if (source.employmentWages != null) {
        form
          .getTextField(PART_III_FIELDS.ROW_1_COLUMN_A_EMPLOYMENT)
          .setText(formatCurrency(source.employmentWages));
        totalColumnA += source.employmentWages;
      }
      if (source.socSecurityPensions != null) {
        form
          .getTextField(PART_III_FIELDS.ROW_1_COLUMN_B_SOC_SEC)
          .setText(formatCurrency(source.socSecurityPensions));
        totalColumnB += source.socSecurityPensions;
      }
      if (source.publicAssistance != null) {
        form
          .getTextField(PART_III_FIELDS.ROW_1_COLUMN_C_PUBLIC_ASSISTANCE)
          .setText(formatCurrency(source.publicAssistance));
        totalColumnC += source.publicAssistance;
      }
      if (source.otherIncome != null) {
        form
          .getTextField(PART_III_FIELDS.ROW_1_COLUMN_D_OTHER)
          .setText(formatCurrency(source.otherIncome));
        totalColumnD += source.otherIncome;
      }
    } else if (rowNum === 2) {
      form.getTextField(PART_III_FIELDS.ROW_2_HH_MEMBER).setText(memberNumStr);
      if (source.employmentWages != null) {
        form
          .getTextField(PART_III_FIELDS.ROW_2_COLUMN_A_EMPLOYMENT)
          .setText(formatCurrency(source.employmentWages));
        totalColumnA += source.employmentWages;
      }
      if (source.socSecurityPensions != null) {
        form
          .getTextField(PART_III_FIELDS.ROW_2_COLUMN_B_SOC_SEC)
          .setText(formatCurrency(source.socSecurityPensions));
        totalColumnB += source.socSecurityPensions;
      }
      if (source.publicAssistance != null) {
        form
          .getTextField(PART_III_FIELDS.ROW_2_COLUMN_C_PUBLIC_ASSISTANCE)
          .setText(formatCurrency(source.publicAssistance));
        totalColumnC += source.publicAssistance;
      }
      if (source.otherIncome != null) {
        form
          .getTextField(PART_III_FIELDS.ROW_2_COLUMN_D_OTHER)
          .setText(formatCurrency(source.otherIncome));
        totalColumnD += source.otherIncome;
      }
    } else if (rowNum === 3) {
      form.getTextField(PART_III_FIELDS.ROW_3_HH_MEMBER).setText(memberNumStr);
      if (source.employmentWages != null) {
        form
          .getTextField(PART_III_FIELDS.ROW_3_COLUMN_A_EMPLOYMENT)
          .setText(formatCurrency(source.employmentWages));
        totalColumnA += source.employmentWages;
      }
      if (source.socSecurityPensions != null) {
        form
          .getTextField(PART_III_FIELDS.ROW_3_COLUMN_B_SOC_SEC)
          .setText(formatCurrency(source.socSecurityPensions));
        totalColumnB += source.socSecurityPensions;
      }
      if (source.publicAssistance != null) {
        form
          .getTextField(PART_III_FIELDS.ROW_3_COLUMN_C_PUBLIC_ASSISTANCE)
          .setText(formatCurrency(source.publicAssistance));
        totalColumnC += source.publicAssistance;
      }
      if (source.otherIncome != null) {
        form
          .getTextField(PART_III_FIELDS.ROW_3_COLUMN_D_OTHER)
          .setText(formatCurrency(source.otherIncome));
        totalColumnD += source.otherIncome;
      }
    } else if (rowNum === 4) {
      form.getTextField(PART_III_FIELDS.ROW_4_HH_MEMBER).setText(memberNumStr);
      if (source.employmentWages != null) {
        form
          .getTextField(PART_III_FIELDS.ROW_4_COLUMN_A_EMPLOYMENT)
          .setText(formatCurrency(source.employmentWages));
        totalColumnA += source.employmentWages;
      }
      if (source.socSecurityPensions != null) {
        form
          .getTextField(PART_III_FIELDS.ROW_4_COLUMN_B_SOC_SEC)
          .setText(formatCurrency(source.socSecurityPensions));
        totalColumnB += source.socSecurityPensions;
      }
      if (source.publicAssistance != null) {
        form
          .getTextField(PART_III_FIELDS.ROW_4_COLUMN_C_PUBLIC_ASSISTANCE)
          .setText(formatCurrency(source.publicAssistance));
        totalColumnC += source.publicAssistance;
      }
      if (source.otherIncome != null) {
        form
          .getTextField(PART_III_FIELDS.ROW_4_COLUMN_D_OTHER)
          .setText(formatCurrency(source.otherIncome));
        totalColumnD += source.otherIncome;
      }
    } else if (rowNum === 5) {
      form.getTextField(PART_III_FIELDS.ROW_5_HH_MEMBER).setText(memberNumStr);
      if (source.employmentWages != null) {
        form
          .getTextField(PART_III_FIELDS.ROW_5_COLUMN_A_EMPLOYMENT)
          .setText(formatCurrency(source.employmentWages));
        totalColumnA += source.employmentWages;
      }
      if (source.socSecurityPensions != null) {
        form
          .getTextField(PART_III_FIELDS.ROW_5_COLUMN_B_SOC_SEC)
          .setText(formatCurrency(source.socSecurityPensions));
        totalColumnB += source.socSecurityPensions;
      }
      if (source.publicAssistance != null) {
        form
          .getTextField(PART_III_FIELDS.ROW_5_COLUMN_C_PUBLIC_ASSISTANCE)
          .setText(formatCurrency(source.publicAssistance));
        totalColumnC += source.publicAssistance;
      }
      if (source.otherIncome != null) {
        form
          .getTextField(PART_III_FIELDS.ROW_5_COLUMN_D_OTHER)
          .setText(formatCurrency(source.otherIncome));
        totalColumnD += source.otherIncome;
      }
    }
  });

  // Fill column totals
  const formatCurrency = (val: number) =>
    val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  form.getTextField(PART_III_FIELDS.TOTAL_COLUMN_A).setText(formatCurrency(totalColumnA));
  form.getTextField(PART_III_FIELDS.TOTAL_COLUMN_B).setText(formatCurrency(totalColumnB));
  form.getTextField(PART_III_FIELDS.TOTAL_COLUMN_C).setText(formatCurrency(totalColumnC));
  form.getTextField(PART_III_FIELDS.TOTAL_COLUMN_D).setText(formatCurrency(totalColumnD));

  // Fill TOTAL INCOME (E) - from rules engine, NOT recalculated
  form.getTextField(PART_III_FIELDS.TOTAL_INCOME_E).setText(formatCurrency(totalIncome));
}

/**
 * Fill Part IV - Income from Assets
 */
function fillPartIV(
  form: ReturnType<PDFDocument['getForm']>,
  assets: TICAsset[],
  calculations: TICFillInput['assetCalculations'],
  totalAnnualIncome: number
): void {
  const formatCurrency = (val: number) =>
    val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  assets.forEach((asset, index) => {
    const rowNum = index + 1;
    const memberNumStr = asset.householdMemberNumber.toString();

    if (rowNum === 1) {
      form.getTextField(PART_IV_FIELDS.ROW_1_HH_MEMBER).setText(memberNumStr);
      form.getTextField(PART_IV_FIELDS.ROW_1_COLUMN_F_TYPE).setText(asset.type);
      form.getTextField(PART_IV_FIELDS.ROW_1_COLUMN_G_CI).setText(asset.currentOrImputed);
      form
        .getTextField(PART_IV_FIELDS.ROW_1_COLUMN_H_CASH_VALUE)
        .setText(formatCurrency(asset.cashValue));
      form
        .getTextField(PART_IV_FIELDS.ROW_1_COLUMN_I_ANNUAL_INCOME)
        .setText(formatCurrency(asset.annualIncome));
    } else if (rowNum === 2) {
      form.getTextField(PART_IV_FIELDS.ROW_2_HH_MEMBER).setText(memberNumStr);
      form.getTextField(PART_IV_FIELDS.ROW_2_COLUMN_F_TYPE).setText(asset.type);
      form.getTextField(PART_IV_FIELDS.ROW_2_COLUMN_G_CI).setText(asset.currentOrImputed);
      form
        .getTextField(PART_IV_FIELDS.ROW_2_COLUMN_H_CASH_VALUE)
        .setText(formatCurrency(asset.cashValue));
      form
        .getTextField(PART_IV_FIELDS.ROW_2_COLUMN_I_ANNUAL_INCOME)
        .setText(formatCurrency(asset.annualIncome));
    } else if (rowNum === 3) {
      form.getTextField(PART_IV_FIELDS.ROW_3_HH_MEMBER).setText(memberNumStr);
      form.getTextField(PART_IV_FIELDS.ROW_3_COLUMN_F_TYPE).setText(asset.type);
      form.getTextField(PART_IV_FIELDS.ROW_3_COLUMN_G_CI).setText(asset.currentOrImputed);
      form
        .getTextField(PART_IV_FIELDS.ROW_3_COLUMN_H_CASH_VALUE)
        .setText(formatCurrency(asset.cashValue));
      form
        .getTextField(PART_IV_FIELDS.ROW_3_COLUMN_I_ANNUAL_INCOME)
        .setText(formatCurrency(asset.annualIncome));
    } else if (rowNum === 4) {
      form.getTextField(PART_IV_FIELDS.ROW_4_HH_MEMBER).setText(memberNumStr);
      form.getTextField(PART_IV_FIELDS.ROW_4_COLUMN_F_TYPE).setText(asset.type);
      form.getTextField(PART_IV_FIELDS.ROW_4_COLUMN_G_CI).setText(asset.currentOrImputed);
      form
        .getTextField(PART_IV_FIELDS.ROW_4_COLUMN_H_CASH_VALUE)
        .setText(formatCurrency(asset.cashValue));
      form
        .getTextField(PART_IV_FIELDS.ROW_4_COLUMN_I_ANNUAL_INCOME)
        .setText(formatCurrency(asset.annualIncome));
    } else if (rowNum === 5) {
      form.getTextField(PART_IV_FIELDS.ROW_5_HH_MEMBER).setText(memberNumStr);
      form.getTextField(PART_IV_FIELDS.ROW_5_COLUMN_F_TYPE).setText(asset.type);
      form.getTextField(PART_IV_FIELDS.ROW_5_COLUMN_G_CI).setText(asset.currentOrImputed);
      form
        .getTextField(PART_IV_FIELDS.ROW_5_COLUMN_H_CASH_VALUE)
        .setText(formatCurrency(asset.cashValue));
      form
        .getTextField(PART_IV_FIELDS.ROW_5_COLUMN_I_ANNUAL_INCOME)
        .setText(formatCurrency(asset.annualIncome));
    }
  });

  // Fill calculation fields from rules engine output
  form
    .getTextField(PART_IV_FIELDS.TOTAL_COLUMN_H)
    .setText(formatCurrency(calculations.totalCashValue));
  form
    .getTextField(PART_IV_FIELDS.TOTAL_COLUMN_I)
    .setText(formatCurrency(calculations.totalAnnualIncome));

  // Passbook rate row: "If over $5000 $______ X 0.06%" - fill blank with column H total
  form
    .getTextField(PART_IV_FIELDS.PASSBOOK_RATE_ROW_H_VALUE)
    .setText(formatCurrency(calculations.totalCashValue));

  // (J) Imputed income - only if total cash value > $5000
  if (calculations.imputedIncome != null) {
    form
      .getTextField(PART_IV_FIELDS.IMPUTED_INCOME_J)
      .setText(formatCurrency(calculations.imputedIncome));
  }

  // (K) Total income from assets (greater of I or J)
  form
    .getTextField(PART_IV_FIELDS.TOTAL_ASSET_INCOME_K)
    .setText(formatCurrency(calculations.totalIncomeFromAssets));

  // (L) Total annual household income from all sources (E + K)
  form
    .getTextField(PART_IV_FIELDS.TOTAL_ANNUAL_INCOME_L)
    .setText(formatCurrency(totalAnnualIncome));
}

/**
 * Fill Part VII - Student Status
 */
function fillPartVII(
  form: ReturnType<PDFDocument['getForm']>,
  studentStatus: TICFillInput['studentStatus']
): void {
  if (studentStatus.allFullTimeStudents) {
    form.getCheckBox(PART_VII_FIELDS.ALL_STUDENTS_YES).check();

    // Fill exemption code if one was provided
    if (studentStatus.exemptionCode) {
      form.getTextField(PART_VII_FIELDS.EXEMPTION_CODE).setText(studentStatus.exemptionCode);
    }
  } else {
    form.getCheckBox(PART_VII_FIELDS.ALL_STUDENTS_NO).check();
    // Leave exemption code blank
  }
}
