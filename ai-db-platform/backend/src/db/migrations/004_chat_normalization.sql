-- ============================================================
-- Migration 004: Chat Normalization (JSONB Extraction)
-- ============================================================

-- 1. Create the session_messages table
DROP TABLE IF EXISTS session_messages;
CREATE TABLE IF NOT EXISTS session_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES design_studio_sessions(id) ON DELETE CASCADE,
  role        VARCHAR(50) NOT NULL,
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_session_messages_session ON session_messages(session_id);

-- 2. Migrate existing data from JSONB to relational table
-- Assuming design_studio_sessions.requirements_transcript is a JSONB array of { role, content }
INSERT INTO session_messages (session_id, role, content)
SELECT 
  id as session_id,
  msg->>'role' as role,
  msg->>'content' as content
FROM design_studio_sessions, jsonb_array_elements(requirements_transcript) as msg
WHERE jsonb_typeof(requirements_transcript) = 'array';

-- 3. Drop the old heavy JSONB column
ALTER TABLE design_studio_sessions DROP COLUMN IF EXISTS requirements_transcript;
