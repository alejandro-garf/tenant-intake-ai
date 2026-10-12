import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import * as dbConnection from "@/db/connection";
import * as getCurrentSessionModule from "@/lib/get-current-user";
import * as rulesEngine from "@/rules/engine";

// Mock dependencies
vi.mock("@/db/connection");
vi.mock("@/lib/get-current-user");
vi.mock("@/rules/engine");

describe("POST /api/applications/submit", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock getCurrentSession to return a valid session
    vi.mocked(getCurrentSessionModule.getCurrentSession).mockResolvedValue({
      user: { email: "test@example.com" },
      sessionId: "session-123",
    } as any);

    // Mock screenApplication to return a passing result
    vi.mocked(rulesEngine.screenApplication).mockReturnValue({
      passed: true,
      failureReasons: [],
      grossIncome: 36000,
      imputedAssetIncome: 0,
      householdSize: 2,
    });
  });

  it("returns 400 when required ID document is missing", async () => {
    const draft = {
      id: 1,
      household: [
        {
          id: "member-1",
          name: "John Doe",
          dateOfBirth: "1990-01-01",
          relationship: "applicant",
          isFullTimeStudent: false,
        },
      ],
      incomeSources: [],
      assets: [],
    };

    // Mock application query
    vi.mocked(dbConnection.query)
      .mockResolvedValueOnce([{ property_id: "property-1", status: "draft" }])
      // Mock documents query - empty (no documents uploaded)
      .mockResolvedValueOnce([]);

    const request = new Request("http://localhost/api/applications/submit", {
      method: "POST",
      body: JSON.stringify(draft),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Please upload required documents");
    expect(data.error).toContain("ID document");
  });

  it("returns 400 when income verification is missing for application with income", async () => {
    const draft = {
      id: 1,
      household: [
        {
          id: "member-1",
          name: "John Doe",
          dateOfBirth: "1990-01-01",
          relationship: "applicant",
          isFullTimeStudent: false,
        },
      ],
      incomeSources: [
        {
          id: "income-1",
          householdMemberId: "member-1",
          sourceType: "employment" as const,
          amount: 3000,
          frequency: "monthly" as const,
        },
      ],
      assets: [],
    };

    // Mock application query
    vi.mocked(dbConnection.query)
      .mockResolvedValueOnce([{ property_id: "property-1", status: "draft" }])
      // Mock documents query - only ID document, missing income verification
      .mockResolvedValueOnce([{ document_type: "id_document" }]);

    const request = new Request("http://localhost/api/applications/submit", {
      method: "POST",
      body: JSON.stringify(draft),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Please upload required documents");
    expect(data.error).toContain("Income verification");
  });

  it("returns 400 when asset statements are missing for application with assets", async () => {
    const draft = {
      id: 1,
      household: [
        {
          id: "member-1",
          name: "John Doe",
          dateOfBirth: "1990-01-01",
          relationship: "applicant",
          isFullTimeStudent: false,
        },
      ],
      incomeSources: [],
      assets: [
        {
          id: "asset-1",
          householdMemberId: "member-1",
          assetType: "checking" as const,
          cashValue: 5000,
          annualIncome: 10,
        },
      ],
    };

    // Mock application query
    vi.mocked(dbConnection.query)
      .mockResolvedValueOnce([{ property_id: "property-1", status: "draft" }])
      // Mock documents query - only ID document, missing asset statements
      .mockResolvedValueOnce([{ document_type: "id_document" }]);

    const request = new Request("http://localhost/api/applications/submit", {
      method: "POST",
      body: JSON.stringify(draft),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Please upload required documents");
    expect(data.error).toContain("Asset statements");
  });

  it("returns 400 with all missing document types listed", async () => {
    const draft = {
      id: 1,
      household: [
        {
          id: "member-1",
          name: "John Doe",
          dateOfBirth: "1990-01-01",
          relationship: "applicant",
          isFullTimeStudent: false,
        },
      ],
      incomeSources: [
        {
          id: "income-1",
          householdMemberId: "member-1",
          sourceType: "employment" as const,
          amount: 3000,
          frequency: "monthly" as const,
        },
      ],
      assets: [
        {
          id: "asset-1",
          householdMemberId: "member-1",
          assetType: "checking" as const,
          cashValue: 5000,
          annualIncome: 10,
        },
      ],
    };

    // Mock application query
    vi.mocked(dbConnection.query)
      .mockResolvedValueOnce([{ property_id: "property-1", status: "draft" }])
      // Mock documents query - no documents uploaded
      .mockResolvedValueOnce([]);

    const request = new Request("http://localhost/api/applications/submit", {
      method: "POST",
      body: JSON.stringify(draft),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Please upload required documents");
    expect(data.error).toContain("ID document");
    expect(data.error).toContain("Income verification");
    expect(data.error).toContain("Asset statements");
  });

  it("proceeds to submission when all required documents are uploaded", async () => {
    const draft = {
      id: 1,
      household: [
        {
          id: "member-1",
          name: "John Doe",
          dateOfBirth: "1990-01-01",
          relationship: "applicant",
          isFullTimeStudent: false,
        },
      ],
      incomeSources: [
        {
          id: "income-1",
          householdMemberId: "member-1",
          sourceType: "employment" as const,
          amount: 3000,
          frequency: "monthly" as const,
        },
      ],
      assets: [],
    };

    // Mock queries in sequence
    vi.mocked(dbConnection.query)
      // Application query
      .mockResolvedValueOnce([{ property_id: "property-1", status: "draft" }])
      // Documents query - all required documents present
      .mockResolvedValueOnce([
        { document_type: "id_document" },
        { document_type: "income_verification" },
      ])
      // Rule version query
      .mockResolvedValueOnce([
        {
          id: 1,
          income_cap_annual: "50000",
          max_occupancy: 4,
          passbook_rate: "0.02",
          asset_threshold: "5000",
        },
      ])
      // Update application status
      .mockResolvedValueOnce([])
      // Get household member for income update
      .mockResolvedValueOnce([{ id: 100 }])
      // Update income source
      .mockResolvedValueOnce([])
      // Insert screening result
      .mockResolvedValueOnce([]);

    const request = new Request("http://localhost/api/applications/submit", {
      method: "POST",
      body: JSON.stringify(draft),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe("Application submitted successfully");
  });

  it("allows submission without income/asset documents if no income/assets exist", async () => {
    const draft = {
      id: 1,
      household: [
        {
          id: "member-1",
          name: "John Doe",
          dateOfBirth: "1990-01-01",
          relationship: "applicant",
          isFullTimeStudent: false,
        },
      ],
      incomeSources: [],
      assets: [],
    };

    // Mock queries in sequence
    vi.mocked(dbConnection.query)
      // Application query
      .mockResolvedValueOnce([{ property_id: "property-1", status: "draft" }])
      // Documents query - only ID document (income/asset docs not required)
      .mockResolvedValueOnce([{ document_type: "id_document" }])
      // Rule version query
      .mockResolvedValueOnce([
        {
          id: 1,
          income_cap_annual: "50000",
          max_occupancy: 4,
          passbook_rate: "0.02",
          asset_threshold: "5000",
        },
      ])
      // Update application status
      .mockResolvedValueOnce([])
      // Insert screening result
      .mockResolvedValueOnce([]);

    const request = new Request("http://localhost/api/applications/submit", {
      method: "POST",
      body: JSON.stringify(draft),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });
});
