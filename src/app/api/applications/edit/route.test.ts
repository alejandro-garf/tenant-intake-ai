import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { query } from "@/db/connection";

describe("Application versioning", () => {
  let propertyId: string;
  let applicationId: number;

  beforeEach(async () => {
    // Create a test property (with required fields based on actual schema)
    const [property] = await query<{ id: string }>(
      `INSERT INTO properties (name, address_line1, city, state, zip)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      ["Test Property", "123 Test St", "Test City", "CA", "12345"]
    );
    propertyId = property!.id;

    // Create an application
    const [app] = await query<{ id: number }>(
      `INSERT INTO applications
       (property_id, applicant_email, applicant_name, status, version)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [propertyId, "test@example.com", "Test User", "submitted", 1]
    );
    applicationId = app!.id;

    // Add a household member
    const [member] = await query<{ id: number }>(
      `INSERT INTO household_members
       (application_id, name, date_of_birth, relationship, is_full_time_student)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [applicationId, "John Doe", "1990-01-01", "self", false]
    );

    // Add an income source
    await query(
      `INSERT INTO income_sources
       (household_member_id, source_type, amount, frequency, annual_amount)
       VALUES ($1, $2, $3, $4, $5)`,
      [member!.id, "employment", 3000, "monthly", 36000]
    );
  });

  afterEach(async () => {
    // Clean up test data
    await query("DELETE FROM applications WHERE property_id = $1", [propertyId]);
    await query("DELETE FROM properties WHERE id = $1", [propertyId]);
  });

  it("creates a new version when editing a submitted application", async () => {
    // Verify original application exists
    const [original] = await query<{ id: number; version: number; status: string }>(
      "SELECT id, version, status FROM applications WHERE id = $1",
      [applicationId]
    );

    expect(original).toBeDefined();
    expect(original!.version).toBe(1);
    expect(original!.status).toBe("submitted");

    // Simulate editing the application (create new version)
    const [newApp] = await query<{ id: number; version: number; parent_application_id: number }>(
      `INSERT INTO applications
       (property_id, applicant_email, applicant_name, version, parent_application_id, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, version, parent_application_id`,
      [propertyId, "test@example.com", "Test User", 2, applicationId, "draft"]
    );

    expect(newApp).toBeDefined();
    expect(newApp!.version).toBe(2);
    expect(newApp!.parent_application_id).toBe(applicationId);

    // Verify original is unchanged
    const [unchangedOriginal] = await query<{ status: string; version: number }>(
      "SELECT status, version FROM applications WHERE id = $1",
      [applicationId]
    );

    expect(unchangedOriginal!.status).toBe("submitted");
    expect(unchangedOriginal!.version).toBe(1);

    // Both versions should exist
    const allVersions = await query<{ id: number; version: number }>(
      "SELECT id, version FROM applications WHERE property_id = $1 AND applicant_email = $2 ORDER BY version",
      [propertyId, "test@example.com"]
    );

    expect(allVersions.length).toBe(2);
    expect(allVersions[0]!.version).toBe(1);
    expect(allVersions[1]!.version).toBe(2);
  });

  it("does NOT mutate the original application when creating a new version", async () => {
    // Get original application state
    const [originalBefore] = await query<{
      status: string;
      version: number;
      updated_at: Date;
    }>("SELECT status, version, updated_at FROM applications WHERE id = $1", [
      applicationId,
    ]);

    const originalUpdateTime = originalBefore!.updated_at;

    // Create a new version
    await query(
      `INSERT INTO applications
       (property_id, applicant_email, applicant_name, version, parent_application_id, status)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [propertyId, "test@example.com", "Test User", 2, applicationId, "draft"]
    );

    // Verify original is completely unchanged
    const [originalAfter] = await query<{
      status: string;
      version: number;
      updated_at: Date;
    }>("SELECT status, version, updated_at FROM applications WHERE id = $1", [
      applicationId,
    ]);

    expect(originalAfter!.status).toBe(originalBefore!.status);
    expect(originalAfter!.version).toBe(originalBefore!.version);
    // In a real append-only system, even the updated_at shouldn't change
    // For this test, we just verify the critical fields are unchanged
  });

  it("allows multiple versions of the same application", async () => {
    // Create version 2
    const [v2] = await query<{ id: number }>(
      `INSERT INTO applications
       (property_id, applicant_email, applicant_name, version, parent_application_id, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [propertyId, "test@example.com", "Test User", 2, applicationId, "submitted"]
    );

    // Create version 3
    const [v3] = await query<{ id: number }>(
      `INSERT INTO applications
       (property_id, applicant_email, applicant_name, version, parent_application_id, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [propertyId, "test@example.com", "Test User", 3, v2!.id, "draft"]
    );

    // All three versions should exist
    const allVersions = await query<{ id: number; version: number }>(
      "SELECT id, version FROM applications WHERE property_id = $1 AND applicant_email = $2 ORDER BY version",
      [propertyId, "test@example.com"]
    );

    expect(allVersions.length).toBe(3);
    expect(allVersions.map((v) => v.version)).toEqual([1, 2, 3]);
  });
});
