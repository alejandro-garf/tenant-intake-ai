"use client";

import { useState, useMemo, useEffect } from "react";
import { NavHeader } from "@/components/NavHeader";
import { Button } from "@/components/Button";
import { HouseholdStep } from "./HouseholdStep";
import { IncomeStep } from "./IncomeStep";
import { AssetsStep } from "./AssetsStep";
import { DocumentsStep } from "./DocumentsStep";
import { StudentExemptionsStep } from "./StudentExemptionsStep";
import { ReviewStep } from "./ReviewStep";
import type { ApplicationDraft } from "./types";

export default function ApplyPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [draft, setDraft] = useState<ApplicationDraft>({
    household: [],
    incomeSources: [],
    assets: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Load existing draft on mount
  useEffect(() => {
    const loadDraft = async () => {
      try {
        const response = await fetch("/api/drafts");
        if (response.ok) {
          const loadedDraft: ApplicationDraft = await response.json();
          setDraft(loadedDraft);
        } else {
          console.error("Failed to load draft:", response.statusText);
        }
      } catch (error) {
        console.error("Error loading draft:", error);
      } finally {
        setIsLoading(false);
        setIsMounted(true);
      }
    };

    loadDraft();
  }, []);

  // Check if all household members are full-time students
  const allMembersAreStudents = useMemo(() => {
    if (draft.household.length === 0) return false;
    return draft.household.every((member) => member.isFullTimeStudent);
  }, [draft.household]);

  // Build dynamic step list based on household composition
  const STEPS = useMemo(() => {
    const steps = ["Household", "Income", "Assets", "Documents"];
    if (allMembersAreStudents) {
      steps.push("Student Exemptions");
    }
    steps.push("Review");
    return steps;
  }, [allMembersAreStudents]);

  const canGoNext = () => {
    if (currentStep === 0) {
      // Household step: must have at least one member
      return draft.household.length > 0;
    }
    // All other steps can proceed (rules engine and human reviewer decide eligibility)
    return true;
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleEdit = (stepIndex: number) => {
    setCurrentStep(stepIndex);
  };

  const handleSubmit = async () => {
    // Clear any previous errors
    setSubmitError(null);

    if (!draft.id) {
      const errorMsg = "Draft must be saved before submission";
      setSubmitError(errorMsg);
      console.error("Submit error:", errorMsg);
      throw new Error(errorMsg);
    }

    const response = await fetch("/api/applications/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });

    if (!response.ok) {
      // Parse JSON error from API response (only parse in try/catch)
      let errorMsg: string;
      try {
        const data = await response.json();
        errorMsg = data.error || "Failed to submit application";
      } catch (jsonError) {
        // If JSON parsing fails, use generic error
        errorMsg = `Failed to submit application (${response.status} ${response.statusText})`;
        console.error("Submit error (failed to parse JSON):", errorMsg);
      }

      // Set error state and throw AFTER try/catch
      console.error("Submit error from API:", errorMsg, "Status:", response.status);
      setSubmitError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  // Show loading state while fetching draft (prevents hydration mismatch)
  if (!isMounted || isLoading) {
    return (
      <div className="min-h-screen pb-32">
        <NavHeader title="Apply" />
        <div className="py-6 space-y-6">
          <div className="px-gutter">
            <div className="bg-secondary-grouped-background rounded-ios-card p-6 shadow-card card-highlight text-center">
              <p className="text-body text-secondary-label">Loading your application...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32">
      <NavHeader title="Apply" />

      <div className="py-6 space-y-6">
        {/* Progress Indicator */}
        <div className="px-gutter">
          <div className="flex items-center justify-between mb-2">
            <span className="text-subhead text-secondary-label">
              Step {currentStep + 1} of {STEPS.length}
            </span>
            <span className="text-subhead text-secondary-label">
              {STEPS[currentStep]}
            </span>
          </div>
          <div className="w-full h-1 bg-fill rounded-pill overflow-hidden">
            <div
              className="h-full bg-system-blue transition-all duration-300 ease-out"
              style={{
                width: `${((currentStep + 1) / STEPS.length) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Step Content */}
        {STEPS[currentStep] === "Household" && (
          <HouseholdStep draft={draft} onUpdate={setDraft} />
        )}
        {STEPS[currentStep] === "Income" && (
          <IncomeStep draft={draft} onUpdate={setDraft} />
        )}
        {STEPS[currentStep] === "Assets" && (
          <AssetsStep draft={draft} onUpdate={setDraft} />
        )}
        {STEPS[currentStep] === "Documents" && (
          <DocumentsStep draft={draft} onUpdate={setDraft} />
        )}
        {STEPS[currentStep] === "Student Exemptions" && (
          <StudentExemptionsStep draft={draft} onUpdate={setDraft} />
        )}
        {STEPS[currentStep] === "Review" && (
          <ReviewStep
            draft={draft}
            onEdit={handleEdit}
            onSubmit={handleSubmit}
            submitError={submitError}
          />
        )}

        {/* Navigation (hidden on Review step, which has its own controls) */}
        {STEPS[currentStep] !== "Review" && (
          <div className="px-gutter flex gap-3">
            {currentStep > 0 && (
              <Button variant="plain" onClick={handleBack} className="flex-1">
                Back
              </Button>
            )}
            <Button
              variant="filled"
              onClick={handleNext}
              disabled={!canGoNext()}
              className="flex-1"
            >
              Continue
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
