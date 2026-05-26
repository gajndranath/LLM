-- ============================================================
-- Migration: Fix architect_missions deduplication constraint
-- Run ONCE on any environment that was created from the old
-- schema.sql (where UNIQUE was (connection_id, title) instead
-- of (user_id, connection_id, title)).
-- ============================================================

-- Step 1: Drop the old, wrong unique constraint (name may differ —
-- use \d architect_missions in psql to confirm the exact name).
ALTER TABLE architect_missions
  DROP CONSTRAINT IF EXISTS architect_missions_connection_id_title_key;

-- Step 2: Before adding the new constraint, remove any pre-existing
-- duplicate rows that would block it. We keep the OLDEST row for each
-- (user_id, connection_id, title) triple and delete the rest.
DELETE FROM architect_missions
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, connection_id, title) id
  FROM architect_missions
  ORDER BY user_id, connection_id, title, created_at ASC
);

-- Step 3: Add the correct, per-user unique constraint.
ALTER TABLE architect_missions
  ADD CONSTRAINT architect_missions_user_conn_title_key
  UNIQUE (user_id, connection_id, title);

-- Step 4: Add the missing connection_id index if not present.
CREATE INDEX IF NOT EXISTS idx_architect_missions_conn
  ON architect_missions(connection_id);
