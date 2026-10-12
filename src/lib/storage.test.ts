/**
 * Storage Interface Tests
 *
 * Basic tests for document storage. These tests use a mock implementation
 * to avoid requiring R2 credentials during test runs.
 */

import { describe, it, expect, beforeEach } from "vitest";
import type { StorageProvider, DocumentMetadata } from "./storage";

// Mock storage provider for testing
class MockStorageProvider implements StorageProvider {
  private store: Map<string, { buffer: Buffer; metadata: DocumentMetadata }> =
    new Map();

  async putDocument(
    buffer: Buffer,
    filename: string,
    contentType: string
  ): Promise<DocumentMetadata> {
    // Generate a mock key (similar to real implementation)
    const extension = filename.split(".").pop()?.toLowerCase() || "";
    const key = `mock-${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;

    const metadata: DocumentMetadata = {
      key,
      filename,
      contentType,
      size: buffer.length,
    };

    this.store.set(key, { buffer, metadata });
    return metadata;
  }

  async getDocumentUrl(
    key: string,
    expiresInSeconds: number = 300
  ): Promise<string> {
    if (!this.store.has(key)) {
      throw new Error("Document not found");
    }
    // Return a mock signed URL
    return `https://mock-storage.example.com/${key}?expires=${expiresInSeconds}`;
  }

  async deleteDocument(key: string): Promise<void> {
    this.store.delete(key);
  }

  async documentExists(key: string): Promise<boolean> {
    return this.store.has(key);
  }

  // Test helper: get the stored buffer
  getStoredBuffer(key: string): Buffer | undefined {
    return this.store.get(key)?.buffer;
  }
}

describe("Storage Interface", () => {
  let storage: MockStorageProvider;

  beforeEach(() => {
    storage = new MockStorageProvider();
  });

  describe("putDocument", () => {
    it("should store a document and return metadata", async () => {
      const buffer = Buffer.from("test content");
      const filename = "test-document.pdf";
      const contentType = "application/pdf";

      const metadata = await storage.putDocument(buffer, filename, contentType);

      expect(metadata.filename).toBe(filename);
      expect(metadata.contentType).toBe(contentType);
      expect(metadata.size).toBe(buffer.length);
      expect(metadata.key).toMatch(/^mock-.*\.pdf$/);
    });

    it("should generate unique keys for different uploads", async () => {
      const buffer = Buffer.from("test");
      const metadata1 = await storage.putDocument(
        buffer,
        "file1.pdf",
        "application/pdf"
      );
      const metadata2 = await storage.putDocument(
        buffer,
        "file2.pdf",
        "application/pdf"
      );

      expect(metadata1.key).not.toBe(metadata2.key);
    });

    it("should handle files without extensions", async () => {
      const buffer = Buffer.from("test");
      const metadata = await storage.putDocument(
        buffer,
        "noextension",
        "application/octet-stream"
      );

      // Should still have a key, even if filename has no extension
      expect(metadata.key).toMatch(/^mock-.*$/);
      expect(metadata.filename).toBe("noextension");
    });
  });

  describe("getDocumentUrl", () => {
    it("should generate a signed URL for existing documents", async () => {
      const buffer = Buffer.from("test");
      const metadata = await storage.putDocument(
        buffer,
        "test.pdf",
        "application/pdf"
      );

      const url = await storage.getDocumentUrl(metadata.key);

      expect(url).toMatch(/^https:\/\/mock-storage\.example\.com\//);
      expect(url).toContain(metadata.key);
      expect(url).toContain("expires=300");
    });

    it("should use custom expiration time", async () => {
      const buffer = Buffer.from("test");
      const metadata = await storage.putDocument(
        buffer,
        "test.pdf",
        "application/pdf"
      );

      const url = await storage.getDocumentUrl(metadata.key, 600);

      expect(url).toContain("expires=600");
    });

    it("should throw error for non-existent documents", async () => {
      await expect(storage.getDocumentUrl("nonexistent-key")).rejects.toThrow(
        "Document not found"
      );
    });
  });

  describe("deleteDocument", () => {
    it("should delete an existing document", async () => {
      const buffer = Buffer.from("test");
      const metadata = await storage.putDocument(
        buffer,
        "test.pdf",
        "application/pdf"
      );

      await storage.deleteDocument(metadata.key);

      const exists = await storage.documentExists(metadata.key);
      expect(exists).toBe(false);
    });

    it("should not throw when deleting non-existent document", async () => {
      await expect(
        storage.deleteDocument("nonexistent-key")
      ).resolves.toBeUndefined();
    });
  });

  describe("documentExists", () => {
    it("should return true for existing documents", async () => {
      const buffer = Buffer.from("test");
      const metadata = await storage.putDocument(
        buffer,
        "test.pdf",
        "application/pdf"
      );

      const exists = await storage.documentExists(metadata.key);
      expect(exists).toBe(true);
    });

    it("should return false for non-existent documents", async () => {
      const exists = await storage.documentExists("nonexistent-key");
      expect(exists).toBe(false);
    });
  });

  describe("Security: Opaque keys", () => {
    it("should never include PII in storage keys", async () => {
      const buffer = Buffer.from("test");
      const sensitiveFilename = "john-doe-ssn-123-45-6789.pdf";

      const metadata = await storage.putDocument(
        buffer,
        sensitiveFilename,
        "application/pdf"
      );

      // Key should NOT contain any part of the filename (except extension)
      expect(metadata.key).not.toContain("john");
      expect(metadata.key).not.toContain("doe");
      expect(metadata.key).not.toContain("ssn");
      expect(metadata.key).not.toContain("123");

      // But filename should be preserved in metadata
      expect(metadata.filename).toBe(sensitiveFilename);
    });
  });
});
