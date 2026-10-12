/**
 * FakeExtractor — deterministic extraction for dev and testing.
 *
 * Returns canned results based on document content type and size.
 * Never calls external services or performs real OCR.
 *
 * Usage in tests:
 * - Predictable output for assertions
 * - No network dependencies
 * - Fast execution
 */

import {
  Extractor,
  ExtractionResult,
  ProposedField,
  IncomeFieldNames,
} from "./types";

export class FakeExtractor implements Extractor {
  readonly name = "fake";

  /**
   * Extract fake proposed values for testing.
   *
   * Returns deterministic results based on buffer length:
   * - Short documents (<1000 bytes): minimal extraction
   * - Medium documents (1000-5000 bytes): typical paystub fields
   * - Large documents (>5000 bytes): comprehensive extraction
   */
  async extract(buffer: Buffer, contentType: string): Promise<ExtractionResult> {
    const size = buffer.length;

    // Simulate processing time (10-50ms)
    await new Promise((resolve) => setTimeout(resolve, 10 + Math.random() * 40));

    const proposedFields: ProposedField[] = [];

    if (size < 1000) {
      // Minimal extraction - low confidence, sparse fields
      proposedFields.push({
        fieldName: IncomeFieldNames.EMPLOYER_NAME,
        proposedValue: "Acme Corp",
        confidence: 0.65,
      });
    } else if (size < 5000) {
      // Typical paystub extraction
      proposedFields.push(
        {
          fieldName: IncomeFieldNames.EMPLOYER_NAME,
          proposedValue: "Sample Employer LLC",
          confidence: 0.87,
        },
        {
          fieldName: IncomeFieldNames.GROSS_AMOUNT,
          proposedValue: "2450.00",
          confidence: 0.92,
        },
        {
          fieldName: IncomeFieldNames.PAY_FREQUENCY,
          proposedValue: "biweekly",
          confidence: 0.78,
        },
        {
          fieldName: IncomeFieldNames.PAY_PERIOD_START,
          proposedValue: "2026-07-01",
          confidence: 0.85,
        },
        {
          fieldName: IncomeFieldNames.PAY_PERIOD_END,
          proposedValue: "2026-07-14",
          confidence: 0.85,
        }
      );
    } else {
      // Comprehensive extraction with YTD
      proposedFields.push(
        {
          fieldName: IncomeFieldNames.EMPLOYER_NAME,
          proposedValue: "BigCo Industries Inc",
          confidence: 0.94,
        },
        {
          fieldName: IncomeFieldNames.EMPLOYEE_NAME,
          proposedValue: "John Doe",
          confidence: 0.89,
        },
        {
          fieldName: IncomeFieldNames.GROSS_AMOUNT,
          proposedValue: "3200.00",
          confidence: 0.96,
        },
        {
          fieldName: IncomeFieldNames.PAY_FREQUENCY,
          proposedValue: "biweekly",
          confidence: 0.91,
        },
        {
          fieldName: IncomeFieldNames.PAY_PERIOD_START,
          proposedValue: "2026-07-01",
          confidence: 0.93,
        },
        {
          fieldName: IncomeFieldNames.PAY_PERIOD_END,
          proposedValue: "2026-07-14",
          confidence: 0.93,
        },
        {
          fieldName: IncomeFieldNames.YTD_GROSS,
          proposedValue: "35200.00",
          confidence: 0.88,
        }
      );
    }

    // Generate fake raw text based on extracted fields
    const rawText = this.generateFakeRawText(proposedFields, contentType);

    return {
      rawText,
      proposedFields,
      extractorName: this.name,
    };
  }

  /**
   * Generate fake raw OCR text for testing.
   */
  private generateFakeRawText(
    fields: ProposedField[],
    contentType: string
  ): string {
    const lines: string[] = [];
    lines.push("=== FAKE OCR OUTPUT ===");
    lines.push(`Document type: ${contentType}`);
    lines.push("");

    for (const field of fields) {
      const label = field.fieldName.replace(/_/g, " ").toUpperCase();
      lines.push(`${label}: ${field.proposedValue}`);
    }

    lines.push("");
    lines.push("This is simulated OCR text for testing purposes.");
    lines.push("Real extraction would contain actual document text.");

    return lines.join("\n");
  }
}
