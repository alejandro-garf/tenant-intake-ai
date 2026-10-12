-- One-time normalization of failure_reasons column in screening_results
--
-- Context: The failure_reasons column is JSONB and should always contain a JSON array
-- of strings (e.g., ["reason1", "reason2"]) or NULL. However, legacy data from early
-- development/testing may contain plain strings or other malformed values.
--
-- This migration normalizes ALL existing rows to ensure failure_reasons is either:
-- - A JSON array of strings, OR
-- - NULL
--
-- After this migration, the application's read-side graceful degradation becomes a
-- safety net rather than load-bearing code.

-- Step 1: Find and wrap any plain strings in arrays
-- JSONB type checking: jsonb_typeof() returns 'string', 'array', 'object', 'number', 'boolean', 'null'
UPDATE screening_results
SET failure_reasons = jsonb_build_array(failure_reasons)
WHERE failure_reasons IS NOT NULL
  AND jsonb_typeof(failure_reasons) = 'string';

-- Step 2: Ensure any other non-array, non-null values become NULL
-- (defensive: should not exist, but safety first)
UPDATE screening_results
SET failure_reasons = NULL
WHERE failure_reasons IS NOT NULL
  AND jsonb_typeof(failure_reasons) NOT IN ('array', 'null');

-- Step 3: Ensure empty arrays are normalized to NULL for consistency
-- (passed screening = NULL failure_reasons, not empty array)
UPDATE screening_results
SET failure_reasons = NULL
WHERE failure_reasons IS NOT NULL
  AND jsonb_typeof(failure_reasons) = 'array'
  AND jsonb_array_length(failure_reasons) = 0;
