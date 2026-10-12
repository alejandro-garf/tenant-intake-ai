-- Add ssn_last_4 column to household_members table
-- Per CTCAC TIC Part II requirement
-- Sensitive data: store only last 4 digits, never log
ALTER TABLE household_members
ADD COLUMN ssn_last_4 VARCHAR(4);

COMMENT ON COLUMN household_members.ssn_last_4 IS 'Last 4 digits of SSN. Required for TIC Part II. Collected only for members 15+ years old. Use 0000 for members under 15 or when genuinely unavailable.';
