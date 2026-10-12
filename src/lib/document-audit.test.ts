/**
 * Tests for document audit trail functionality
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getPool } from "@/db/connection";
import {
  logDocumentAction,
  getDocumentAuditTrail,
  getApplicationDocumentAuditTrail,
  type AuditContext,
} from "./document-audit";

describe("Document Audit Trail", () => {
  let testApplicationId: number;
  let testDocumentId: number;
  let testUserId: number;

  const testContext: AuditContext = {
    userId: 1,
    userEmail: "test@example.com",
    userRole: "applicant",
  };

  beforeEach(async () => {
    const db = getPool();

    // Create test user with unique email to avoid conflicts
    const uniqueEmail = `test-audit-${Date.now()}@example.com`;
    const userResult = await db.query(
      `INSERT INTO users (email, role)
       VALUES ($1, $2)
       RETURNING id`,
      [uniqueEmail, testContext.userRole]
    );
    testUserId = userResult.rows[0]?.id;
    testContext.userId = testUserId;
    testContext.userEmail = uniqueEmail;

    // Create test property first
    const uniquePropertyName = `Test Property Audit ${Date.now()}`;
    const propertyResult = await db.query(
      `INSERT INTO properties (name, address_line1, city, state, zip)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [uniquePropertyName, "123 Test St", "Test City", "CA", "12345"]
    );
    const propertyId = propertyResult.rows[0]?.id;

    // Create test application
    const appResult = await db.query(
      `INSERT INTO applications
       (property_id, applicant_email, applicant_name, status, version)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [propertyId, testContext.userEmail, "Test User", "draft", 1]
    );
    testApplicationId = appResult.rows[0]?.id;

    // Create test document
    const docResult = await db.query(
      `INSERT INTO documents
       (application_id, document_type, storage_key, original_filename, file_size, content_type, uploaded_by, file_path)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        testApplicationId,
        "income_verification",
        "test-storage-key-123",
        "paystub.pdf",
        50000,
        "application/pdf",
        testUserId,
        "test-storage-key-123",
      ]
    );
    testDocumentId = docResult.rows[0]?.id;
  });

  afterEach(async () => {
    const db = getPool();
    // Clean up in reverse order (foreign key constraints)
    await db.query("DELETE FROM document_audit_trail WHERE user_id = $1", [testUserId]);
    await db.query("DELETE FROM documents WHERE uploaded_by = $1", [testUserId]);
    await db.query("DELETE FROM applications WHERE applicant_email = $1", [
      testContext.userEmail,
    ]);
    await db.query("DELETE FROM properties WHERE name LIKE $1", ["Test Property Audit%"]);
    await db.query("DELETE FROM users WHERE id = $1", [testUserId]);
  });

  describe("logDocumentAction", () => {
    it("should log an upload action with metadata", async () => {
      await logDocumentAction(
        testDocumentId,
        "uploaded",
        testContext,
        testApplicationId,
        1,
        {
          original_filename: "paystub.pdf",
          file_size: 50000,
          content_type: "application/pdf",
        }
      );

      const trail = await getDocumentAuditTrail(testDocumentId);
      expect(trail).toHaveLength(1);
      expect(trail[0]?.action).toBe("uploaded");
      expect(trail[0]?.userEmail).toBe(testContext.userEmail);
      expect(trail[0]?.userRole).toBe(testContext.userRole);
      expect(trail[0]?.applicationId).toBe(testApplicationId);
      expect(trail[0]?.applicationVersion).toBe(1);
      expect(trail[0]?.metadata).toMatchObject({
        original_filename: "paystub.pdf",
        file_size: 50000,
        content_type: "application/pdf",
      });
    });

    it("should log a viewed action without metadata", async () => {
      await logDocumentAction(
        testDocumentId,
        "viewed",
        testContext,
        testApplicationId,
        1,
        {}
      );

      const trail = await getDocumentAuditTrail(testDocumentId);
      expect(trail).toHaveLength(1);
      expect(trail[0]?.action).toBe("viewed");
      expect(trail[0]?.userEmail).toBe(testContext.userEmail);
      expect(trail[0]?.metadata).toEqual({});
    });

    it("should log a deleted action", async () => {
      await logDocumentAction(
        testDocumentId,
        "deleted",
        testContext,
        testApplicationId,
        1,
        { reason: "Uploaded wrong file" }
      );

      const trail = await getDocumentAuditTrail(testDocumentId);
      expect(trail).toHaveLength(1);
      expect(trail[0]?.action).toBe("deleted");
      expect(trail[0]?.metadata).toMatchObject({
        reason: "Uploaded wrong file",
      });
    });

    it("should log a carried_forward action with source version", async () => {
      await logDocumentAction(
        testDocumentId,
        "carried_forward",
        testContext,
        testApplicationId,
        2,
        {
          source_application_id: testApplicationId,
          source_version: 1,
        }
      );

      const trail = await getDocumentAuditTrail(testDocumentId);
      expect(trail).toHaveLength(1);
      expect(trail[0]?.action).toBe("carried_forward");
      expect(trail[0]?.applicationVersion).toBe(2);
      expect(trail[0]?.metadata).toMatchObject({
        source_application_id: testApplicationId,
        source_version: 1,
      });
    });

    it("should never log storage keys or signed URLs", async () => {
      // This test ensures our type system prevents logging sensitive data
      await logDocumentAction(
        testDocumentId,
        "uploaded",
        testContext,
        testApplicationId,
        1,
        {
          original_filename: "test.pdf",
          file_size: 1000,
          content_type: "application/pdf",
          // TypeScript should prevent passing these fields:
          // storage_key: "should-not-be-logged",
          // signed_url: "https://should-not-be-logged.com",
        }
      );

      const trail = await getDocumentAuditTrail(testDocumentId);
      expect(trail[0]?.metadata).not.toHaveProperty("storage_key");
      expect(trail[0]?.metadata).not.toHaveProperty("signed_url");
    });
  });

  describe("getDocumentAuditTrail", () => {
    it("should return all actions for a document in reverse chronological order", async () => {
      // Log multiple actions
      await logDocumentAction(
        testDocumentId,
        "uploaded",
        testContext,
        testApplicationId,
        1,
        {}
      );
      await logDocumentAction(
        testDocumentId,
        "viewed",
        testContext,
        testApplicationId,
        1,
        {}
      );
      await logDocumentAction(
        testDocumentId,
        "viewed",
        testContext,
        testApplicationId,
        1,
        {}
      );
      await logDocumentAction(
        testDocumentId,
        "deleted",
        testContext,
        testApplicationId,
        1,
        {}
      );

      const trail = await getDocumentAuditTrail(testDocumentId);
      expect(trail).toHaveLength(4);
      // Most recent first
      expect(trail[0]?.action).toBe("deleted");
      expect(trail[1]?.action).toBe("viewed");
      expect(trail[2]?.action).toBe("viewed");
      expect(trail[3]?.action).toBe("uploaded");
    });

    it("should return empty array for document with no audit trail", async () => {
      const trail = await getDocumentAuditTrail(99999);
      expect(trail).toEqual([]);
    });
  });

  describe("getApplicationDocumentAuditTrail", () => {
    it("should return all document actions for an application", async () => {
      // Create second document
      const db = getPool();
      const doc2Result = await db.query(
        `INSERT INTO documents
         (application_id, document_type, storage_key, original_filename, file_size, content_type, uploaded_by, file_path)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [
          testApplicationId,
          "id_document",
          "test-storage-key-456",
          "id.jpg",
          25000,
          "image/jpeg",
          testUserId,
          "test-storage-key-456",
        ]
      );
      const testDocumentId2 = doc2Result.rows[0]?.id;

      // Log actions on both documents
      await logDocumentAction(
        testDocumentId,
        "uploaded",
        testContext,
        testApplicationId,
        1,
        {}
      );
      await logDocumentAction(
        testDocumentId2,
        "uploaded",
        testContext,
        testApplicationId,
        1,
        {}
      );
      await logDocumentAction(
        testDocumentId,
        "viewed",
        testContext,
        testApplicationId,
        1,
        {}
      );

      const trail = await getApplicationDocumentAuditTrail(testApplicationId);
      expect(trail).toHaveLength(3);
      expect(trail.map((t) => t.documentId)).toContain(testDocumentId);
      expect(trail.map((t) => t.documentId)).toContain(testDocumentId2);
    });
  });

  describe("Audit trail persistence", () => {
    it("should preserve audit trail even after document deletion", async () => {
      const db = getPool();

      // Log upload action
      await logDocumentAction(
        testDocumentId,
        "uploaded",
        testContext,
        testApplicationId,
        1,
        {}
      );

      // Log deletion action
      await logDocumentAction(
        testDocumentId,
        "deleted",
        testContext,
        testApplicationId,
        1,
        {}
      );

      // Delete the document
      await db.query("DELETE FROM documents WHERE id = $1", [testDocumentId]);

      // Audit trail should still exist (no CASCADE on document_id)
      const trail = await getDocumentAuditTrail(testDocumentId);
      expect(trail).toHaveLength(2);
      expect(trail[0]?.action).toBe("deleted");
      expect(trail[1]?.action).toBe("uploaded");
    });
  });
});
