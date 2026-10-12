-- Add stable client-generated IDs to child tables for draft reconciliation
-- These UUIDs are generated on the client and allow the server to match
-- incoming draft data to existing DB rows, enabling UPDATE/INSERT/DELETE
-- reconciliation instead of delete-and-recreate on every save.

-- Add stable_id to household_members
ALTER TABLE household_members
ADD COLUMN stable_id UUID;

-- Add stable_id to income_sources
ALTER TABLE income_sources
ADD COLUMN stable_id UUID;

-- Add stable_id to assets
ALTER TABLE assets
ADD COLUMN stable_id UUID;

-- Add unique constraints to ensure stable_ids are unique within an application
-- (Stable IDs must be unique per application to prevent collisions)
CREATE UNIQUE INDEX idx_household_members_stable_id
ON household_members(application_id, stable_id)
WHERE stable_id IS NOT NULL;

CREATE UNIQUE INDEX idx_income_sources_stable_id
ON income_sources(household_member_id, stable_id)
WHERE stable_id IS NOT NULL;

CREATE UNIQUE INDEX idx_assets_stable_id
ON assets(household_member_id, stable_id)
WHERE stable_id IS NOT NULL;
