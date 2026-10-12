import { NextResponse } from "next/server";
import { query } from "@/db/connection";
import { getCurrentSession } from "@/lib/get-current-user";

export type QueueApplication = {
  id: number;
  applicantEmail: string;
  applicantName: string;
  submittedAt: string;
  householdSize: number;
  screeningPassed: boolean | null;
  screeningFailureCount: number;
  screeningFailureReasons: string[] | null;
};

export async function GET() {
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
    // Fetch all submitted applications with their latest versions only
    // An application is "latest" if it has no child version that references it as parent_application_id
    const applications = await query<{
      id: number;
      applicant_email: string;
      applicant_name: string;
      submitted_at: string;
      household_size: number | null;
      screening_passed: boolean | null;
      screening_failure_reasons: string[] | string | null;
    }>(
      `SELECT
        a.id,
        a.applicant_email,
        a.applicant_name,
        a.submitted_at,
        (SELECT COUNT(*) FROM household_members WHERE application_id = a.id) as household_size,
        sr.passed as screening_passed,
        sr.failure_reasons as screening_failure_reasons
      FROM applications a
      LEFT JOIN screening_results sr ON sr.application_id = a.id
      WHERE a.status = 'submitted'
        AND NOT EXISTS (
          SELECT 1 FROM applications child
          WHERE child.parent_application_id = a.id
        )
      ORDER BY a.submitted_at DESC`
    );

    const queueApplications: QueueApplication[] = applications.map((app) => {
      // Normalize failure_reasons: JSONB columns return as arrays directly,
      // but legacy data might be a string. Handle both gracefully.
      let failureReasons: string[] | null = null;
      if (app.screening_failure_reasons) {
        try {
          if (Array.isArray(app.screening_failure_reasons)) {
            // Modern JSONB data: already an array
            failureReasons = app.screening_failure_reasons;
          } else if (typeof app.screening_failure_reasons === 'string') {
            // Legacy data: stored as plain string or JSON string
            try {
              const parsed = JSON.parse(app.screening_failure_reasons);
              failureReasons = Array.isArray(parsed) ? parsed : [app.screening_failure_reasons];
            } catch {
              // Not valid JSON, treat as plain string
              failureReasons = [app.screening_failure_reasons];
            }
          }
        } catch (error) {
          console.error(`Failed to parse failure_reasons for application ${app.id}:`, error);
          failureReasons = null;
        }
      }

      return {
        id: app.id,
        applicantEmail: app.applicant_email,
        applicantName: app.applicant_name,
        submittedAt: app.submitted_at,
        householdSize: app.household_size ?? 0,
        screeningPassed: app.screening_passed,
        screeningFailureCount: failureReasons ? failureReasons.length : 0,
        screeningFailureReasons: failureReasons,
      };
    });

    return NextResponse.json(queueApplications);
  } catch (error) {
    console.error("Queue fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch review queue" },
      { status: 500 }
    );
  }
}
