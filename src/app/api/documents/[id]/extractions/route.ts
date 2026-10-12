/**
 * GET /api/documents/:id/extractions
 *
 * Fetch all extraction results for a document.
 *
 * Returns extraction runs grouped by run_id, showing proposed fields
 * with confidence scores. Raw text is available but truncated for display.
 *
 * Access control:
 * - Reviewer role required
 * - TOTP verification required
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/get-current-user";
import { getClient } from "@/db/connection";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
      // Fetch all extraction results for this document, grouped by run_id
      const result = await client.query(
        `SELECT
           run_id,
           extractor_name,
           field_name,
           proposed_value,
           confidence,
           extracted_at,
           raw_text
         FROM extraction_results
         WHERE document_id = $1
         ORDER BY extracted_at DESC, field_name ASC`,
        [documentId]
      );

      // Group results by run_id
      const runMap = new Map<
        string,
        {
          runId: string;
          extractorName: string;
          extractedAt: string;
          rawText: string;
          fields: Array<{
            fieldName: string;
            proposedValue: string;
            confidence: number;
          }>;
        }
      >();

      for (const row of result.rows) {
        if (!runMap.has(row.run_id)) {
          runMap.set(row.run_id, {
            runId: row.run_id,
            extractorName: row.extractor_name,
            extractedAt: row.extracted_at,
            rawText: row.raw_text || "",
            fields: [],
          });
        }

        const run = runMap.get(row.run_id)!;

        // Skip the special "_no_fields_extracted" marker
        if (row.field_name !== "_no_fields_extracted") {
          run.fields.push({
            fieldName: row.field_name,
            proposedValue: row.proposed_value,
            confidence: parseFloat(row.confidence),
          });
        }
      }

      const runs = Array.from(runMap.values());

      return NextResponse.json({ runs });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Failed to fetch extractions:", error);
    return NextResponse.json(
      { error: "Failed to fetch extractions" },
      { status: 500 }
    );
  }
}
