"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { NavHeader } from "@/components/NavHeader";
import { List, Row } from "@/components/List";
import { Button } from "@/components/Button";
import type { ApplicationDetail } from "@/app/api/review/applications/[id]/route";
import type { ReviewerDecision } from "@/app/api/review/applications/[id]/decisions/route";
import { DecisionCapture } from "./DecisionCapture";
import { ExtractionResults } from "./ExtractionResults";

interface UploadedDocument {
  id: number;
  documentType: string;
  filename: string;
  size: number;
  contentType: string;
  uploadedAt: string;
  uploadedBy: string;
}

export default function ApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [application, setApplication] = useState<ApplicationDetail | null>(
    null
  );
  const [decisions, setDecisions] = useState<ReviewerDecision[]>([]);
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingTIC, setIsGeneratingTIC] = useState(false);
  const [ticError, setTicError] = useState<string | null>(null);
  const [overflowWarning, setOverflowWarning] = useState<string | null>(null);
  const [extractingDocumentId, setExtractingDocumentId] = useState<number | null>(null);
  const [expandedDocuments, setExpandedDocuments] = useState<Set<number>>(new Set());

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Fetch application, decisions, and documents in parallel
        const [appResponse, decisionsResponse, documentsResponse] = await Promise.all([
          fetch(`/api/review/applications/${params.id}`),
          fetch(`/api/review/applications/${params.id}/decisions`),
          fetch(`/api/documents?applicationId=${params.id}`),
        ]);

        if (!appResponse.ok) {
          throw new Error("Failed to fetch application");
        }

        const appData = await appResponse.json();
        setApplication(appData);

        if (decisionsResponse.ok) {
          const decisionsData = await decisionsResponse.json();
          setDecisions(decisionsData);
        }

        if (documentsResponse.ok) {
          const documentsData = await documentsResponse.json();
          setDocuments(documentsData.documents);
        }
      } catch (err) {
        console.error("Data fetch error:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load application"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [params.id]);

  const handleDecisionCreated = (newDecision: ReviewerDecision) => {
    setDecisions((prev) => [newDecision, ...prev]);
  };

  const handleViewDocument = async (documentId: number) => {
    try {
      const response = await fetch(`/api/documents/${documentId}`);
      if (!response.ok) {
        throw new Error('Failed to get document URL');
      }
      const data = await response.json();
      // Open in new tab
      window.open(data.url, '_blank');
    } catch (err) {
      console.error('Document view error:', err);
      alert(err instanceof Error ? err.message : 'Failed to view document');
    }
  };

  const handleExtractDocument = async (documentId: number) => {
    setExtractingDocumentId(documentId);
    try {
      const response = await fetch(`/api/documents/${documentId}/extract`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Extraction failed');
      }

      // Expand the document to show results
      setExpandedDocuments((prev) => new Set(prev).add(documentId));
    } catch (err) {
      console.error('Extraction error:', err);
      alert(err instanceof Error ? err.message : 'Failed to extract document');
    } finally {
      setExtractingDocumentId(null);
    }
  };

  const toggleDocumentExpanded = (documentId: number) => {
    setExpandedDocuments((prev) => {
      const next = new Set(prev);
      if (next.has(documentId)) {
        next.delete(documentId);
      } else {
        next.add(documentId);
      }
      return next;
    });
  };

  const handleGenerateTIC = async () => {
    if (!application) return;

    setIsGeneratingTIC(true);
    setTicError(null);
    setOverflowWarning(null);

    try {
      const response = await fetch(`/api/review/applications/${application.id}/tic`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate TIC');
      }

      // Check for overflow warnings in response headers
      const hasOverflow = response.headers.get('X-TIC-Overflow') === 'true';
      const overflowMessage = response.headers.get('X-TIC-Overflow-Message');

      if (hasOverflow && overflowMessage) {
        setOverflowWarning(overflowMessage);
      }

      // Download the PDF
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `TIC-Application-${application.id}-v${application.version}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('TIC generation error:', err);
      setTicError(err instanceof Error ? err.message : 'Failed to generate TIC');
    } finally {
      setIsGeneratingTIC(false);
    }
  };

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatFrequency = (freq: string): string => {
    const map: Record<string, string> = {
      hourly: "hourly",
      weekly: "weekly",
      biweekly: "bi-weekly",
      semimonthly: "semi-monthly",
      monthly: "monthly",
      annually: "annually",
    };
    return map[freq] ?? freq;
  };

  const formatStudentExemption = (exemption: string): string => {
    const map: Record<string, string> = {
      disabled_individual: "Disabled individual",
      receives_assistance_tanf: "Receives TANF assistance",
      enrolled_job_training: "Enrolled in job training",
      single_parent_with_child: "Single parent with child",
      married_filing_jointly: "Married filing jointly",
    };
    return map[exemption] ?? exemption;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const formatDocumentType = (type: string): string => {
    const map: Record<string, string> = {
      income_verification: "Income Verification",
      id_document: "ID Document",
      asset_statement: "Asset Statement",
      other: "Other",
    };
    return map[type] ?? type;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen">
        <NavHeader title="Application Detail" />
        <div className="py-6 px-gutter">
          <div className="bg-secondary-grouped-background rounded-ios-card p-8 shadow-card card-highlight text-center">
            <p className="text-body text-secondary-label">
              Loading application...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !application) {
    return (
      <div className="min-h-screen">
        <NavHeader title="Application Detail" />
        <div className="py-6 px-gutter">
          <div className="bg-secondary-grouped-background rounded-ios-card p-8 shadow-card card-highlight text-center">
            <p className="text-body text-system-red mb-2">Error</p>
            <p className="text-callout text-secondary-label">
              {error ?? "Application not found"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const allStudents =
    application.household.length > 0 &&
    application.household.every((m) => m.isFullTimeStudent);

  return (
    <div className="min-h-screen pb-8">
      <NavHeader title="Application Detail" />

      <div className="py-6 space-y-6">
        {/* Application Info */}
        <div className="px-gutter">
          <h2 className="text-title-2 font-bold mb-2">
            {application.applicantName}
          </h2>
          <div className="space-y-1">
            <p className="text-callout text-secondary-label">
              Submitted: {formatDate(application.submittedAt)}
            </p>
            <p className="text-callout text-secondary-label">
              Version {application.version} • ID {application.id}
            </p>
          </div>
        </div>

        {/* Screening Summary */}
        {application.screeningResult && (
          <div>
            <div className="px-gutter mb-3">
              <h3 className="text-headline font-semibold">
                Calculated Screening Result
              </h3>
              <p className="text-footnote text-tertiary-label mt-1">
                Computed from submitted data; subject to reviewer verification
              </p>
            </div>
            <List>
              <Row>
                <div className="flex-1">
                  <span className="text-callout text-secondary-label block">
                    Status
                  </span>
                  <span
                    className={`text-body font-semibold ${
                      application.screeningResult.passed
                        ? "text-system-green"
                        : "text-system-orange"
                    }`}
                  >
                    {application.screeningResult.passed
                      ? "No issues flagged"
                      : `${application.screeningResult.failureReasons.length} ${
                          application.screeningResult.failureReasons.length ===
                          1
                            ? "issue"
                            : "issues"
                        } flagged`}
                  </span>
                </div>
              </Row>

              {application.screeningResult.failureReasons.length > 0 && (
                <Row>
                  <div className="flex-1">
                    <span className="text-callout text-secondary-label block mb-2">
                      Issues Flagged
                    </span>
                    <ul className="space-y-1">
                      {application.screeningResult.failureReasons.map(
                        (reason, idx) => (
                          <li key={idx} className="text-footnote text-label">
                            • {reason}
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                </Row>
              )}

              <Row>
                <div className="flex-1">
                  <span className="text-callout text-secondary-label">
                    Household Size
                  </span>
                </div>
                <span className="text-body font-semibold">
                  {application.screeningResult.householdSize}
                </span>
              </Row>

              <Row>
                <div className="flex-1">
                  <span className="text-callout text-secondary-label">
                    Total Annual Income
                  </span>
                </div>
                <span className="text-body font-semibold">
                  {formatCurrency(application.totalAnnualIncome)}
                </span>
              </Row>

              <Row>
                <div className="flex-1">
                  <span className="text-callout text-secondary-label">
                    Calculated Gross Income
                  </span>
                  <span className="text-footnote text-tertiary-label block">
                    Income + imputed asset income
                  </span>
                </div>
                <span className="text-body font-semibold">
                  {formatCurrency(application.screeningResult.grossIncome)}
                </span>
              </Row>

              <Row>
                <div className="flex-1">
                  <span className="text-callout text-secondary-label">
                    Total Asset Cash Value
                  </span>
                </div>
                <span className="text-body font-semibold">
                  {formatCurrency(application.totalAssetCashValue)}
                </span>
              </Row>

              <Row>
                <div className="flex-1">
                  <span className="text-callout text-secondary-label">
                    Actual Asset Income
                  </span>
                </div>
                <span className="text-body font-semibold">
                  {formatCurrency(application.totalActualAssetIncome)}
                </span>
              </Row>

              {application.screeningResult.imputedAssetIncome !== null && (
                <Row>
                  <div className="flex-1">
                    <span className="text-callout text-secondary-label">
                      Imputed Asset Income
                    </span>
                    <span className="text-footnote text-tertiary-label block">
                      Used in gross income calculation
                    </span>
                  </div>
                  <span className="text-body font-semibold">
                    {formatCurrency(
                      application.screeningResult.imputedAssetIncome
                    )}
                  </span>
                </Row>
              )}
            </List>
          </div>
        )}

        {/* Rule Version */}
        {application.ruleVersion && (
          <div>
            <div className="px-gutter mb-3">
              <h3 className="text-headline font-semibold">Rule Version</h3>
              <p className="text-footnote text-tertiary-label mt-1">
                Thresholds applied to this screening
              </p>
            </div>
            <List>
              <Row>
                <div className="flex-1">
                  <span className="text-callout text-secondary-label">
                    Rule Version
                  </span>
                </div>
                <span className="text-body font-semibold">
                  v{application.ruleVersion.version}
                </span>
              </Row>

              <Row>
                <div className="flex-1">
                  <span className="text-callout text-secondary-label">
                    Effective Date
                  </span>
                </div>
                <span className="text-body font-semibold">
                  {formatDate(application.ruleVersion.effectiveDate)}
                </span>
              </Row>

              <Row>
                <div className="flex-1">
                  <span className="text-callout text-secondary-label">
                    Income Cap (Annual)
                  </span>
                </div>
                <span className="text-body font-semibold">
                  {formatCurrency(application.ruleVersion.incomeCapAnnual)}
                </span>
              </Row>

              <Row>
                <div className="flex-1">
                  <span className="text-callout text-secondary-label">
                    Max Occupancy
                  </span>
                </div>
                <span className="text-body font-semibold">
                  {application.ruleVersion.maxOccupancy}
                </span>
              </Row>

              <Row>
                <div className="flex-1">
                  <span className="text-callout text-secondary-label">
                    Passbook Rate
                  </span>
                </div>
                <span className="text-body font-semibold">
                  {(application.ruleVersion.passbookRate * 100).toFixed(2)}%
                </span>
              </Row>

              <Row>
                <div className="flex-1">
                  <span className="text-callout text-secondary-label">
                    Asset Threshold
                  </span>
                </div>
                <span className="text-body font-semibold">
                  {formatCurrency(application.ruleVersion.assetThreshold)}
                </span>
              </Row>
            </List>
          </div>
        )}

        {/* Household Members */}
        <div>
          <div className="px-gutter mb-3">
            <h3 className="text-headline font-semibold">Household Members</h3>
            <p className="text-footnote text-tertiary-label mt-1">
              {application.household.length}{" "}
              {application.household.length === 1 ? "member" : "members"}
            </p>
          </div>

          {application.household.map((member, idx) => (
            <div key={member.id} className={idx > 0 ? "mt-6" : ""}>
              <div className="px-gutter mb-2">
                <h4 className="text-body font-semibold">{member.name}</h4>
                <p className="text-footnote text-secondary-label">
                  {member.relationship}
                  {member.isFullTimeStudent && " • Full-time student"}
                </p>
              </div>

              <List>
                <Row>
                  <div className="flex-1">
                    <span className="text-callout text-secondary-label">
                      Date of Birth
                    </span>
                  </div>
                  <span className="text-body">
                    {formatDate(member.dateOfBirth)}
                  </span>
                </Row>

                {member.isFullTimeStudent && member.studentExemptionType && (
                  <Row>
                    <div className="flex-1">
                      <span className="text-callout text-secondary-label">
                        Student Exemption
                      </span>
                    </div>
                    <span className="text-body">
                      {formatStudentExemption(member.studentExemptionType)}
                    </span>
                  </Row>
                )}
              </List>

              {/* Income Sources */}
              {member.incomeSources.length > 0 && (
                <>
                  <div className="px-gutter mt-4 mb-2">
                    <h5 className="text-callout font-semibold text-secondary-label">
                      Income Sources
                    </h5>
                  </div>
                  <List>
                    {member.incomeSources.map((source) => (
                      <Row key={source.id}>
                        <div className="flex-1">
                          <span className="text-body block capitalize">
                            {source.sourceType.replace(/_/g, " ")}
                          </span>
                          {source.employerPayerName && (
                            <span className="text-footnote text-secondary-label block">
                              {source.employerPayerName}
                            </span>
                          )}
                          <span className="text-footnote text-tertiary-label block mt-1">
                            {formatCurrency(source.amount)}{" "}
                            {formatFrequency(source.frequency)} •{" "}
                            {formatCurrency(source.annualAmount)}/year
                          </span>
                        </div>
                      </Row>
                    ))}
                  </List>
                </>
              )}

              {/* Assets */}
              {member.assets.length > 0 && (
                <>
                  <div className="px-gutter mt-4 mb-2">
                    <h5 className="text-callout font-semibold text-secondary-label">
                      Assets
                    </h5>
                  </div>
                  <List>
                    {member.assets.map((asset) => (
                      <Row key={asset.id}>
                        <div className="flex-1">
                          <span className="text-body block capitalize">
                            {asset.assetType.replace(/_/g, " ")}
                          </span>
                          <span className="text-footnote text-tertiary-label block mt-1">
                            Cash value: {formatCurrency(asset.cashValue)} •
                            Annual income: {formatCurrency(asset.annualIncome)}
                          </span>
                        </div>
                      </Row>
                    ))}
                  </List>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Student Household Note */}
        {allStudents && (
          <div className="px-gutter">
            <div className="bg-secondary-grouped-background rounded-ios-card p-4 shadow-card card-highlight">
              <p className="text-callout text-secondary-label">
                <span className="font-semibold">All-student household:</span>{" "}
                At least one member must have a qualifying TIC Part VII
                exemption to pass screening.
              </p>
            </div>
          </div>
        )}

        {/* Uploaded Documents */}
        <div>
          <div className="px-gutter mb-3">
            <h3 className="text-headline font-semibold">Uploaded Documents</h3>
            <p className="text-footnote text-tertiary-label mt-1">
              Supporting documentation provided by applicant
            </p>
          </div>

          {documents.length === 0 ? (
            <div className="px-gutter">
              <div className="bg-secondary-grouped-background rounded-ios-card p-4 shadow-card card-highlight">
                <p className="text-callout text-secondary-label text-center">
                  No documents uploaded yet
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2 px-gutter">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-secondary-grouped-background rounded-ios-card p-4 shadow-card card-highlight"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-system-blue/10 text-system-blue">
                          {formatDocumentType(doc.documentType)}
                        </span>
                      </div>
                      <p className="text-callout font-medium text-label truncate">
                        {doc.filename}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-footnote text-tertiary-label">
                        <span>{formatFileSize(doc.size)}</span>
                        <span>•</span>
                        <span>{doc.contentType}</span>
                      </div>
                      <p className="text-footnote text-tertiary-label mt-1">
                        Uploaded {formatDate(doc.uploadedAt)} by {doc.uploadedBy}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="tinted"
                        onClick={() => handleViewDocument(doc.id)}
                      >
                        View
                      </Button>
                      <Button
                        variant="plain"
                        onClick={() => toggleDocumentExpanded(doc.id)}
                      >
                        {expandedDocuments.has(doc.id) ? "Hide" : "Extract"}
                      </Button>
                    </div>
                  </div>

                  {/* Extraction results (collapsible) */}
                  {expandedDocuments.has(doc.id) && (
                    <ExtractionResults
                      documentId={doc.id}
                      onExtract={() => handleExtractDocument(doc.id)}
                      isExtracting={extractingDocumentId === doc.id}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Generate TIC Form */}
        <div>
          <div className="px-gutter mb-3">
            <h3 className="text-headline font-semibold">TIC Form Generation</h3>
            <p className="text-footnote text-tertiary-label mt-1">
              Generate pre-filled draft for verification
            </p>
          </div>

          <div className="px-gutter">
            <div className="bg-secondary-grouped-background rounded-ios-card p-4 shadow-card card-highlight">
              <p className="text-callout text-secondary-label mb-4">
                <span className="font-semibold">Pre-filled draft only:</span>{" "}
                The generated TIC form is pre-filled with verified application
                data for your convenience. This is NOT a final certification—you
                must review all values, complete Parts I, V, VI, VIII, and IX,
                and sign manually before submission.
              </p>

              {overflowWarning && (
                <div className="mb-4 p-3 bg-system-orange/10 dark:bg-system-orange/20 rounded-ios-card">
                  <p className="text-callout text-system-orange font-semibold mb-1">
                    Overflow Warning
                  </p>
                  <p className="text-footnote text-secondary-label">
                    {overflowWarning}
                  </p>
                </div>
              )}

              {ticError && (
                <div className="mb-4 p-3 bg-system-red/10 dark:bg-system-red/20 rounded-ios-card">
                  <p className="text-callout text-system-red font-semibold mb-1">
                    Error
                  </p>
                  <p className="text-footnote text-secondary-label">
                    {ticError}
                  </p>
                </div>
              )}

              <Button
                onClick={handleGenerateTIC}
                disabled={isGeneratingTIC}
                variant="filled"
              >
                {isGeneratingTIC ? 'Generating...' : 'Generate TIC PDF'}
              </Button>
            </div>
          </div>
        </div>

        {/* Decision History */}
        {decisions.length > 0 && (
          <div>
            <div className="px-gutter mb-3">
              <h3 className="text-headline font-semibold">Decision History</h3>
              <p className="text-footnote text-tertiary-label mt-1">
                {decisions.length}{" "}
                {decisions.length === 1 ? "decision" : "decisions"} recorded
              </p>
            </div>
            <List>
              {decisions.map((decision) => {
                const decisionLabel = {
                  approved: "Approved",
                  denied: "Denied",
                  needs_more_info: "Needs More Info",
                }[decision.decision];

                const decisionColor = {
                  approved: "text-system-green",
                  denied: "text-system-red",
                  needs_more_info: "text-system-orange",
                }[decision.decision];

                return (
                  <Row key={decision.id}>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-body font-semibold ${decisionColor}`}>
                          {decisionLabel}
                        </span>
                        <span className="text-footnote text-tertiary-label">
                          {formatDate(decision.decidedAt)}
                        </span>
                      </div>
                      <p className="text-footnote text-secondary-label">
                        By {decision.reviewerEmail}
                      </p>
                      {decision.notes && (
                        <p className="text-callout text-label mt-2">
                          {decision.notes}
                        </p>
                      )}
                    </div>
                  </Row>
                );
              })}
            </List>
          </div>
        )}

        {/* Decision Capture */}
        <DecisionCapture
          applicationId={application.id}
          onDecisionCreated={handleDecisionCreated}
        />

        {/* Version History */}
        {application.versionHistory.length > 1 && (
          <div>
            <div className="px-gutter mb-3">
              <h3 className="text-headline font-semibold">Version History</h3>
              <p className="text-footnote text-tertiary-label mt-1">
                All versions of this application
              </p>
            </div>
            <List>
              {application.versionHistory.map((version) => (
                <Row
                  key={version.id}
                  chevron={version.id !== application.id}
                  onClick={
                    version.id !== application.id
                      ? () => router.push(`/review/${version.id}`)
                      : undefined
                  }
                >
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-body font-semibold">
                        Version {version.version}
                        {version.id === application.id && " (Current)"}
                      </span>
                      <span className="text-footnote text-tertiary-label">
                        {formatDate(version.submittedAt ?? version.createdAt)}
                      </span>
                    </div>
                    <span className="text-footnote text-secondary-label block mt-1 capitalize">
                      {version.status}
                    </span>
                  </div>
                </Row>
              ))}
            </List>
          </div>
        )}
      </div>
    </div>
  );
}
