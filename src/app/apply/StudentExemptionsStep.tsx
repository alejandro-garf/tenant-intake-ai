"use client";

import { useState, useEffect } from "react";
import { List, Row } from "@/components/List";
import { SelectField } from "@/components/SelectField";
import type { ApplicationDraft, StudentExemption } from "./types";

interface StudentExemptionsStepProps {
  draft: ApplicationDraft;
  onUpdate: (draft: ApplicationDraft) => void;
}

// CTCAC TIC Part VII exemptions (April 2021)
const EXEMPTION_OPTIONS: Array<{
  value: StudentExemption;
  label: string;
  code: number;
}> = [
  { value: "receives_assistance_tanf", label: "AFDC/TANF Assistance", code: 1 },
  { value: "enrolled_job_training", label: "Job Training Program", code: 2 },
  { value: "single_parent_with_child", label: "Single Parent/Dependent Child", code: 3 },
  { value: "married_filing_jointly", label: "Married/Joint Return", code: 4 },
  { value: "former_foster_care", label: "Former Foster Care", code: 5 },
];

export function StudentExemptionsStep({
  draft,
  onUpdate,
}: StudentExemptionsStepProps) {
  const [isSaving, setIsSaving] = useState(false);

  // Auto-save draft when exemptions change
  useEffect(() => {
    // Only save if at least one member has an exemption
    const hasExemption = draft.household.some(
      (m) => m.studentExemptionType != null
    );
    if (hasExemption) {
      saveDraft();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.household]);

  const saveDraft = async () => {
    try {
      setIsSaving(true);
      const response = await fetch("/api/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });

      if (!response.ok) {
        throw new Error("Failed to save draft");
      }

      const data = await response.json();

      // Update draft with DB id if new
      if (!draft.id && data.id) {
        onUpdate({ ...draft, id: data.id });
      }
    } catch (error) {
      console.error("Draft save error:", error);
      // In production, show toast/alert
    } finally {
      setIsSaving(false);
    }
  };

  const handleExemptionChange = (
    memberId: string,
    exemption: StudentExemption | ""
  ) => {
    const updatedHousehold = draft.household.map((member) => {
      if (member.id === memberId) {
        return {
          ...member,
          studentExemptionType: exemption === "" ? undefined : exemption,
        };
      }
      return member;
    });

    onUpdate({ ...draft, household: updatedHousehold });
  };

  const getExemptionLabel = (exemption: StudentExemption | undefined) => {
    if (!exemption) return "None selected";
    const option = EXEMPTION_OPTIONS.find((opt) => opt.value === exemption);
    return option?.label || exemption;
  };

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="px-gutter">
        <h2 className="text-title-3 mb-2">Student Exemptions</h2>
        <p className="text-callout text-secondary-label mb-4">
          All household members are marked as full-time students. TIC Part VII
          provides specific exemptions for certain circumstances.
        </p>
        <p className="text-callout text-secondary-label">
          If any member qualifies for one of the exemptions below, select it
          here. Otherwise, you may continue and a reviewer will assess
          eligibility.
        </p>
      </div>

      {/* Member List with Exemption Selection */}
      <div className="space-y-4">
        <div className="px-gutter pb-2">
          <h3 className="text-subhead text-secondary-label font-semibold">
            Select Exemptions
          </h3>
        </div>
        <List>
          {draft.household.map((member) => (
            <Row key={member.id}>
              <div className="flex-1 space-y-3">
                <div>
                  <span className="block text-body font-semibold">
                    {member.name}
                  </span>
                  <span className="block text-footnote text-secondary-label">
                    {member.relationship.charAt(0).toUpperCase() +
                      member.relationship.slice(1)}
                  </span>
                </div>
                <SelectField
                  label="Exemption Type"
                  value={member.studentExemptionType || ""}
                  onChange={(e) =>
                    handleExemptionChange(
                      member.id,
                      e.target.value as StudentExemption | ""
                    )
                  }
                  options={[
                    { value: "", label: "None" },
                    ...EXEMPTION_OPTIONS,
                  ]}
                />
              </div>
            </Row>
          ))}
        </List>
      </div>

      {/* Exemption Summary */}
      <div className="px-gutter">
        <div className="bg-secondary-grouped-background rounded-ios-card p-4 shadow-card card-highlight">
          <h4 className="text-subhead font-semibold mb-3">Selected Exemptions</h4>
          <div className="space-y-2">
            {draft.household.map((member) => (
              <div key={member.id} className="flex justify-between">
                <span className="text-callout text-label">{member.name}</span>
                <span
                  className={`text-callout ${
                    member.studentExemptionType
                      ? "text-system-green font-semibold"
                      : "text-secondary-label"
                  }`}
                >
                  {getExemptionLabel(member.studentExemptionType)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Draft Status */}
      {isSaving && (
        <div className="px-gutter">
          <p className="text-footnote text-secondary-label text-center">
            Saving draft...
          </p>
        </div>
      )}
      {draft.id && !isSaving && (
        <div className="px-gutter">
          <p className="text-footnote text-secondary-label text-center">
            Draft saved
          </p>
        </div>
      )}
    </div>
  );
}
