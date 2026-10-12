"use client";

import { useState } from "react";
import { BottomSheet } from "@/components/BottomSheet";
import { Button } from "@/components/Button";
import type { ReviewerDecision } from "@/app/api/review/applications/[id]/decisions/route";

interface DecisionCaptureProps {
  applicationId: number;
  onDecisionCreated: (decision: ReviewerDecision) => void;
}

export function DecisionCapture({
  applicationId,
  onDecisionCreated,
}: DecisionCaptureProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [decision, setDecision] = useState<
    "approved" | "denied" | "needs_more_info" | ""
  >("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!decision) {
      setError("Please select a decision");
      return;
    }

    if (
      (decision === "denied" || decision === "needs_more_info") &&
      !notes.trim()
    ) {
      setError("Notes are required for this decision type");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const response = await fetch(
        `/api/review/applications/${applicationId}/decisions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            decision,
            notes: notes.trim() || null,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save decision");
      }

      const newDecision: ReviewerDecision = await response.json();

      // Reset form
      setDecision("");
      setNotes("");
      setIsOpen(false);

      // Notify parent
      onDecisionCreated(newDecision);
    } catch (err) {
      console.error("Decision submission error:", err);
      setError(err instanceof Error ? err.message : "Failed to save decision");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setIsOpen(false);
      setError(null);
    }
  };

  const decisionOptions = [
    { value: "approved", label: "Approved", color: "text-system-green" },
    { value: "denied", label: "Denied", color: "text-system-red" },
    {
      value: "needs_more_info",
      label: "Needs More Info",
      color: "text-system-orange",
    },
  ];

  return (
    <>
      <div className="px-gutter">
        <Button onClick={() => setIsOpen(true)} variant="filled">
          Make Decision
        </Button>
      </div>

      <BottomSheet
        isOpen={isOpen}
        onClose={handleClose}
        title="Record Decision"
      >
        <div className="px-gutter py-6 space-y-6">
          {/* Decision Selection */}
          <div>
            <label className="block text-callout font-semibold text-label mb-3">
              Decision
            </label>
            <div className="space-y-3">
              {decisionOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center p-4 bg-secondary-grouped-background rounded-ios-card shadow-card card-highlight cursor-pointer"
                >
                  <input
                    type="radio"
                    name="decision"
                    value={option.value}
                    checked={decision === option.value}
                    onChange={(e) =>
                      setDecision(
                        e.target.value as
                          | "approved"
                          | "denied"
                          | "needs_more_info"
                      )
                    }
                    disabled={isSubmitting}
                    className="w-5 h-5 text-system-blue focus:ring-system-blue focus:ring-2 cursor-pointer"
                  />
                  <span
                    className={`ml-3 text-body font-semibold ${option.color}`}
                  >
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label
              htmlFor="notes"
              className="block text-callout font-semibold text-label mb-2"
            >
              Notes{" "}
              {(decision === "denied" || decision === "needs_more_info") && (
                <span className="text-system-red">*</span>
              )}
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isSubmitting}
              placeholder="Explain your decision..."
              rows={6}
              className="w-full px-4 py-3 bg-secondary-grouped-background rounded-ios-card text-body placeholder:text-tertiary-label focus:outline-none focus:ring-2 focus:ring-system-blue disabled:opacity-50 resize-none"
            />
            {(decision === "denied" || decision === "needs_more_info") && (
              <p className="text-footnote text-tertiary-label mt-2">
                Required for this decision type
              </p>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-system-red/10 border border-system-red/30 rounded-ios-card p-4">
              <p className="text-callout text-system-red font-semibold">
                {error}
              </p>
            </div>
          )}

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            variant="filled"
            className="w-full"
          >
            {isSubmitting ? "Saving..." : "Save Decision"}
          </Button>
        </div>
      </BottomSheet>
    </>
  );
}
