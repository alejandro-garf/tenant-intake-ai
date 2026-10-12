"use client";

/**
 * Document Upload Component
 *
 * iOS-style file upload with progress tracking and per-file remove.
 * Validates file type and size client-side before upload.
 */

import { useState, useRef, ChangeEvent } from "react";
import { Button } from "@/components/Button";

interface UploadedDocument {
  id: number;
  documentType?: string;
  filename: string;
  size: number;
  contentType: string;
  uploadedAt: string;
}

interface DocumentUploadProps {
  applicationId: number;
  documentType: string;
  householdMemberId?: string;
  incomeSourceId?: string;
  onUploadComplete?: (document: UploadedDocument) => void;
  onDeleteComplete?: (documentId: number) => void;
  documents?: UploadedDocument[];
  label?: string;
  accept?: string;
}

const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/heic",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export function DocumentUpload({
  applicationId,
  documentType,
  householdMemberId,
  incomeSourceId,
  onUploadComplete,
  onDeleteComplete,
  documents = [],
  label = "Upload Document",
  accept = ".pdf,.jpg,.jpeg,.png,.heic",
}: DocumentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError(
        `Invalid file type: ${file.type}. Allowed types: PDF, JPG, PNG, HEIC`
      );
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError(
        `File too large: ${(file.size / 1024 / 1024).toFixed(2)} MB. Maximum: 10 MB`
      );
      return;
    }

    // Upload
    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("applicationId", applicationId.toString());
      formData.append("documentType", documentType);
      if (householdMemberId) {
        formData.append("householdMemberId", householdMemberId);
      }
      if (incomeSourceId) {
        formData.append("incomeSourceId", incomeSourceId);
      }

      // Simulate progress (real progress requires XMLHttpRequest)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 100);

      const response = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Upload failed");
      }

      const uploadedDoc = await response.json();
      onUploadComplete?.(uploadedDoc);

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (documentId: number) => {
    if (!confirm("Are you sure you want to delete this document?")) {
      return;
    }

    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Delete failed");
      }

      onDeleteComplete?.(documentId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Upload button */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileSelect}
          disabled={uploading}
          className="hidden"
          id={`file-input-${documentType}`}
        />
        <label htmlFor={`file-input-${documentType}`}>
          <Button
            variant="tinted"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            type="button"
          >
            {uploading ? `Uploading... ${uploadProgress}%` : label}
          </Button>
        </label>
      </div>

      {/* Error message */}
      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Uploaded documents list */}
      {documents.length > 0 && (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between px-4 py-3 rounded-lg bg-white dark:bg-[#2C2C2E] shadow-card"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-label truncate">
                  {doc.filename}
                </div>
                <div className="text-xs text-secondaryLabel">
                  {formatFileSize(doc.size)} • {doc.contentType}
                </div>
              </div>
              <button
                onClick={() => handleDelete(doc.id)}
                className="ml-3 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                type="button"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
