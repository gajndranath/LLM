-- ============================================================
-- Migration 003: Performance & Security Upgrades
-- Atlas Platform — Soft Deletes, Partial Indexes
-- ============================================================

-- 1. Soft Deletes for db_connections
ALTER TABLE db_connections
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 2. Partial Index for Active Connections (Performance)
CREATE INDEX IF NOT EXISTS idx_active_conns ON db_connections(user_id) WHERE is_active = true AND deleted_at IS NULL;

-- 3. Replace UNIQUE constraint with Partial Unique Index to support Soft Deletes with same names
ALTER TABLE db_connections DROP CONSTRAINT IF EXISTS db_connections_user_id_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_conn_name ON db_connections(user_id, name) WHERE deleted_at IS NULL;

-- 4. Note: UUIDv7 Extension
-- To install UUIDv7 for sequential UUIDs (Enterprise scale), 
-- run the following if supported by your Postgres version:
-- CREATE EXTENSION IF NOT EXISTS pg_uuidv7;
-- ALTER TABLE users ALTER COLUMN id SET DEFAULT uuid_generate_v7();
