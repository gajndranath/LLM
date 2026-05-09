import { Pool, PoolClient } from 'pg';
import { env } from './env';

// Platform's own PostgreSQL connection
// This handles both local Docker and Cloud (Neon) automatically
export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 20,
  idleTimeoutMillis: 60000,      // Increase to 60s
  connectionTimeoutMillis: 20000 // Increase to 20s
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL pool error:', err.message);
});

export const testDatabaseConnection = async (): Promise<void> => {
  let client: PoolClient | null = null;
  try {
    client = await pool.connect();
    const result = await client.query('SELECT NOW() as time, version() as version');
    console.log(`✅ PostgreSQL connected — ${result.rows[0].time}`);
  } catch (error) {
    console.error('❌ PostgreSQL connection failed. Check your DATABASE_URL in .env');
    console.error('Details:', error instanceof Error ? error.message : error);
    throw error;
  } finally {
    client?.release();
  }
};

// Main query function used by services
export const dbQuery = (text: string, params?: unknown[]) => pool.query(text, params);
