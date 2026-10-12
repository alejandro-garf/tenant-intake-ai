/**
 * Extraction firewall test — ensures rules engine NEVER imports extraction code.
 *
 * This test guards the architectural boundary between extraction and screening.
 * If the rules engine imports anything from src/extraction/, this test FAILS.
 *
 * Golden Rule 2: Extraction proposes, rules calculate, a human decides.
 * The rules engine must ONLY read from verified application data, never from
 * extraction_results table or extraction modules.
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("Rules engine extraction firewall", () => {
  it("Rules engine files NEVER import from src/extraction/", () => {
    const rulesDir = path.join(__dirname);
    const files = fs.readdirSync(rulesDir);

    const violations: string[] = [];

    for (const file of files) {
      if (!file.endsWith(".ts") && !file.endsWith(".tsx")) continue;
      if (file.endsWith(".test.ts")) continue; // Skip test files

      const filePath = path.join(rulesDir, file);
      const content = fs.readFileSync(filePath, "utf-8");

      // Check for any imports from ../extraction or @/extraction
      if (
        content.includes('from "../extraction') ||
        content.includes('from "@/extraction') ||
        content.includes("from '../extraction") ||
        content.includes("from '@/extraction")
      ) {
        violations.push(file);
      }

      // Also check for extraction_results table references
      if (content.includes("extraction_results")) {
        violations.push(`${file} (references extraction_results table)`);
      }
    }

    if (violations.length > 0) {
      throw new Error(
        `Rules engine must NEVER import extraction code or query extraction_results table.\n` +
          `Violations found in:\n${violations.join("\n")}\n\n` +
          `This violates Golden Rule 2: extraction proposes, rules calculate (separately).`
      );
    }

    // If we reach here, the firewall is intact
    expect(violations).toEqual([]);
  });

  it("Adapter files NEVER import from src/extraction/", () => {
    // The adapter maps application data to rules engine input
    // It should NEVER touch extraction results

    const adapterPath = path.join(__dirname, "adapter.ts");

    if (!fs.existsSync(adapterPath)) {
      // Adapter doesn't exist yet, skip test
      return;
    }

    const content = fs.readFileSync(adapterPath, "utf-8");

    expect(content).not.toContain('from "../extraction');
    expect(content).not.toContain('from "@/extraction');
    expect(content).not.toContain("from '../extraction");
    expect(content).not.toContain("from '@/extraction");
    expect(content).not.toContain("extraction_results");
  });

  it("Rules engine types are independent of extraction types", () => {
    const typesPath = path.join(__dirname, "types.ts");

    if (!fs.existsSync(typesPath)) {
      // Types file doesn't exist, skip
      return;
    }

    const content = fs.readFileSync(typesPath, "utf-8");

    // Types should NOT reference extraction interfaces
    expect(content).not.toContain("Extractor");
    expect(content).not.toContain("ExtractionResult");
    expect(content).not.toContain("ProposedField");
    expect(content).not.toContain('from "../extraction');
    expect(content).not.toContain('from "@/extraction');
  });

  it("Application submission does NOT trigger extraction", () => {
    // When an application is submitted, the rules engine runs
    // Extraction should NEVER be triggered automatically
    // (It's on-demand, reviewer-initiated only)

    const submitRoutePath = path.join(
      __dirname,
      "../app/api/applications/submit/route.ts"
    );

    if (!fs.existsSync(submitRoutePath)) {
      // Route doesn't exist, skip
      return;
    }

    const content = fs.readFileSync(submitRoutePath, "utf-8");

    // Should NOT call any extraction functions
    expect(content).not.toContain("extract(");
    expect(content).not.toContain("getExtractor");
    expect(content).not.toContain("FakeExtractor");
    expect(content).not.toContain("TesseractExtractor");
    expect(content).not.toContain('from "../extraction');
    expect(content).not.toContain('from "@/extraction');
  });

  it("Screening engine NEVER reads extraction_results table", () => {
    const enginePath = path.join(__dirname, "engine.ts");

    if (!fs.existsSync(enginePath)) {
      return;
    }

    const content = fs.readFileSync(enginePath, "utf-8");

    // Should NEVER query extraction_results
    expect(content).not.toContain("extraction_results");
    expect(content).not.toContain("ExtractionResult"); // Type name
    expect(content).not.toContain("proposed_value");
    expect(content).not.toContain("proposedValue");
  });
});
