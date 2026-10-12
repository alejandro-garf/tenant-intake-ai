"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { NavHeader } from "@/components/NavHeader";
import { List, Row } from "@/components/List";
import type { QueueApplication } from "@/app/api/review/queue/route";

export default function ReviewQueuePage() {
  const router = useRouter();
  const [applications, setApplications] = useState<QueueApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQueue = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/review/queue");

        if (!response.ok) {
          throw new Error("Failed to fetch review queue");
        }

        const data = await response.json();
        setApplications(data);
      } catch (err) {
        console.error("Queue fetch error:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load review queue"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchQueue();
  }, []);

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getScreeningLabel = (app: QueueApplication): string => {
    if (app.screeningPassed === null) {
      return "Awaiting review";
    }

    if (app.screeningPassed) {
      return "Screening: No issues flagged";
    }

    const count = app.screeningFailureCount;
    return `Screening: ${count} ${count === 1 ? "issue" : "issues"} flagged`;
  };

  const getScreeningColor = (app: QueueApplication): string => {
    if (app.screeningPassed === null) {
      return "text-secondary-label";
    }

    if (app.screeningPassed) {
      return "text-system-green";
    }

    return "text-system-orange";
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen">
        <NavHeader title="Review Queue" />
        <div className="py-6 px-gutter">
          <div className="bg-secondary-grouped-background rounded-ios-card p-8 shadow-card card-highlight text-center">
            <p className="text-body text-secondary-label">Loading applications...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen">
        <NavHeader title="Review Queue" />
        <div className="py-6 px-gutter">
          <div className="bg-secondary-grouped-background rounded-ios-card p-8 shadow-card card-highlight text-center">
            <p className="text-body text-system-red mb-2">Error</p>
            <p className="text-callout text-secondary-label">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (applications.length === 0) {
    return (
      <div className="min-h-screen">
        <NavHeader title="Review Queue" />
        <div className="py-6 px-gutter">
          <div className="bg-secondary-grouped-background rounded-ios-card p-8 shadow-card card-highlight text-center">
            <div className="w-16 h-16 bg-tertiary-grouped-background rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-secondary-label"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h2 className="text-title-3 mb-2">No Applications</h2>
            <p className="text-callout text-secondary-label">
              There are no submitted applications to review at this time.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Queue list
  return (
    <div className="min-h-screen pb-8">
      <NavHeader title="Review Queue" />

      <div className="py-6 space-y-6">
        {/* Summary */}
        <div className="px-gutter">
          <p className="text-callout text-secondary-label">
            {applications.length} {applications.length === 1 ? "application" : "applications"} awaiting review
          </p>
        </div>

        {/* Application List */}
        <List>
          {applications.map((app) => (
            <Row
              key={app.id}
              chevron
              onClick={() => router.push(`/review/${app.id}`)}
            >
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="block text-body font-semibold">
                    {app.applicantName}
                  </span>
                  <span className="text-footnote text-tertiary-label">
                    {formatDate(app.submittedAt)}
                  </span>
                </div>
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-footnote text-secondary-label">
                    Household size: {app.householdSize}
                  </span>
                </div>
                <span
                  className={`block text-footnote ${getScreeningColor(app)}`}
                >
                  {getScreeningLabel(app)}
                </span>
              </div>
            </Row>
          ))}
        </List>
      </div>
    </div>
  );
}
