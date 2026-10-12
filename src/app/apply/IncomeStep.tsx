"use client";

import { useState, useEffect } from "react";
import { List, Row } from "@/components/List";
import { Button } from "@/components/Button";
import { AlertDialog } from "@/components/AlertDialog";
import { IncomeSourceModal } from "./IncomeSourceModal";
import type { ApplicationDraft, IncomeSourceDraft } from "./types";

interface IncomeStepProps {
  draft: ApplicationDraft;
  onUpdate: (draft: ApplicationDraft) => void;
}

export function IncomeStep({ draft, onUpdate }: IncomeStepProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIncomeSource, setEditingIncomeSource] = useState<
    IncomeSourceDraft | undefined
  >();
  const [isSaving, setIsSaving] = useState(false);
  const [deletingIncomeSource, setDeletingIncomeSource] = useState<
    IncomeSourceDraft | undefined
  >();

  // Auto-save draft when income sources change
  useEffect(() => {
    if (draft.incomeSources.length > 0) {
      saveDraft();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.incomeSources]);

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

  const handleAddIncomeSource = () => {
    setEditingIncomeSource(undefined);
    setIsModalOpen(true);
  };

  const handleEditIncomeSource = (incomeSource: IncomeSourceDraft) => {
    setEditingIncomeSource(incomeSource);
    setIsModalOpen(true);
  };

  const handleSaveIncomeSource = (incomeSource: IncomeSourceDraft) => {
    const existingIndex = draft.incomeSources.findIndex(
      (s) => s.id === incomeSource.id
    );

    let updatedIncomeSources: IncomeSourceDraft[];
    if (existingIndex >= 0) {
      // Update existing
      updatedIncomeSources = [...draft.incomeSources];
      updatedIncomeSources[existingIndex] = incomeSource;
    } else {
      // Add new
      updatedIncomeSources = [...draft.incomeSources, incomeSource];
    }

    onUpdate({ ...draft, incomeSources: updatedIncomeSources });
  };

  const handleDeleteIncomeSource = (incomeSource: IncomeSourceDraft) => {
    setDeletingIncomeSource(incomeSource);
  };

  const confirmDeleteIncomeSource = () => {
    if (!deletingIncomeSource) return;

    const updatedIncomeSources = draft.incomeSources.filter(
      (s) => s.id !== deletingIncomeSource.id
    );
    onUpdate({ ...draft, incomeSources: updatedIncomeSources });

    setDeletingIncomeSource(undefined);
  };

  const formatSourceType = (type: string): string => {
    const formatted = type.replace(/_/g, " ");
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  const formatAmount = (amount: number, frequency: string): string => {
    const formatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);

    return `${formatted} ${frequency}`;
  };

  const getMemberName = (memberId: string): string => {
    const member = draft.household.find((m) => m.id === memberId);
    return member?.name || "Unknown";
  };

  // Group income sources by household member
  const incomeSourcesByMember = draft.household.map((member) => ({
    member,
    incomeSources: draft.incomeSources.filter(
      (source) => source.householdMemberId === member.id
    ),
  }));

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="px-gutter">
        <h2 className="text-title-3 mb-2">Household Income</h2>
        <p className="text-callout text-secondary-label">
          Add all income sources for each household member. Include employment,
          Social Security, pensions, and any other regular income.
        </p>
      </div>

      {/* Income Sources List by Member */}
      {draft.incomeSources.length > 0 ? (
        <div className="space-y-4">
          {incomeSourcesByMember.map(({ member, incomeSources }) => {
            if (incomeSources.length === 0) return null;

            return (
              <div key={member.id}>
                <div className="px-gutter pb-2">
                  <h3 className="text-subhead text-secondary-label font-semibold">
                    {member.name}
                  </h3>
                </div>
                <List>
                  {incomeSources.map((source) => (
                    <Row
                      key={source.id}
                      onEdit={() => handleEditIncomeSource(source)}
                      onDelete={() => handleDeleteIncomeSource(source)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="block text-body font-semibold">
                            {formatSourceType(source.sourceType)}
                          </span>
                          <span className="text-body text-label">
                            {formatAmount(source.amount, source.frequency)}
                          </span>
                        </div>
                        {source.employerPayerName && (
                          <span className="block text-footnote text-secondary-label">
                            {source.employerPayerName}
                          </span>
                        )}
                      </div>
                    </Row>
                  ))}
                </List>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="px-gutter">
          <div className="bg-secondary-grouped-background rounded-ios-card p-6 shadow-card card-highlight text-center">
            <p className="text-body text-secondary-label">
              No income sources yet. Tap "Add Income Source" to get started.
            </p>
          </div>
        </div>
      )}

      {/* Add Button */}
      <div className="px-gutter">
        <Button
          variant="tinted"
          onClick={handleAddIncomeSource}
          className="w-full"
          disabled={draft.household.length === 0}
        >
          + Add Income Source
        </Button>
        {draft.household.length === 0 && (
          <p className="text-footnote text-secondary-label text-center mt-2">
            Add household members first to add income sources
          </p>
        )}
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

      {/* Modal */}
      <IncomeSourceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveIncomeSource}
        incomeSource={editingIncomeSource}
        householdMembers={draft.household}
      />

      {/* Delete Confirmation */}
      {deletingIncomeSource && (
        <AlertDialog
          isOpen={true}
          onClose={() => setDeletingIncomeSource(undefined)}
          title="Remove Income Source?"
          message={`Are you sure you want to remove this ${formatSourceType(deletingIncomeSource.sourceType)} income source for ${getMemberName(deletingIncomeSource.householdMemberId)}?`}
          confirmText="Remove"
          confirmVariant="destructive"
          onConfirm={confirmDeleteIncomeSource}
        />
      )}
    </div>
  );
}
