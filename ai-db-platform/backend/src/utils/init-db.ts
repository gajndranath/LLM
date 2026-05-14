import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.join(__dirname, '../../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const initDb = async () => {
  console.log('🏁 ATLAS: Initializing Database Tables...');
  
  const queries = [
    `CREATE TABLE IF NOT EXISTS architect_audits (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        connection_id UUID NOT NULL,
        scale VARCHAR(50),
        requirements TEXT,
        review_data JSONB,
        scalability_score INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );`,
    `CREATE TABLE IF NOT EXISTS architect_missions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        connection_id UUID NOT NULL,
        title VARCHAR(255),
        description TEXT,
        priority VARCHAR(20),
        status VARCHAR(20),
        ai_reasoning TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );`,
    `CREATE INDEX IF NOT EXISTS idx_architect_audits_user ON architect_audits(user_id);`,
    `CREATE INDEX IF NOT EXISTS idx_architect_audits_conn ON architect_audits(connection_id);`,
    `CREATE INDEX IF NOT EXISTS idx_architect_missions_user ON architect_missions(user_id);`,
    `CREATE INDEX IF NOT EXISTS idx_architect_missions_status ON architect_missions(status);`
  ];

  try {
    for (const q of queries) {
      await pool.query(q);
      console.log('✅ Executed: ' + q.split('(')[0].trim());
    }
    console.log('🚀 ATLAS: All tables are now LIVE!');
  } catch (err) {
    console.error('❌ Database Init Failed:', err);
  } finally {
    await pool.end();
  }
};

initDb();
