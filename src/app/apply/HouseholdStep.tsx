"use client";

import { useState, useEffect } from "react";
import { List, Row } from "@/components/List";
import { Button } from "@/components/Button";
import { AlertDialog } from "@/components/AlertDialog";
import { MemberModal } from "./MemberModal";
import type { ApplicationDraft, HouseholdMemberDraft } from "./types";

interface HouseholdStepProps {
  draft: ApplicationDraft;
  onUpdate: (draft: ApplicationDraft) => void;
}

export function HouseholdStep({ draft, onUpdate }: HouseholdStepProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<
    HouseholdMemberDraft | undefined
  >();
  const [isSaving, setIsSaving] = useState(false);
  const [deletingMember, setDeletingMember] = useState<
    HouseholdMemberDraft | undefined
  >();

  // Auto-save draft when household changes
  useEffect(() => {
    if (draft.household.length > 0) {
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

  const handleAddMember = () => {
    setEditingMember(undefined);
    setIsModalOpen(true);
  };

  const handleEditMember = (member: HouseholdMemberDraft) => {
    setEditingMember(member);
    setIsModalOpen(true);
  };

  const handleSaveMember = (member: HouseholdMemberDraft) => {
    const existingIndex = draft.household.findIndex((m) => m.id === member.id);

    let updatedHousehold: HouseholdMemberDraft[];
    if (existingIndex >= 0) {
      // Update existing
      updatedHousehold = [...draft.household];
      updatedHousehold[existingIndex] = member;
    } else {
      // Add new
      updatedHousehold = [...draft.household, member];
    }

    onUpdate({ ...draft, household: updatedHousehold });
  };

  const handleDeleteMember = (member: HouseholdMemberDraft) => {
    setDeletingMember(member);
  };

  const confirmDeleteMember = () => {
    if (!deletingMember) return;

    const memberId = deletingMember.id;

    // Cascade delete: remove member and all associated income sources and assets
    const updatedHousehold = draft.household.filter((m) => m.id !== memberId);
    const updatedIncomeSources = draft.incomeSources.filter(
      (s) => s.householdMemberId !== memberId
    );
    const updatedAssets = draft.assets.filter(
      (a) => a.householdMemberId !== memberId
    );

    onUpdate({
      ...draft,
      household: updatedHousehold,
      incomeSources: updatedIncomeSources,
      assets: updatedAssets,
    });

    setDeletingMember(undefined);
  };

  const getAssociatedItems = (memberId: string) => {
    const incomeCount = draft.incomeSources.filter(
      (s) => s.householdMemberId === memberId
    ).length;
    const assetCount = draft.assets.filter(
      (a) => a.householdMemberId === memberId
    ).length;
    return { incomeCount, assetCount };
  };

  const formatDate = (dateStr: string): string => {
    // Parse ISO date string (YYYY-MM-DD) and construct local date
    const isoRegex = /^(\d{4})-(\d{2})-(\d{2})$/;
    const match = dateStr.match(isoRegex);
    if (!match) return dateStr;

    const year = parseInt(match[1] ?? '0');
    const month = parseInt(match[2] ?? '1') - 1; // 0-indexed
    const day = parseInt(match[3] ?? '1');

    const date = new Date(year, month, day);
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const getAge = (dateStr: string): number => {
    // Parse ISO date string (YYYY-MM-DD) and construct local date
    const isoRegex = /^(\d{4})-(\d{2})-(\d{2})$/;
    const match = dateStr.match(isoRegex);
    if (!match) return 0;

    const year = parseInt(match[1] ?? '0');
    const month = parseInt(match[2] ?? '1') - 1; // 0-indexed
    const day = parseInt(match[3] ?? '1');

    const dob = new Date(year, month, day);
    const today = new Date();

    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="px-gutter">
        <h2 className="text-title-3 mb-2">Household Composition</h2>
        <p className="text-callout text-secondary-label">
          Add all household members who will be living in the unit. You must add
          at least one member to continue.
        </p>
      </div>

      {/* Member List */}
      {draft.household.length > 0 ? (
        <List>
          {draft.household.map((member) => (
            <Row
              key={member.id}
              onEdit={() => handleEditMember(member)}
              onDelete={() => handleDeleteMember(member)}
            >
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="block text-body font-semibold">
                    {member.name}
                  </span>
                  {member.isFullTimeStudent && (
                    <span className="text-caption text-system-blue bg-system-blue/10 px-2 py-0.5 rounded">
                      Student
                    </span>
                  )}
                </div>
                <span className="block text-footnote text-secondary-label">
                  {member.relationship.charAt(0).toUpperCase() +
                    member.relationship.slice(1)}{" "}
                  · Age {getAge(member.dateOfBirth)} · Born{" "}
                  {formatDate(member.dateOfBirth)}
                </span>
              </div>
            </Row>
          ))}
        </List>
      ) : (
        <div className="px-gutter">
          <div className="bg-secondary-grouped-background rounded-ios-card p-6 shadow-card card-highlight text-center">
            <p className="text-body text-secondary-label">
              No household members yet. Tap "Add Member" to get started.
            </p>
          </div>
        </div>
      )}

      {/* Add Button */}
      <div className="px-gutter">
        <Button variant="tinted" onClick={handleAddMember} className="w-full">
          + Add Member
        </Button>
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
      <MemberModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveMember}
        member={editingMember}
      />

      {/* Delete Confirmation */}
      {deletingMember && (
        <AlertDialog
          isOpen={true}
          onClose={() => setDeletingMember(undefined)}
          title="Remove Household Member?"
          message={
            <>
              <p>
                Are you sure you want to remove <strong>{deletingMember.name}</strong>?
              </p>
              {(() => {
                const { incomeCount, assetCount } = getAssociatedItems(deletingMember.id);
                if (incomeCount > 0 || assetCount > 0) {
                  return (
                    <p className="mt-2 text-system-red">
                      This will also remove {incomeCount} income source{incomeCount !== 1 ? 's' : ''} and {assetCount} asset{assetCount !== 1 ? 's' : ''} associated with this member.
                    </p>
                  );
                }
                return null;
              })()}
            </>
          }
          confirmText="Remove"
          confirmVariant="destructive"
          onConfirm={confirmDeleteMember}
        />
      )}
    </div>
  );
}
