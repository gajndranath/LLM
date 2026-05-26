const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const sql = `
  CREATE TABLE IF NOT EXISTS design_studio_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mode VARCHAR(20) NOT NULL CHECK (mode IN ('new', 'existing')),
    connection_id UUID REFERENCES db_connections(id) ON DELETE SET NULL,
    requirements_transcript JSONB DEFAULT '[]'::jsonb,
    current_design JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'deployed', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_design_studio_user ON design_studio_sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_design_studio_status ON design_studio_sessions(status);
  CREATE INDEX IF NOT EXISTS idx_design_studio_created ON design_studio_sessions(created_at DESC);

  CREATE OR REPLACE FUNCTION update_updated_at()
  RETURNS TRIGGER AS $func$
  BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
  $func$ LANGUAGE plpgsql;

  CREATE OR REPLACE TRIGGER trg_design_studio_updated
    BEFORE UPDATE ON design_studio_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

  CREATE TABLE IF NOT EXISTS architect_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    connection_id UUID NOT NULL REFERENCES db_connections(id) ON DELETE CASCADE,
    scale VARCHAR(50) NOT NULL,
    requirements TEXT,
    review_data JSONB NOT NULL,
    scalability_score INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_architect_audits_user ON architect_audits(user_id);
  CREATE INDEX IF NOT EXISTS idx_architect_audits_conn ON architect_audits(connection_id);

  CREATE TABLE IF NOT EXISTS architect_missions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    connection_id UUID NOT NULL REFERENCES db_connections(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(20) DEFAULT 'MEDIUM' CHECK (priority IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
    status VARCHAR(20) DEFAULT 'PLANNED' CHECK (status IN ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    ai_reasoning TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_architect_missions_user ON architect_missions(user_id);
  CREATE INDEX IF NOT EXISTS idx_architect_missions_status ON architect_missions(status);

  CREATE TABLE IF NOT EXISTS architect_mutations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    connection_id UUID NOT NULL REFERENCES db_connections(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    sql_executed TEXT NOT NULL,
    rollback_sql TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'APPLIED' CHECK (status IN ('APPLIED', 'ROLLED_BACK')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_architect_mutations_user ON architect_mutations(user_id);
  CREATE INDEX IF NOT EXISTS idx_architect_mutations_conn ON architect_mutations(connection_id);
  CREATE INDEX IF NOT EXISTS idx_architect_mutations_status ON architect_mutations(status);
`;

pool.query(sql)
  .then(() => {
    console.log('✅ All tables created successfully!');
    pool.end();
  })
  .catch(e => {
    console.error('❌ Error:', e.message);
    pool.end();
  });
