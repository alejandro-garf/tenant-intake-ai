"use client";

import { useState, useEffect } from "react";
import { BottomSheet } from "@/components/BottomSheet";
import { TextField } from "@/components/TextField";
import { SelectField } from "@/components/SelectField";
import { Button } from "@/components/Button";
import type {
  AssetDraft,
  HouseholdMemberDraft,
  AssetType,
} from "./types";

interface AssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (asset: AssetDraft) => void;
  asset?: AssetDraft;
  householdMembers: HouseholdMemberDraft[];
}

const ASSET_TYPE_OPTIONS: Array<{ value: AssetType; label: string }> = [
  { value: "checking", label: "Checking Account" },
  { value: "savings", label: "Savings Account" },
  { value: "cd", label: "Certificate of Deposit (CD)" },
  { value: "stocks_bonds", label: "Stocks/Bonds" },
  { value: "real_property", label: "Real Property" },
  { value: "retirement_account", label: "Retirement Account" },
  { value: "other", label: "Other" },
];

export function AssetModal({
  isOpen,
  onClose,
  onSave,
  asset,
  householdMembers,
}: AssetModalProps) {
  const [householdMemberId, setHouseholdMemberId] = useState("");
  const [assetType, setAssetType] = useState<AssetType>("checking");
  const [cashValue, setCashValue] = useState("");
  const [annualIncome, setAnnualIncome] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Populate form when editing
  useEffect(() => {
    if (asset) {
      setHouseholdMemberId(asset.householdMemberId);
      setAssetType(asset.assetType);
      setCashValue(asset.cashValue.toString());
      setAnnualIncome(asset.annualIncome.toString());
    } else {
      // Reset form for new asset
      setHouseholdMemberId(householdMembers[0]?.id || "");
      setAssetType("checking");
      setCashValue("");
      setAnnualIncome("");
    }
    setErrors({});
  }, [asset, isOpen, householdMembers]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!householdMemberId) {
      newErrors.householdMemberId = "Please select a household member";
    }

    const parsedCashValue = parseFloat(cashValue);
    if (!cashValue.trim()) {
      newErrors.cashValue = "Cash value is required";
    } else if (isNaN(parsedCashValue) || parsedCashValue < 0) {
      newErrors.cashValue = "Cash value must be a non-negative number";
    }

    const parsedAnnualIncome = parseFloat(annualIncome);
    if (!annualIncome.trim()) {
      newErrors.annualIncome = "Annual income is required";
    } else if (isNaN(parsedAnnualIncome) || parsedAnnualIncome < 0) {
      newErrors.annualIncome = "Annual income must be a non-negative number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    const assetData: AssetDraft = {
      id: asset?.id || crypto.randomUUID(),
      householdMemberId,
      assetType,
      cashValue: parseFloat(cashValue),
      annualIncome: parseFloat(annualIncome),
    };

    onSave(assetData);
    onClose();
  };

  const memberOptions = householdMembers.map((member) => ({
    value: member.id,
    label: member.name,
  }));

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={asset ? "Edit Asset" : "Add Asset"}
    >
      <div className="space-y-6 p-gutter">
        <SelectField
          label="Household Member"
          value={householdMemberId}
          onChange={(e) => setHouseholdMemberId(e.target.value)}
          options={memberOptions}
          error={errors.householdMemberId}
        />

        <SelectField
          label="Asset Type"
          value={assetType}
          onChange={(e) => setAssetType(e.target.value as AssetType)}
          options={ASSET_TYPE_OPTIONS}
        />

        <TextField
          label="Cash Value"
          type="number"
          value={cashValue}
          onChange={(e) => setCashValue(e.target.value)}
          error={errors.cashValue}
          placeholder="0.00"
        />

        <TextField
          label="Actual Annual Income from Asset"
          type="number"
          value={annualIncome}
          onChange={(e) => setAnnualIncome(e.target.value)}
          error={errors.annualIncome}
          placeholder="0.00"
        />

        <div className="pt-4">
          <Button variant="filled" onClick={handleSave} className="w-full">
            {asset ? "Save Changes" : "Add Asset"}
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}
