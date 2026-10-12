import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe("Golden Rule 4: Demographic Isolation", () => {
  it("rules engine must NEVER import demographics module", () => {
    // Read the rules engine source files
    const enginePath = join(__dirname, "engine.ts");
    const typesPath = join(__dirname, "types.ts");

    const engineSource = readFileSync(enginePath, "utf-8");
    const typesSource = readFileSync(typesPath, "utf-8");

    // Check for any imports from demographics
    const forbiddenPatterns = [
      /from\s+['"].*demographics/i,
      /import\s+.*demographics/i,
      /require\s*\(['"].*demographics/i,
    ];

    for (const pattern of forbiddenPatterns) {
      expect(engineSource).not.toMatch(pattern);
      expect(typesSource).not.toMatch(pattern);
    }
  });

  it("demographics module must be in a separate directory", () => {
    const demographicsPath = join(__dirname, "..", "demographics", "index.ts");

    // Verify demographics module exists in its own isolated directory
    expect(() => readFileSync(demographicsPath, "utf-8")).not.toThrow();

    const demographicsSource = readFileSync(demographicsPath, "utf-8");

    // Verify it contains the isolation warning
    expect(demographicsSource).toContain("ISOLATED");
    expect(demographicsSource).toContain("HERA reporting ONLY");
  });
});

describe("Golden Rule 1: Single Canonical Rules Engine", () => {
  it("must NOT have duplicate screening/rules implementations outside src/rules/", () => {
    // Check for common screening-related files outside src/rules/
    const forbiddenLocations = [
      join(__dirname, "..", "lib", "screening.ts"),
      join(__dirname, "..", "lib", "rules.ts"),
      join(__dirname, "..", "lib", "engine.ts"),
      join(__dirname, "..", "app", "screening.ts"),
      join(__dirname, "..", "app", "rules.ts"),
      join(__dirname, "..", "utils", "screening.ts"),
      join(__dirname, "..", "utils", "rules.ts"),
    ];

    for (const path of forbiddenLocations) {
      expect(() => {
        const source = readFileSync(path, "utf-8");
        // If the file exists, fail the test
        throw new Error(
          `VIOLATION: Duplicate rules engine found at ${path}. ` +
            `All screening logic must be in src/rules/engine.ts`
        );
      }).toThrow(/ENOENT|no such file/);
    }
  });

  it("canonical engine must have deterministic screening logic", () => {
    const enginePath = join(__dirname, "engine.ts");
    const engineSource = readFileSync(enginePath, "utf-8");

    // Verify the canonical engine has the core screening functions
    expect(engineSource).toContain("export function screenApplication");
    expect(engineSource).toContain("export function calculateGrossIncome");
    expect(engineSource).toContain("export function calculateImputedAssetIncome");
    expect(engineSource).toContain("export function checkFullTimeStudentRule");

    // Verify it's deterministic (no LLM, no random, no network)
    const forbiddenPatterns = [
      /fetch\(/i,
      /axios/i,
      /Math\.random/i,
      /Date\.now/i,
      /anthropic/i,
      /openai/i,
    ];

    for (const pattern of forbiddenPatterns) {
      expect(engineSource).not.toMatch(pattern);
    }
  });
});
