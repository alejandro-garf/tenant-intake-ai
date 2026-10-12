/**
 * ExtractionResults — displays OCR extraction proposals for a document.
 *
 * Shows:
 * - Proposed field values with confidence scores
 * - Multiple extraction runs (chronological, newest first)
 * - Raw OCR text (collapsed by default, expandable)
 *
 * Labeling:
 * - "Unverified machine proposals" to emphasize these are NOT final truth
 * - Confidence shown as percentage with color coding
 * - Clear distinction from verified application data
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/Button";

interface ProposedField {
  fieldName: string;
  proposedValue: string;
  confidence: number;
}

interface ExtractionRun {
  runId: string;
  extractorName: string;
  extractedAt: string;
  rawText: string;
  fields: ProposedField[];
}

interface ExtractionResultsProps {
  documentId: number;
  onExtract: () => void;
  isExtracting: boolean;
}

export function ExtractionResults({
  documentId,
  onExtract,
  isExtracting,
}: ExtractionResultsProps) {
  const [runs, setRuns] = useState<ExtractionRun[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedRawText, setExpandedRawText] = useState<Set<string>>(
    new Set()
  );

  // Fetch extraction results on mount and when extraction completes
  const fetchResults = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/documents/${documentId}/extractions`);
      if (!response.ok) {
        throw new Error("Failed to fetch extractions");
      }
      const data = await response.json();
      setRuns(data.runs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load results");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRawText = (runId: string) => {
    setExpandedRawText((prev) => {
      const next = new Set(prev);
      if (next.has(runId)) {
        next.delete(runId);
      } else {
        next.add(runId);
      }
      return next;
    });
  };

  const formatConfidence = (confidence: number): string => {
    return `${Math.round(confidence * 100)}%`;
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return "text-system-green";
    if (confidence >= 0.6) return "text-system-orange";
    return "text-system-red";
  };

  const formatFieldName = (fieldName: string): string => {
    return fieldName
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  // Initial fetch
  useEffect(() => {
    fetchResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  return (
    <div className="mt-3 space-y-3">
      {/* Extract button */}
      <div className="flex items-center justify-between">
        <p className="text-footnote text-tertiary-label">
          Extract proposed field values from this document
        </p>
        <Button
          variant="tinted"
          onClick={() => {
            onExtract();
            // Refresh results after extraction completes (small delay)
            setTimeout(fetchResults, 2000);
          }}
          disabled={isExtracting}
        >
          {isExtracting ? "Extracting..." : "Extract"}
        </Button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="bg-secondary-grouped-background rounded-ios-card p-4 shadow-card">
          <p className="text-callout text-secondary-label text-center">
            Loading extraction results...
          </p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="bg-system-red/10 rounded-ios-card p-4">
          <p className="text-callout text-system-red">{error}</p>
        </div>
      )}

      {/* Extraction runs */}
      {!isLoading && runs.length > 0 && (
        <div className="space-y-3">
          <p className="text-subhead font-semibold text-secondary-label">
            Extraction Results ({runs.length}{" "}
            {runs.length === 1 ? "run" : "runs"})
          </p>
          {runs.map((run) => (
            <div
              key={run.runId}
              className="bg-secondary-grouped-background rounded-ios-card p-4 shadow-card"
            >
              {/* Run metadata */}
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-separator">
                <div>
                  <p className="text-footnote font-medium text-label">
                    {formatDate(run.extractedAt)}
                  </p>
                  <p className="text-caption text-tertiary-label">
                    Extractor: {run.extractorName}
                  </p>
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-system-orange/10 text-system-orange">
                  Unverified Proposals
                </span>
              </div>

              {/* Proposed fields */}
              {run.fields.length === 0 ? (
                <p className="text-callout text-secondary-label italic">
                  No fields extracted
                </p>
              ) : (
                <div className="space-y-2 mb-3">
                  {run.fields.map((field, index) => (
                    <div
                      key={index}
                      className="flex items-start justify-between gap-3 py-2 border-b border-separator last:border-b-0"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-footnote text-tertiary-label">
                          {formatFieldName(field.fieldName)}
                        </p>
                        <p className="text-callout font-medium text-label truncate">
                          {field.proposedValue}
                        </p>
                      </div>
                      <span
                        className={`text-footnote font-semibold ${getConfidenceColor(field.confidence)}`}
                      >
                        {formatConfidence(field.confidence)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Raw text (collapsed by default) */}
              {run.rawText && (
                <div className="mt-3 pt-3 border-t border-separator">
                  <button
                    onClick={() => toggleRawText(run.runId)}
                    className="flex items-center gap-2 text-footnote text-system-blue hover:underline"
                  >
                    <span>
                      {expandedRawText.has(run.runId)
                        ? "Hide"
                        : "Show"}{" "}
                      raw OCR text
                    </span>
                    <span className="transform transition-transform duration-200">
                      {expandedRawText.has(run.runId) ? "▲" : "▼"}
                    </span>
                  </button>
                  {expandedRawText.has(run.runId) && (
                    <pre className="mt-2 p-3 bg-grouped-background rounded-ios-control text-caption text-secondary-label overflow-x-auto whitespace-pre-wrap break-words">
                      {run.rawText}
                    </pre>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && runs.length === 0 && (
        <div className="bg-secondary-grouped-background rounded-ios-card p-4 shadow-card">
          <p className="text-callout text-secondary-label text-center italic">
            No extraction results yet. Click "Extract" to run OCR on this
            document.
          </p>
        </div>
      )}
    </div>
  );
}
