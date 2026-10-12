"use client";

import { useState, useEffect } from "react";
import { List, Row } from "@/components/List";
import { Button } from "@/components/Button";
import { AlertDialog } from "@/components/AlertDialog";
import { AssetModal } from "./AssetModal";
import type { ApplicationDraft, AssetDraft } from "./types";

interface AssetsStepProps {
  draft: ApplicationDraft;
  onUpdate: (draft: ApplicationDraft) => void;
}

export function AssetsStep({ draft, onUpdate }: AssetsStepProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<AssetDraft | undefined>();
  const [isSaving, setIsSaving] = useState(false);
  const [deletingAsset, setDeletingAsset] = useState<AssetDraft | undefined>();

  // Auto-save draft when assets change
  useEffect(() => {
    if (draft.assets.length > 0) {
      saveDraft();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.assets]);

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

  const handleAddAsset = () => {
    setEditingAsset(undefined);
    setIsModalOpen(true);
  };

  const handleEditAsset = (asset: AssetDraft) => {
    setEditingAsset(asset);
    setIsModalOpen(true);
  };

  const handleSaveAsset = (asset: AssetDraft) => {
    const existingIndex = draft.assets.findIndex((a) => a.id === asset.id);

    let updatedAssets: AssetDraft[];
    if (existingIndex >= 0) {
      // Update existing
      updatedAssets = [...draft.assets];
      updatedAssets[existingIndex] = asset;
    } else {
      // Add new
      updatedAssets = [...draft.assets, asset];
    }

    onUpdate({ ...draft, assets: updatedAssets });
  };

  const handleDeleteAsset = (asset: AssetDraft) => {
    setDeletingAsset(asset);
  };

  const confirmDeleteAsset = () => {
    if (!deletingAsset) return;

    const updatedAssets = draft.assets.filter((a) => a.id !== deletingAsset.id);
    onUpdate({ ...draft, assets: updatedAssets });

    setDeletingAsset(undefined);
  };

  const formatAssetType = (type: string): string => {
    const formatted = type.replace(/_/g, " ");
    return formatted
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getMemberName = (memberId: string): string => {
    const member = draft.household.find((m) => m.id === memberId);
    return member?.name || "Unknown";
  };

  // Group assets by household member
  const assetsByMember = draft.household.map((member) => ({
    member,
    assets: draft.assets.filter(
      (asset) => asset.householdMemberId === member.id
    ),
  }));

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="px-gutter">
        <h2 className="text-title-3 mb-2">Household Assets</h2>
        <p className="text-callout text-secondary-label">
          Add all assets for each household member, including bank accounts,
          stocks, bonds, real property, and retirement accounts. These are used
          for TIC Part IV asset imputation calculations.
        </p>
      </div>

      {/* Assets List by Member */}
      {draft.assets.length > 0 ? (
        <div className="space-y-4">
          {assetsByMember.map(({ member, assets }) => {
            if (assets.length === 0) return null;

            return (
              <div key={member.id}>
                <div className="px-gutter pb-2">
                  <h3 className="text-subhead text-secondary-label font-semibold">
                    {member.name}
                  </h3>
                </div>
                <List>
                  {assets.map((asset) => (
                    <Row
                      key={asset.id}
                      onEdit={() => handleEditAsset(asset)}
                      onDelete={() => handleDeleteAsset(asset)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="block text-body font-semibold">
                            {formatAssetType(asset.assetType)}
                          </span>
                          <span className="text-body text-label">
                            {formatCurrency(asset.cashValue)}
                          </span>
                        </div>
                        <span className="block text-footnote text-secondary-label">
                          Annual income: {formatCurrency(asset.annualIncome)}
                        </span>
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
              No assets yet. Tap "Add Asset" to get started, or skip if there
              are no assets to report.
            </p>
          </div>
        </div>
      )}

      {/* Add Button */}
      <div className="px-gutter">
        <Button
          variant="tinted"
          onClick={handleAddAsset}
          className="w-full"
          disabled={draft.household.length === 0}
        >
          + Add Asset
        </Button>
        {draft.household.length === 0 && (
          <p className="text-footnote text-secondary-label text-center mt-2">
            Add household members first to add assets
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
      <AssetModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveAsset}
        asset={editingAsset}
        householdMembers={draft.household}
      />

      {/* Delete Confirmation */}
      {deletingAsset && (
        <AlertDialog
          isOpen={true}
          onClose={() => setDeletingAsset(undefined)}
          title="Remove Asset?"
          message={`Are you sure you want to remove this ${formatAssetType(deletingAsset.assetType)} asset for ${getMemberName(deletingAsset.householdMemberId)}?`}
          confirmText="Remove"
          confirmVariant="destructive"
          onConfirm={confirmDeleteAsset}
        />
      )}
    </div>
  );
}
