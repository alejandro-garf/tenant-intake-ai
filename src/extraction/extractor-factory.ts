/**
 * Extractor factory — selects the extractor implementation based on config.
 *
 * Configuration via environment variable:
 * - EXTRACTOR=fake (default for dev/test)
 * - EXTRACTOR=tesseract (real OCR)
 *
 * Swappable architecture allows easy testing and future extensibility
 * (e.g., adding a vision LLM fallback if Tesseract proves insufficient).
 */

import { Extractor } from "./types";
import { FakeExtractor } from "./fake-extractor";
import { TesseractExtractor } from "./tesseract-extractor";

/**
 * Get the configured extractor instance.
 *
 * Defaults to FakeExtractor for dev/test environments.
 */
export function getExtractor(): Extractor {
  const extractorType = process.env.EXTRACTOR || "fake";

  switch (extractorType.toLowerCase()) {
    case "fake":
      return new FakeExtractor();
    case "tesseract":
      return new TesseractExtractor();
    default:
      console.warn(
        `Unknown extractor type: ${extractorType}, falling back to fake`
      );
      return new FakeExtractor();
  }
}
