import { NextRequest, NextResponse } from "next/server";
import { query } from "@/db/connection";
import { getCurrentSession } from "@/lib/get-current-user";

export type ReviewerDecision = {
  id: number;
  applicationId: number;
  reviewerEmail: string;
  decision: "approved" | "denied" | "needs_more_info";
  notes: string | null;
  decidedAt: string;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // SECURITY: This route does NOT rely on middleware. Enforce auth here.
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "reviewer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!session.totpVerified) {
    return NextResponse.json({ error: "TOTP verification required" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const applicationId = parseInt(id, 10);

    if (isNaN(applicationId)) {
      return NextResponse.json(
        { error: "Invalid application ID" },
        { status: 400 }
      );
    }

    // Fetch all decisions for this application, newest first
    const decisions = await query<{
      id: number;
      application_id: number;
      reviewer_email: string;
      decision: "approved" | "denied" | "needs_more_info";
      notes: string | null;
      decided_at: string;
    }>(
      `SELECT id, application_id, reviewer_email, decision, notes, decided_at
       FROM reviewer_decisions
       WHERE application_id = $1
       ORDER BY decided_at DESC`,
      [applicationId]
    );

    const result: ReviewerDecision[] = decisions.map((d) => ({
      id: d.id,
      applicationId: d.application_id,
      reviewerEmail: d.reviewer_email,
      decision: d.decision,
      notes: d.notes,
      decidedAt: d.decided_at,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Decisions fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch decisions" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const applicationId = parseInt(id, 10);

    if (isNaN(applicationId)) {
      return NextResponse.json(
        { error: "Invalid application ID" },
        { status: 400 }
      );
    }

    // Get authenticated reviewer from session
    // SECURITY: Reviewer identity comes from the authenticated session ONLY.
    // A reviewer must never be able to type someone else's identity into a permanent audit record.
    const session = await getCurrentSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const reviewer = session.user;

    if (reviewer.role !== "reviewer") {
      return NextResponse.json(
        { error: "Only reviewers can make decisions" },
        { status: 403 }
      );
    }

    // CRITICAL: TOTP verification must be completed before making decisions
    if (!session.totpVerified) {
      return NextResponse.json(
        { error: "TOTP verification required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { decision, notes } = body;

    // Validate decision
    if (!["approved", "denied", "needs_more_info"].includes(decision)) {
      return NextResponse.json(
        { error: "Invalid decision value" },
        { status: 400 }
      );
    }

    // Require notes for denied and needs_more_info
    if ((decision === "denied" || decision === "needs_more_info") && !notes?.trim()) {
      return NextResponse.json(
        { error: "Notes are required for denied or needs_more_info decisions" },
        { status: 400 }
      );
    }

    // Verify application exists and is submitted
    const [application] = await query<{
      id: number;
      status: string;
    }>(
      `SELECT id, status FROM applications WHERE id = $1`,
      [applicationId]
    );

    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    if (application.status !== "submitted") {
      return NextResponse.json(
        { error: "Can only make decisions on submitted applications" },
        { status: 400 }
      );
    }

    // Insert decision (append-only, never update)
    // Use reviewer email from authenticated session
    const [newDecision] = await query<{
      id: number;
      application_id: number;
      reviewer_email: string;
      decision: "approved" | "denied" | "needs_more_info";
      notes: string | null;
      decided_at: string;
    }>(
      `INSERT INTO reviewer_decisions (application_id, reviewer_email, decision, notes)
       VALUES ($1, $2, $3, $4)
       RETURNING id, application_id, reviewer_email, decision, notes, decided_at`,
      [applicationId, reviewer.email, decision, notes || null]
    );

    if (!newDecision) {
      return NextResponse.json(
        { error: "Failed to create decision" },
        { status: 500 }
      );
    }

    const result: ReviewerDecision = {
      id: newDecision.id,
      applicationId: newDecision.application_id,
      reviewerEmail: newDecision.reviewer_email,
      decision: newDecision.decision,
      notes: newDecision.notes,
      decidedAt: newDecision.decided_at,
    };

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Decision creation error:", error);
    return NextResponse.json(
      { error: "Failed to create decision" },
      { status: 500 }
    );
  }
}
