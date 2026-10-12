-- Add detailed fields to income_sources table
ALTER TABLE income_sources
  ADD COLUMN IF NOT EXISTS employer_payer_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS amount DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS frequency VARCHAR(50);

-- Migrate existing data: copy annual_amount to amount with 'annually' frequency
UPDATE income_sources
SET
  amount = annual_amount,
  frequency = 'annually'
WHERE amount IS NULL;

-- Make new columns NOT NULL after migration
ALTER TABLE income_sources
  ALTER COLUMN amount SET NOT NULL,
  ALTER COLUMN frequency SET NOT NULL;

-- annual_amount is deprecated but keep for now to avoid breaking existing code
-- It can be removed in a future migration after full transition
