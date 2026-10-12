"use client";

import { useState } from "react";
import { List, Row } from "@/components/List";
import { Button } from "@/components/Button";
import type { ApplicationDraft } from "./types";
import { convertToAnnual } from "@/lib/income";

interface ReviewStepProps {
  draft: ApplicationDraft;
  onEdit: (stepIndex: number) => void;
  onSubmit: () => void;
  submitError: string | null;
}

export function ReviewStep({ draft, onEdit, onSubmit, submitError }: ReviewStepProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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

  const formatSourceType = (type: string): string => {
    const formatted = type.replace(/_/g, " ");
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  const formatAssetType = (type: string): string => {
    const formatted = type.replace(/_/g, " ");
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  const formatExemption = (type: string): string => {
    const formatted = type.replace(/_/g, " ");
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatAmount = (amount: number, frequency: string): string => {
    const formatted = formatCurrency(amount);
    return `${formatted} ${frequency}`;
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

  // Group income sources and assets by household member
  const memberData = draft.household.map((member) => ({
    member,
    incomeSources: draft.incomeSources.filter(
      (source) => source.householdMemberId === member.id
    ),
    assets: draft.assets.filter((asset) => asset.householdMemberId === member.id),
  }));

  // Calculate total annual income for display
  const totalAnnualIncome = draft.incomeSources.reduce(
    (sum, source) => sum + convertToAnnual(source.amount, source.frequency),
    0
  );

  const totalAssetCashValue = draft.assets.reduce(
    (sum, asset) => sum + asset.cashValue,
    0
  );

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit();
      setSubmitted(true);
    } catch (error) {
      console.error("Submission error:", error);
      // In production, show error toast
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show confirmation after submission
  if (submitted) {
    return (
      <div className="px-gutter space-y-6">
        <div className="bg-secondary-grouped-background rounded-ios-card p-8 shadow-card card-highlight text-center">
          <div className="w-16 h-16 bg-system-green rounded-full mx-auto mb-4 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-title-2 mb-2">Application Submitted</h2>
          <p className="text-body text-secondary-label">
            Thank you for submitting your application. A reviewer will follow up
            with you soon.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="px-gutter">
        <h2 className="text-title-3 mb-2">Review & Submit</h2>
        <p className="text-callout text-secondary-label">
          Review your application below. Tap "Edit" next to any section to make
          changes.
        </p>
      </div>

      {/* Error Banner */}
      {submitError && (
        <div className="px-gutter">
          <div className="bg-system-red/10 border-l-4 border-system-red rounded-ios-card p-4 shadow-card">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-system-red flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="flex-1">
                <h3 className="text-body font-semibold text-system-red mb-1">
                  Submission Failed
                </h3>
                <p className="text-callout text-label">{submitError}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="px-gutter">
        <div className="bg-secondary-grouped-background rounded-ios-card p-4 shadow-card card-highlight">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-caption text-secondary-label">Household Size</p>
              <p className="text-title-3">{draft.household.length}</p>
            </div>
            <div>
              <p className="text-caption text-secondary-label">
                Total Annual Income
              </p>
              <p className="text-title-3">{formatCurrency(totalAnnualIncome)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Household Section */}
      <div>
        <div className="px-gutter pb-2 flex items-center justify-between">
          <h3 className="text-subhead text-secondary-label font-semibold">
            Household Members
          </h3>
          <button
            onClick={() => onEdit(0)}
            className="text-subhead text-system-blue"
          >
            Edit
          </button>
        </div>
        <List>
          {draft.household.map((member) => (
            <Row key={member.id}>
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
      </div>

      {/* Income Section */}
      {draft.incomeSources.length > 0 && (
        <div>
          <div className="px-gutter pb-2 flex items-center justify-between">
            <h3 className="text-subhead text-secondary-label font-semibold">
              Income Sources
            </h3>
            <button
              onClick={() => onEdit(1)}
              className="text-subhead text-system-blue"
            >
              Edit
            </button>
          </div>
          {memberData.map(({ member, incomeSources }) => {
            if (incomeSources.length === 0) return null;

            const memberAnnualIncome = incomeSources.reduce(
              (sum, source) => sum + convertToAnnual(source.amount, source.frequency),
              0
            );

            return (
              <div key={`income-${member.id}`} className="mb-4 last:mb-0">
                <div className="px-gutter pb-1">
                  <div className="flex items-center justify-between">
                    <p className="text-caption text-tertiary-label">
                      {member.name}
                    </p>
                    <p className="text-caption text-tertiary-label">
                      {formatCurrency(memberAnnualIncome)}/year
                    </p>
                  </div>
                </div>
                <List>
                  {incomeSources.map((source) => (
                    <Row key={source.id}>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="block text-body">
                            {formatSourceType(source.sourceType)}
                          </span>
                          <span className="text-body text-secondary-label">
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
      )}

      {/* Assets Section */}
      {draft.assets.length > 0 && (
        <div>
          <div className="px-gutter pb-2 flex items-center justify-between">
            <h3 className="text-subhead text-secondary-label font-semibold">
              Assets
            </h3>
            <button
              onClick={() => onEdit(2)}
              className="text-subhead text-system-blue"
            >
              Edit
            </button>
          </div>
          {memberData.map(({ member, assets }) => {
            if (assets.length === 0) return null;

            const memberAssetValue = assets.reduce(
              (sum, asset) => sum + asset.cashValue,
              0
            );

            return (
              <div key={`assets-${member.id}`} className="mb-4 last:mb-0">
                <div className="px-gutter pb-1">
                  <div className="flex items-center justify-between">
                    <p className="text-caption text-tertiary-label">
                      {member.name}
                    </p>
                    <p className="text-caption text-tertiary-label">
                      {formatCurrency(memberAssetValue)} total value
                    </p>
                  </div>
                </div>
                <List>
                  {assets.map((asset) => (
                    <Row key={asset.id}>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="block text-body">
                            {formatAssetType(asset.assetType)}
                          </span>
                          <span className="text-body text-secondary-label">
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
      )}

      {/* Student Exemptions Section */}
      {draft.household.some((m) => m.isFullTimeStudent && m.studentExemptionType) && (
        <div>
          <div className="px-gutter pb-2 flex items-center justify-between">
            <h3 className="text-subhead text-secondary-label font-semibold">
              Student Exemptions
            </h3>
            <button
              onClick={() => onEdit(3)}
              className="text-subhead text-system-blue"
            >
              Edit
            </button>
          </div>
          <List>
            {draft.household
              .filter((member) => member.isFullTimeStudent && member.studentExemptionType)
              .map((member) => (
                <Row key={member.id}>
                  <div className="flex-1">
                    <span className="block text-body font-semibold">
                      {member.name}
                    </span>
                    <span className="block text-footnote text-secondary-label">
                      {formatExemption(member.studentExemptionType!)}
                    </span>
                  </div>
                </Row>
              ))}
          </List>
        </div>
      )}

      {/* Submit Button */}
      <div className="px-gutter">
        <Button
          variant="filled"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full"
        >
          {isSubmitting ? "Submitting..." : "Submit Application"}
        </Button>
        <p className="text-footnote text-secondary-label text-center mt-3">
          By submitting, you confirm that the information provided is accurate and
          complete.
        </p>
      </div>
    </div>
  );
}
