/**
 * Document storage interface - provider-swappable layer.
 *
 * Currently backed by Cloudflare R2 via S3-compatible API.
 * All document access goes through short-lived signed URLs.
 *
 * SECURITY:
 * - Object keys MUST NOT contain PII (applicant names, SSNs, etc.)
 * - Use opaque IDs only
 * - Never generate public URLs
 * - Signed URLs expire quickly (default 5 minutes)
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";

// Document storage interface
export interface DocumentMetadata {
  key: string;
  filename: string;
  contentType: string;
  size: number;
}

export interface StorageProvider {
  putDocument(
    buffer: Buffer,
    filename: string,
    contentType: string
  ): Promise<DocumentMetadata>;
  getDocumentUrl(key: string, expiresInSeconds?: number): Promise<string>;
  deleteDocument(key: string): Promise<void>;
  documentExists(key: string): Promise<boolean>;
}

// Cloudflare R2 implementation via S3-compatible API
class R2StorageProvider implements StorageProvider {
  private client: S3Client;
  private bucket: string;

  constructor() {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const bucket = process.env.R2_BUCKET;

    if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
      throw new Error(
        "Missing R2 credentials: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET must be set"
      );
    }

    this.bucket = bucket;
    this.client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  /**
   * Upload a document to R2.
   *
   * Generates an opaque key using a UUID v4 to prevent PII leakage.
   * Original filename is preserved in metadata for download purposes only.
   */
  async putDocument(
    buffer: Buffer,
    filename: string,
    contentType: string
  ): Promise<DocumentMetadata> {
    // Generate opaque key: <uuid>.<extension>
    // Example: 7f3e9a4c-1b2d-4c5e-9f8a-6d3c4e5f6a7b.pdf
    const extension = this.extractExtension(filename);
    const uuid = crypto.randomUUID();
    const key = extension ? `${uuid}.${extension}` : uuid;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        Metadata: {
          // Store original filename in metadata (not in key)
          originalFilename: filename,
        },
      })
    );

    return {
      key,
      filename,
      contentType,
      size: buffer.length,
    };
  }

  /**
   * Generate a short-lived signed URL for document access.
   *
   * @param key - The opaque storage key
   * @param expiresInSeconds - URL expiration time (default: 300 = 5 minutes)
   */
  async getDocumentUrl(
    key: string,
    expiresInSeconds: number = 300
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return await getSignedUrl(this.client, command, {
      expiresIn: expiresInSeconds,
    });
  }

  /**
   * Delete a document from R2.
   */
  async deleteDocument(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })
    );
  }

  /**
   * Check if a document exists in R2.
   */
  async documentExists(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      );
      return true;
    } catch (error) {
      // HeadObject throws NoSuchKey when file doesn't exist
      return false;
    }
  }

  private extractExtension(filename: string): string {
    const parts = filename.split(".");
    if (parts.length < 2) return "";
    return parts[parts.length - 1]?.toLowerCase() || "";
  }
}

// Singleton instance
let storageInstance: StorageProvider | null = null;

/**
 * Get the configured storage provider.
 *
 * Currently returns R2StorageProvider. Swappable in the future
 * by changing this single function.
 */
export function getStorageProvider(): StorageProvider {
  if (!storageInstance) {
    storageInstance = new R2StorageProvider();
  }
  return storageInstance;
}

// Export high-level functions that delegate to the provider
export async function putDocument(
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<DocumentMetadata> {
  return getStorageProvider().putDocument(buffer, filename, contentType);
}

export async function getDocumentUrl(
  key: string,
  expiresInSeconds?: number
): Promise<string> {
  return getStorageProvider().getDocumentUrl(key, expiresInSeconds);
}

export async function deleteDocument(key: string): Promise<void> {
  return getStorageProvider().deleteDocument(key);
}

export async function documentExists(key: string): Promise<boolean> {
  return getStorageProvider().documentExists(key);
}
