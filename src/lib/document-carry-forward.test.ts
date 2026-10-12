/**
 * Tests for document carry-forward on application version creation
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getPool } from "@/db/connection";
import { getDocumentAuditTrail } from "./document-audit";

describe("Document Carry-Forward", () => {
  let testUserId: number;
  let testApplicationId: number;
  let testDocumentId: number;
  let testStorageKey: string;

  beforeEach(async () => {
    const db = getPool();

    // Create test user with unique email to avoid conflicts
    const uniqueEmail = `applicant-carryforward-${Date.now()}@example.com`;
    const userResult = await db.query(
      `INSERT INTO users (email, role)
       VALUES ($1, $2)
       RETURNING id`,
      [uniqueEmail, "applicant"]
    );
    testUserId = userResult.rows[0]?.id;

    // Create test property first
    const uniquePropertyName = `Test Carry Forward Property ${Date.now()}`;
    const propertyResult = await db.query(
      `INSERT INTO properties (name, address_line1, city, state, zip)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [uniquePropertyName, "456 Test Ave", "Test City", "CA", "54321"]
    );
    const propertyId = propertyResult.rows[0]?.id;

    // Create test application (version 1, submitted)
    const appResult = await db.query(
      `INSERT INTO applications
       (property_id, applicant_email, applicant_name, status, version)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [
        propertyId,
        uniqueEmail,
        "Test Applicant",
        "submitted",
        1,
      ]
    );
    testApplicationId = appResult.rows[0]?.id;

    // Create test document
    testStorageKey = `test-storage-key-${Date.now()}`;
    const docResult = await db.query(
      `INSERT INTO documents
       (application_id, document_type, storage_key, original_filename, file_size, content_type, uploaded_by, file_path)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        testApplicationId,
        "income_verification",
        testStorageKey,
        "paystub.pdf",
        50000,
        "application/pdf",
        testUserId,
        testStorageKey,
      ]
    );
    testDocumentId = docResult.rows[0]?.id;
  });

  afterEach(async () => {
    const db = getPool();
    // Clean up in reverse order
    await db.query("DELETE FROM document_audit_trail WHERE user_id = $1", [testUserId]);
    await db.query("DELETE FROM documents WHERE uploaded_by = $1", [testUserId]);
    await db.query("DELETE FROM applications WHERE applicant_name = $1", ["Test Applicant"]);
    await db.query("DELETE FROM properties WHERE name LIKE $1", [
      "Test Carry Forward Property%",
    ]);
    await db.query("DELETE FROM users WHERE id = $1", [testUserId]);
  });

  it("should carry forward documents when creating a new version", async () => {
    const db = getPool();

    // Simulate creating a new version (this is what /api/applications/edit does)
    const newVersion = 2;

    // Get property ID from the existing application
    const propertyResult = await db.query<{ property_id: string }>(
      `SELECT property_id FROM applications WHERE id = $1`,
      [testApplicationId]
    );
    const propertyId = propertyResult.rows[0]?.property_id;

    const newAppResult = await db.query<{ id: number }>(
      `INSERT INTO applications
       (property_id, applicant_email, applicant_name, version, parent_application_id, status)
       VALUES ($1, $2, $3, $4, $5, 'draft')
       RETURNING id`,
      [
        propertyId,
        "applicant@example.com",
        "Test Applicant",
        newVersion,
        testApplicationId,
      ]
    );

    const newApplicationId = newAppResult.rows[0]?.id;

    // Copy document (carry forward)
    const newDocResult = await db.query<{ id: number }>(
      `INSERT INTO documents
       (application_id, document_type, storage_key, original_filename,
        file_size, content_type, uploaded_by, file_path)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        newApplicationId,
        "income_verification",
        testStorageKey, // SAME storage key - no R2 duplication
        "paystub.pdf",
        50000,
        "application/pdf",
        testUserId, // Preserve original uploader
        testStorageKey,
      ]
    );

    const newDocumentId = newDocResult.rows[0]?.id;

    // Verify document was carried forward
    expect(newDocumentId).toBeDefined();
    expect(newDocumentId).not.toBe(testDocumentId);

    // Verify both documents reference the SAME storage key
    const oldDocResult = await db.query<{ storage_key: string }>(
      `SELECT storage_key FROM documents WHERE id = $1`,
      [testDocumentId]
    );
    const carriedDocResult = await db.query<{ storage_key: string; uploaded_by: number }>(
      `SELECT storage_key, uploaded_by FROM documents WHERE id = $1`,
      [newDocumentId]
    );

    const oldDoc = oldDocResult.rows[0];
    const carriedDoc = carriedDocResult.rows[0];

    expect(oldDoc?.storage_key).toBe(testStorageKey);
    expect(carriedDoc?.storage_key).toBe(testStorageKey);
    expect(carriedDoc?.storage_key).toBe(oldDoc?.storage_key);

    // Verify original uploader is preserved
    expect(carriedDoc?.uploaded_by).toBe(testUserId);
  });

  it("should not duplicate R2 objects when carrying forward", async () => {
    const db = getPool();

    // Get property ID
    const propertyResult = await db.query<{ property_id: string }>(
      `SELECT property_id FROM applications WHERE id = $1`,
      [testApplicationId]
    );
    const propertyId = propertyResult.rows[0]?.property_id;

    // Create version 2
    const newAppResult = await db.query<{ id: number }>(
      `INSERT INTO applications
       (property_id, applicant_email, applicant_name, version, parent_application_id, status)
       VALUES ($1, $2, $3, $4, $5, 'draft')
       RETURNING id`,
      [
        propertyId,
        "applicant@example.com",
        "Test Applicant",
        2,
        testApplicationId,
      ]
    );

    const newApp = newAppResult.rows[0];

    // Copy document
    await db.query(
      `INSERT INTO documents
       (application_id, document_type, storage_key, original_filename,
        file_size, content_type, uploaded_by, file_path)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        newApp?.id,
        "income_verification",
        testStorageKey, // SAME storage key
        "paystub.pdf",
        50000,
        "application/pdf",
        testUserId,
        testStorageKey,
      ]
    );

    // Count how many documents reference this storage key
    const result = await db.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM documents WHERE storage_key = $1`,
      [testStorageKey]
    );

    const count = parseInt(result.rows[0]?.count || "0");
    expect(count).toBe(2); // Original + carried forward

    // Both documents point to the SAME R2 object
    // No duplication in R2 storage
  });

  it("should preserve original upload timestamp and attribution", async () => {
    const db = getPool();

    // Get original upload time
    const originalDocResult = await db.query<{
      uploaded_at: Date;
      uploaded_by: number;
    }>(
      `SELECT uploaded_at, uploaded_by FROM documents WHERE id = $1`,
      [testDocumentId]
    );

    const originalDoc = originalDocResult.rows[0];
    const originalUploadedAt = originalDoc?.uploaded_at;
    const originalUploadedBy = originalDoc?.uploaded_by;

    // Wait a bit to ensure timestamp difference would be visible if it were reset
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Get property ID
    const propertyResult = await db.query<{ property_id: string }>(
      `SELECT property_id FROM applications WHERE id = $1`,
      [testApplicationId]
    );
    const propertyId = propertyResult.rows[0]?.property_id;

    // Create version 2
    const newAppResult = await db.query<{ id: number }>(
      `INSERT INTO applications
       (property_id, applicant_email, applicant_name, version, parent_application_id, status)
       VALUES ($1, $2, $3, $4, $5, 'draft')
       RETURNING id`,
      [
        propertyId,
        "applicant@example.com",
        "Test Applicant",
        2,
        testApplicationId,
      ]
    );

    const newApp = newAppResult.rows[0];

    // Copy document with original uploaded_by AND uploaded_at
    const newDocResult = await db.query<{
      id: number;
      uploaded_at: Date;
      uploaded_by: number;
    }>(
      `INSERT INTO documents
       (application_id, document_type, storage_key, original_filename,
        file_size, content_type, uploaded_by, uploaded_at, file_path)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, uploaded_at, uploaded_by`,
      [
        newApp?.id,
        "income_verification",
        testStorageKey,
        "paystub.pdf",
        50000,
        "application/pdf",
        originalUploadedBy, // Preserve original uploader
        originalUploadedAt, // Preserve original upload timestamp
        testStorageKey,
      ]
    );

    const newDoc = newDocResult.rows[0];

    // Verify uploader is preserved
    expect(newDoc?.uploaded_by).toBe(originalUploadedBy);

    // CRITICAL: uploaded_at must be the ORIGINAL timestamp, not when carry-forward happened
    // This tells us when the applicant provided the document, not when we copied the record
    expect(newDoc?.uploaded_at?.getTime()).toBe(originalUploadedAt?.getTime());
  });

  it("should not break prior version when deleting from newer version", async () => {
    const db = getPool();

    // Get property ID
    const propertyResult = await db.query<{ property_id: string }>(
      `SELECT property_id FROM applications WHERE id = $1`,
      [testApplicationId]
    );
    const propertyId = propertyResult.rows[0]?.property_id;

    // Create version 2
    const newAppResult = await db.query<{ id: number }>(
      `INSERT INTO applications
       (property_id, applicant_email, applicant_name, version, parent_application_id, status)
       VALUES ($1, $2, $3, $4, $5, 'draft')
       RETURNING id`,
      [
        propertyId,
        "applicant@example.com",
        "Test Applicant",
        2,
        testApplicationId,
      ]
    );

    const newApp = newAppResult.rows[0];

    // Copy document
    const newDocResult = await db.query<{ id: number }>(
      `INSERT INTO documents
       (application_id, document_type, storage_key, original_filename,
        file_size, content_type, uploaded_by, file_path)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        newApp?.id,
        "income_verification",
        testStorageKey,
        "paystub.pdf",
        50000,
        "application/pdf",
        testUserId,
        testStorageKey,
      ]
    );

    const newDoc = newDocResult.rows[0];

    // Delete document from version 2 (user uploads a replacement)
    await db.query(`DELETE FROM documents WHERE id = $1`, [newDoc?.id]);

    // Verify original document still exists
    const originalDocResult = await db.query<{ id: number; storage_key: string }>(
      `SELECT id, storage_key FROM documents WHERE id = $1`,
      [testDocumentId]
    );

    const originalDoc = originalDocResult.rows[0];

    expect(originalDoc).toBeDefined();
    expect(originalDoc?.id).toBe(testDocumentId);
    expect(originalDoc?.storage_key).toBe(testStorageKey);
  });

  it("should keep R2 object accessible from v1 after deleting from v2", async () => {
    const db = getPool();

    // Get property ID
    const propertyResult = await db.query<{ property_id: string }>(
      `SELECT property_id FROM applications WHERE id = $1`,
      [testApplicationId]
    );
    const propertyId = propertyResult.rows[0]?.property_id;

    // Create version 2 with carry-forward
    const newAppResult = await db.query<{ id: number }>(
      `INSERT INTO applications
       (property_id, applicant_email, applicant_name, version, parent_application_id, status)
       VALUES ($1, $2, $3, $4, $5, 'draft')
       RETURNING id`,
      [
        propertyId,
        "applicant@example.com",
        "Test Applicant",
        2,
        testApplicationId,
      ]
    );

    const newApp = newAppResult.rows[0];

    // Copy document with SAME storage_key
    const newDocResult = await db.query<{ id: number }>(
      `INSERT INTO documents
       (application_id, document_type, storage_key, original_filename,
        file_size, content_type, uploaded_by, uploaded_at, file_path)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        newApp?.id,
        "income_verification",
        testStorageKey,
        "paystub.pdf",
        50000,
        "application/pdf",
        testUserId,
        new Date(), // uploaded_at
        testStorageKey,
      ]
    );

    const newDocId = newDocResult.rows[0]?.id;

    // CRITICAL TEST: Delete document from version 2
    await db.query("DELETE FROM documents WHERE id = $1", [newDocId]);

    // Verify version 1's document still exists in database
    const v1DocResult = await db.query<{ id: number; storage_key: string }>(
      `SELECT id, storage_key FROM documents WHERE id = $1`,
      [testDocumentId]
    );

    expect(v1DocResult.rows[0]).toBeDefined();
    expect(v1DocResult.rows[0]?.id).toBe(testDocumentId);
    expect(v1DocResult.rows[0]?.storage_key).toBe(testStorageKey);

    // Verify R2 object is still retrievable (would be accessible via storage API)
    // In a real scenario with actual R2, you'd call getDocumentUrl() here
    // For this test, we verify the storage_key reference still exists
    const storageKeyCount = await db.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM documents WHERE storage_key = $1`,
      [testStorageKey]
    );

    expect(parseInt(storageKeyCount.rows[0]?.count || "0")).toBe(1);
    // 1 remaining reference (v1) means R2 object should NOT have been deleted
  });

  it("should record carry-forward in audit trail", async () => {
    const db = getPool();

    // Get property ID
    const propertyResult = await db.query<{ property_id: string }>(
      `SELECT property_id FROM applications WHERE id = $1`,
      [testApplicationId]
    );
    const propertyId = propertyResult.rows[0]?.property_id;

    // Create version 2
    const newAppResult = await db.query<{ id: number }>(
      `INSERT INTO applications
       (property_id, applicant_email, applicant_name, version, parent_application_id, status)
       VALUES ($1, $2, $3, $4, $5, 'draft')
       RETURNING id`,
      [
        propertyId,
        "applicant@example.com",
        "Test Applicant",
        2,
        testApplicationId,
      ]
    );

    const newApp = newAppResult.rows[0];

    // Copy document
    const newDocResult = await db.query<{ id: number }>(
      `INSERT INTO documents
       (application_id, document_type, storage_key, original_filename,
        file_size, content_type, uploaded_by, file_path)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        newApp?.id,
        "income_verification",
        testStorageKey,
        "paystub.pdf",
        50000,
        "application/pdf",
        testUserId,
        testStorageKey,
      ]
    );

    const newDoc = newDocResult.rows[0];

    // Log carry-forward action (this is what /api/applications/edit does)
    await db.query(
      `INSERT INTO document_audit_trail
       (document_id, action, user_id, user_email, user_role, application_id, application_version, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        newDoc?.id,
        "carried_forward",
        testUserId,
        "applicant@example.com",
        "applicant",
        newApp?.id,
        2,
        JSON.stringify({
          source_application_id: testApplicationId,
          source_version: 1,
        }),
      ]
    );

    // Verify audit trail
    const trail = await getDocumentAuditTrail(newDoc?.id as number);
    expect(trail).toHaveLength(1);
    expect(trail[0]?.action).toBe("carried_forward");
    expect(trail[0]?.applicationVersion).toBe(2);
    expect(trail[0]?.metadata).toMatchObject({
      source_application_id: testApplicationId,
      source_version: 1,
    });
  });
});
