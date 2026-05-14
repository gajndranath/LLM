-- ============================================================
-- AI DB Platform — Database Schema
-- Run this on your PostgreSQL (Neon or local Docker)
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- CREATE EXTENSION IF NOT EXISTS vector;  -- Uncomment when pgvector available

-- ── Users ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(100) NOT NULL,
  email           VARCHAR(255) UNIQUE NOT NULL,
  password_hash   TEXT NOT NULL,
  role            VARCHAR(20) NOT NULL DEFAULT 'ANALYST'
                  CHECK (role IN ('SUPER_ADMIN','ADMIN','DISPATCHER','DRIVER','ANALYST','VIEWER')),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  device_id       VARCHAR(255),
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Refresh Tokens ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash      TEXT NOT NULL UNIQUE,
  expires_at      TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Database Connections (User's DB credentials) ─────────────
CREATE TABLE IF NOT EXISTS db_connections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name            VARCHAR(100) NOT NULL,
  host            TEXT NOT NULL,
  port            INTEGER NOT NULL DEFAULT 5432,
  database_name   TEXT NOT NULL,
  username        TEXT NOT NULL,
  password_enc    TEXT NOT NULL,    -- AES-256-GCM encrypted
  ssl_enabled     BOOLEAN DEFAULT false,
  is_active       BOOLEAN DEFAULT true,
  last_tested_at  TIMESTAMPTZ,
  last_test_ok    BOOLEAN,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- ── Query History ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS query_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  connection_id   UUID REFERENCES db_connections(id) ON DELETE SET NULL,
  natural_query   TEXT,             -- Original user input
  generated_sql   TEXT NOT NULL,    -- AI generated SQL
  executed        BOOLEAN DEFAULT false,
  row_count       INTEGER,
  execution_ms    INTEGER,          -- Execution time in ms
  had_error       BOOLEAN DEFAULT false,
  error_message   TEXT,
  explain_plan    JSONB,            -- EXPLAIN ANALYZE output
  warnings        JSONB,            -- Rule engine warnings
  provider        VARCHAR(50),      -- LLM provider used (groq, gemini etc)
  model           VARCHAR(100),     -- LLM model used
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_db_connections_user ON db_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_query_history_user ON query_history(user_id);
CREATE INDEX IF NOT EXISTS idx_query_history_connection ON query_history(connection_id);
CREATE INDEX IF NOT EXISTS idx_query_history_created ON query_history(created_at DESC);

-- ── Updated_at trigger ───────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_users_updated
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER trg_connections_updated
  BEFORE UPDATE ON db_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Verification OTPs ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS verification_otps (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           VARCHAR(255) NOT NULL,
  otp             VARCHAR(10) NOT NULL,
  expires_at      TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verification_otps_email ON verification_otps(email);

-- ── Architect Audits (Persistent History) ────────────────────
CREATE TABLE IF NOT EXISTS architect_audits (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    connection_id   UUID NOT NULL REFERENCES db_connections(id) ON DELETE CASCADE,
    scale           VARCHAR(50) NOT NULL,
    requirements    TEXT,
    review_data     JSONB NOT NULL,     -- Full AI response including fixes
    scalability_score INTEGER NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_architect_audits_user ON architect_audits(user_id);
CREATE INDEX IF NOT EXISTS idx_architect_audits_conn ON architect_audits(connection_id);

-- ── Architect Missions (AI-managed TODOs) ──────────────────
CREATE TABLE IF NOT EXISTS architect_missions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    connection_id   UUID NOT NULL REFERENCES db_connections(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    priority        VARCHAR(20) DEFAULT 'MEDIUM' CHECK (priority IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
    status          VARCHAR(20) DEFAULT 'PLANNED' CHECK (status IN ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    ai_reasoning    TEXT,               -- Why the AI thinks this is needed
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_architect_missions_user ON architect_missions(user_id);
CREATE INDEX IF NOT EXISTS idx_architect_missions_status ON architect_missions(status);

CREATE OR REPLACE TRIGGER trg_missions_updated
  BEFORE UPDATE ON architect_missions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Design Studio Sessions (Conversational DB Design) ─────────
CREATE TABLE IF NOT EXISTS design_studio_sessions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mode                VARCHAR(20) NOT NULL CHECK (mode IN ('new', 'existing')),
    connection_id       UUID REFERENCES db_connections(id) ON DELETE SET NULL,  -- For 'existing' mode
    requirements_transcript JSONB DEFAULT '[]'::jsonb,  -- Full conversation history
    current_design      JSONB,  -- Generated schema, ERD, SQL scripts, etc.
    status              VARCHAR(20) NOT NULL DEFAULT 'active' 
                        CHECK (status IN ('active', 'completed', 'deployed', 'archived')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_design_studio_user ON design_studio_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_design_studio_status ON design_studio_sessions(status);
CREATE INDEX IF NOT EXISTS idx_design_studio_created ON design_studio_sessions(created_at DESC);

CREATE OR REPLACE TRIGGER trg_design_studio_updated
  BEFORE UPDATE ON design_studio_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
