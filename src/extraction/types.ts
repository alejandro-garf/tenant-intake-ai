/**
 * Extraction types — the "propose" stage of the three-stage pipeline.
 *
 * Extraction reads uploaded documents and PROPOSES field values.
 * Results are proposals only, never final truth. A human reviewer
 * transfers or rejects them (Golden Rule 2).
 *
 * The extractor interface is swappable:
 * - FakeExtractor: deterministic, for dev and tests
 * - TesseractExtractor: CPU-only OCR, real extraction
 * - Vision LLM: fallback only if Tesseract proves insufficient
 */

/**
 * A single proposed field value from extraction.
 */
export interface ProposedField {
  fieldName: string;
  proposedValue: string;
  confidence: number; // 0.0 to 1.0
}

/**
 * Result of extracting a single document.
 */
export interface ExtractionResult {
  /** Raw text extracted from the document (OCR output) */
  rawText: string;
  /** Proposed field values with confidence scores */
  proposedFields: ProposedField[];
  /** Name of the extractor used (e.g., "fake", "tesseract") */
  extractorName: string;
}

/**
 * Extractor interface — swappable extraction implementations.
 *
 * All extractors:
 * - Take a document buffer and content type
 * - Return proposed field values with confidence scores
 * - Never fabricate values to fill fields
 * - Low confidence is fine and expected
 */
export interface Extractor {
  /**
   * Extract proposed field values from a document.
   *
   * @param buffer Document bytes
   * @param contentType MIME type (e.g., "application/pdf", "image/jpeg")
   * @returns Proposed field values with confidence, or error
   */
  extract(buffer: Buffer, contentType: string): Promise<ExtractionResult>;

  /**
   * Name of this extractor (e.g., "fake", "tesseract")
   */
  readonly name: string;
}

/**
 * Income document field names we attempt to extract.
 *
 * Best-effort — low confidence is expected, never fabricate.
 */
export const IncomeFieldNames = {
  EMPLOYER_NAME: "employer_name",
  PAYER_NAME: "payer_name", // For non-employment income (SSA, etc.)
  GROSS_AMOUNT: "gross_amount",
  PAY_FREQUENCY: "pay_frequency", // hourly, weekly, biweekly, etc.
  PAY_PERIOD_START: "pay_period_start",
  PAY_PERIOD_END: "pay_period_end",
  EMPLOYEE_NAME: "employee_name", // For verification
  YTD_GROSS: "ytd_gross", // Year-to-date totals when available
} as const;

export type IncomeFieldName =
  (typeof IncomeFieldNames)[keyof typeof IncomeFieldNames];
