"use client";

import { useState, useEffect } from "react";
import { BottomSheet } from "@/components/BottomSheet";
import { TextField } from "@/components/TextField";
import { SelectField } from "@/components/SelectField";
import { Button } from "@/components/Button";
import type {
  IncomeSourceDraft,
  HouseholdMemberDraft,
  IncomeSourceType,
  IncomeFrequency,
} from "./types";

interface IncomeSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (incomeSource: IncomeSourceDraft) => void;
  incomeSource?: IncomeSourceDraft;
  householdMembers: HouseholdMemberDraft[];
}

const SOURCE_TYPE_OPTIONS: Array<{ value: IncomeSourceType; label: string }> =
  [
    { value: "employment", label: "Employment" },
    { value: "social_security", label: "Social Security" },
    { value: "pension", label: "Pension" },
    { value: "tanf", label: "TANF" },
    { value: "child_support", label: "Child Support" },
    { value: "other", label: "Other" },
  ];

const FREQUENCY_OPTIONS: Array<{ value: IncomeFrequency; label: string }> = [
  { value: "hourly", label: "Hourly" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Biweekly" },
  { value: "semimonthly", label: "Semimonthly" },
  { value: "monthly", label: "Monthly" },
  { value: "annually", label: "Annually" },
];

export function IncomeSourceModal({
  isOpen,
  onClose,
  onSave,
  incomeSource,
  householdMembers,
}: IncomeSourceModalProps) {
  const [householdMemberId, setHouseholdMemberId] = useState("");
  const [sourceType, setSourceType] = useState<IncomeSourceType>("employment");
  const [employerPayerName, setEmployerPayerName] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<IncomeFrequency>("monthly");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Populate form when editing
  useEffect(() => {
    if (incomeSource) {
      setHouseholdMemberId(incomeSource.householdMemberId);
      setSourceType(incomeSource.sourceType);
      setEmployerPayerName(incomeSource.employerPayerName || "");
      setAmount(incomeSource.amount.toString());
      setFrequency(incomeSource.frequency);
    } else {
      // Reset form for new income source
      setHouseholdMemberId(householdMembers[0]?.id || "");
      setSourceType("employment");
      setEmployerPayerName("");
      setAmount("");
      setFrequency("monthly");
    }
    setErrors({});
  }, [incomeSource, isOpen, householdMembers]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!householdMemberId) {
      newErrors.householdMemberId = "Please select a household member";
    }

    const parsedAmount = parseFloat(amount);
    if (!amount.trim()) {
      newErrors.amount = "Amount is required";
    } else if (isNaN(parsedAmount) || parsedAmount <= 0) {
      newErrors.amount = "Amount must be a positive number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    const incomeSourceData: IncomeSourceDraft = {
      id: incomeSource?.id || crypto.randomUUID(),
      householdMemberId,
      sourceType,
      employerPayerName: employerPayerName.trim() || undefined,
      amount: parseFloat(amount),
      frequency,
    };

    onSave(incomeSourceData);
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
      title={incomeSource ? "Edit Income Source" : "Add Income Source"}
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
          label="Income Type"
          value={sourceType}
          onChange={(e) => setSourceType(e.target.value as IncomeSourceType)}
          options={SOURCE_TYPE_OPTIONS}
        />

        <TextField
          label="Employer/Payer Name (Optional)"
          value={employerPayerName}
          onChange={(e) => setEmployerPayerName(e.target.value)}
          placeholder="e.g., ABC Corp, Social Security Administration"
        />

        <TextField
          label="Amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          error={errors.amount}
          placeholder="0.00"
        />

        <SelectField
          label="Frequency"
          value={frequency}
          onChange={(e) => setFrequency(e.target.value as IncomeFrequency)}
          options={FREQUENCY_OPTIONS}
        />

        <div className="pt-4">
          <Button variant="filled" onClick={handleSave} className="w-full">
            {incomeSource ? "Save Changes" : "Add Income Source"}
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}
