/**
 * POST /api/documents/:id/extract
 *
 * Reviewer-only endpoint to extract proposed field values from a document.
 *
 * Behavior:
 * - Downloads document from R2
 * - Runs extraction via configured extractor (FakeExtractor or TesseractExtractor)
 * - Stores results in extraction_results table (append-only)
 * - Returns proposed fields with confidence scores
 *
 * Access control:
 * - Reviewer role required
 * - TOTP verification required
 * - Enforced in route handler (not middleware)
 *
 * Security:
 * - Never log raw text (contains PII)
 * - Extraction timeout prevents resource exhaustion
 * - Results are PROPOSALS only, never feed rules engine
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/get-current-user";
import { getClient } from "@/db/connection";
import { getStorageProvider } from "@/lib/storage";
import { getExtractor } from "@/extraction/extractor-factory";
import crypto from "crypto";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Enforce authentication and TOTP verification
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "reviewer") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!session.totpVerified) {
      return NextResponse.json(
        { error: "TOTP verification required" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const documentId = parseInt(id, 10);

    if (isNaN(documentId)) {
      return NextResponse.json(
        { error: "Invalid document ID" },
        { status: 400 }
      );
    }

    const client = await getClient();

    try {
      // Fetch document metadata
      const docResult = await client.query(
        `SELECT storage_key, original_filename, content_type, application_id
         FROM documents
         WHERE id = $1`,
        [documentId]
      );

      if (docResult.rows.length === 0) {
        return NextResponse.json(
          { error: "Document not found" },
          { status: 404 }
        );
      }

      const document = docResult.rows[0];

      // Download document from R2
      const storage = getStorageProvider();
      const signedUrl = await storage.getDocumentUrl(document.storage_key);

      // Fetch document bytes
      const response = await fetch(signedUrl);
      if (!response.ok) {
        throw new Error("Failed to download document from storage");
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Run extraction
      const extractor = getExtractor();
      const result = await extractor.extract(buffer, document.content_type);

      // Generate run ID for this extraction batch
      const runId = crypto.randomUUID();

      // Store extraction results (append-only)
      // Insert all proposed fields in a single transaction
      if (result.proposedFields.length > 0) {
        const values: unknown[] = [];
        const placeholders: string[] = [];

        result.proposedFields.forEach((field, index) => {
          const offset = index * 6;
          placeholders.push(
            `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6})`
          );
          values.push(
            documentId,
            runId,
            result.extractorName,
            result.rawText,
            field.fieldName,
            field.proposedValue,
            field.confidence
          );
        });

        await client.query(
          `INSERT INTO extraction_results
           (document_id, run_id, extractor_name, raw_text, field_name, proposed_value, confidence)
           VALUES ${placeholders.join(", ")}`,
          values
        );
      } else {
        // No fields extracted, but still record the attempt
        await client.query(
          `INSERT INTO extraction_results
           (document_id, run_id, extractor_name, raw_text, field_name, proposed_value, confidence)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            documentId,
            runId,
            result.extractorName,
            result.rawText,
            "_no_fields_extracted",
            "",
            0,
          ]
        );
      }

      // Return extraction results (without raw text to reduce response size)
      return NextResponse.json({
        runId,
        extractorName: result.extractorName,
        proposedFields: result.proposedFields,
        documentId,
        filename: document.original_filename,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    // Never log error details (might contain PII from extraction)
    console.error("Extraction failed:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json(
      {
        error: "Extraction failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
