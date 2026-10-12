"use client";

import { useState, useEffect } from "react";
import { BottomSheet } from "@/components/BottomSheet";
import { TextField } from "@/components/TextField";
import { DatePicker } from "@/components/DatePicker";
import { SelectField } from "@/components/SelectField";
import { Button } from "@/components/Button";
import { Switch } from "@/components/Switch";
import type { HouseholdMemberDraft } from "./types";

interface MemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (member: HouseholdMemberDraft) => void;
  member?: HouseholdMemberDraft;
}

const RELATIONSHIP_OPTIONS = [
  { value: "applicant", label: "Applicant" },
  { value: "spouse", label: "Spouse" },
  { value: "child", label: "Child" },
  { value: "parent", label: "Parent" },
  { value: "sibling", label: "Sibling" },
  { value: "other", label: "Other" },
];

export function MemberModal({
  isOpen,
  onClose,
  onSave,
  member,
}: MemberModalProps) {
  const [name, setName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [relationship, setRelationship] = useState("applicant");
  const [isFullTimeStudent, setIsFullTimeStudent] = useState(false);
  const [ssnLast4, setSsnLast4] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Calculate age from date of birth (timezone-safe)
  const getAge = (dateStr: string): number | null => {
    if (!dateStr) return null;

    // Parse ISO date string (YYYY-MM-DD) and construct local date
    const isoRegex = /^(\d{4})-(\d{2})-(\d{2})$/;
    const match = dateStr.match(isoRegex);
    if (!match) return null;

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

  const age = getAge(dateOfBirth);
  const requiresSSN = age !== null && age >= 15;

  // Populate form when editing
  useEffect(() => {
    if (member) {
      setName(member.name);
      setDateOfBirth(member.dateOfBirth);
      setRelationship(member.relationship);
      setIsFullTimeStudent(member.isFullTimeStudent);
      setSsnLast4(member.ssnLast4 || "");
    } else {
      // Reset form for new member
      setName("");
      setDateOfBirth("");
      setRelationship("applicant");
      setIsFullTimeStudent(false);
      setSsnLast4("");
    }
    setErrors({});
  }, [member, isOpen]);

  // Clear SSN when age drops below 15
  useEffect(() => {
    if (!requiresSSN && ssnLast4) {
      setSsnLast4("");
    }
  }, [requiresSSN, ssnLast4]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!dateOfBirth) {
      newErrors.dateOfBirth = "Date of birth is required";
    } else {
      // Validate ISO format first
      const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!isoRegex.test(dateOfBirth)) {
        newErrors.dateOfBirth = "Invalid date format";
      } else {
        // Parse components from the ISO string
        const [year, month, day] = dateOfBirth.split('-').map(Number);

        // Construct date using LOCAL timezone (not UTC) to avoid off-by-one errors
        const dob = new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
        const today = new Date();

        // Check if date is valid (catches impossible dates like Feb 30)
        if (isNaN(dob.getTime())) {
          newErrors.dateOfBirth = "Please select a valid date";
        } else if (
          dob.getFullYear() !== year ||
          dob.getMonth() !== (month ?? 1) - 1 ||
          dob.getDate() !== day
        ) {
          // Date components don't match - invalid date like Feb 30
          newErrors.dateOfBirth = "Invalid date";
        } else if (dob > today) {
          newErrors.dateOfBirth = "Date of birth cannot be in the future";
        } else if (year && year < 1900) {
          newErrors.dateOfBirth = "Please enter a valid date of birth";
        }
      }
    }

    // SSN last 4 validation (optional but must be valid if provided)
    if (ssnLast4) {
      // Must be exactly 4 digits
      if (!/^\d{4}$/.test(ssnLast4)) {
        newErrors.ssnLast4 = "Must be exactly 4 digits";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    const memberData: HouseholdMemberDraft = {
      id: member?.id || crypto.randomUUID(),
      name: name.trim(),
      dateOfBirth,
      relationship,
      isFullTimeStudent,
      ssnLast4: ssnLast4 || undefined,
    };

    onSave(memberData);
    onClose();
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={member ? "Edit Member" : "Add Member"}>
      <div className="space-y-6 p-gutter">
        <TextField
          label="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          placeholder="Enter full name"
        />

        <DatePicker
          label="Date of Birth"
          value={dateOfBirth}
          onChange={setDateOfBirth}
          error={errors.dateOfBirth}
          maxYear={new Date().getFullYear()}
          minYear={1900}
        />

        <SelectField
          label="Relationship"
          value={relationship}
          onChange={(e) => setRelationship(e.target.value)}
          options={RELATIONSHIP_OPTIONS}
        />

        {/* SSN last 4 - only shown for members 15+ */}
        {requiresSSN && (
          <div>
            <TextField
              label="Social Security Number (Last 4 Digits)"
              value={ssnLast4}
              onChange={(e) => {
                // Only allow digits, max 4 characters
                const value = e.target.value.replace(/\D/g, "").slice(0, 4);
                setSsnLast4(value);
              }}
              error={errors.ssnLast4}
              placeholder="0000"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
            />
            <p className="text-footnote text-secondary-label px-4 mt-1">
              Optional. Required by CTCAC for members 15 and older. Enter last 4 digits only.
            </p>
          </div>
        )}

        <div className="space-y-2">
          <label className="block text-subhead text-secondary-label px-4">
            Full-Time Student
          </label>
          <div className="mx-gutter rounded-ios-card bg-secondary-grouped-background shadow-card card-highlight overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <span className="block text-body">Full-time student</span>
                <span className="block text-footnote text-secondary-label">
                  Currently enrolled full-time
                </span>
              </div>
              <Switch
                checked={isFullTimeStudent}
                onCheckedChange={setIsFullTimeStudent}
              />
            </div>
          </div>
        </div>

        <div className="pt-4">
          <Button variant="filled" onClick={handleSave} className="w-full">
            {member ? "Save Changes" : "Add Member"}
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}
