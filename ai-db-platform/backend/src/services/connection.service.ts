import { Pool, PoolClient } from 'pg';
import { dbQuery as query } from '../config/database';
import { encrypt, decrypt } from '../utils/encryption';
import { ApiError } from '../utils/ApiError';

export interface ConnectionInput {
  name: string;
  host: string;
  port?: number;
  databaseName: string;
  username: string;
  password: string;
  sslEnabled?: boolean;
}

export interface ConnectionRow {
  id: string;
  user_id: string;
  name: string;
  host: string;
  port: number;
  database_name: string;
  username: string;
  ssl_enabled: boolean;
  is_active: boolean;
  last_tested_at: string | null;
  last_test_ok: boolean | null;
  created_at: string;
}

// Pool cache — avoid recreating pools on every request
const poolCache = new Map<string, Pool>();

// ── Create Connection ──────────────────────────────────────
export const createConnection = async (
  userId: string,
  input: ConnectionInput
): Promise<ConnectionRow> => {
  const { name, host, port = 5432, databaseName, username, password, sslEnabled = false } = input;

  // Cleanup any inactive connection with the same name for this user to avoid conflicts
  await query(
    'DELETE FROM db_connections WHERE user_id = $1 AND name = $2 AND is_active = false',
    [userId, name]
  );

  // Encrypt password before storing
  const passwordEnc = encrypt(password);

  const result = await query(
    `INSERT INTO db_connections
       (user_id, name, host, port, database_name, username, password_enc, ssl_enabled)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, user_id, name, host, port, database_name, username,
               ssl_enabled, is_active, last_tested_at, last_test_ok, created_at`,
    [userId, name, host, port, databaseName, username, passwordEnc, sslEnabled]
  );

  return result.rows[0];
};

// ── List Connections ───────────────────────────────────────
export const listConnections = async (userId: string): Promise<ConnectionRow[]> => {
  const result = await query(
    `SELECT id, user_id, name, host, port, database_name, username,
            ssl_enabled, is_active, last_tested_at, last_test_ok, created_at
     FROM db_connections
     WHERE user_id = $1 AND is_active = true
     ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows;
};

// ── Delete Connection ──────────────────────────────────────
export const deleteConnection = async (connectionId: string, userId: string): Promise<void> => {
  // Hard delete to avoid unique constraint issues with names
  const result = await query(
    'DELETE FROM db_connections WHERE id = $1 AND user_id = $2',
    [connectionId, userId]
  );
  if (result.rowCount === 0) throw new ApiError(404, 'Connection not found or unauthorized');

  // Remove from pool cache
  const pool = poolCache.get(connectionId);
  if (pool) {
    await pool.end();
    poolCache.delete(connectionId);
  }
};

// ── Get Pool for User's DB ─────────────────────────────────
export const getConnectionPool = async (
  connectionId: string,
  userId: string
): Promise<Pool> => {
  // Return cached pool if exists
  if (poolCache.has(connectionId)) {
    return poolCache.get(connectionId)!;
  }

  const conn = await getConnectionRow(connectionId, userId);
  const password = decrypt(conn.password_enc);

  const pool = new Pool({
    host: conn.host,
    port: conn.port,
    database: conn.database_name,
    user: conn.username,
    password,
    max: 5,                         // Small pool — user connections
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    ssl: conn.ssl_enabled ? { rejectUnauthorized: false } : false,
  });

  pool.on('error', (err) => {
    console.error(`Pool error for connection ${connectionId}:`, err.message);
    poolCache.delete(connectionId);
  });

  poolCache.set(connectionId, pool);
  return pool;
};

// ── Test Connection ────────────────────────────────────────
export const testConnection = async (
  connectionId: string,
  userId: string
): Promise<{ success: boolean; message: string; latencyMs?: number }> => {
  let client: PoolClient | null = null;
  const startTime = Date.now();

  try {
    const pool = await getConnectionPool(connectionId, userId);
    client = await pool.connect();
    await client.query('SELECT 1');
    const latencyMs = Date.now() - startTime;

    // Update last test result
    await query(
      'UPDATE db_connections SET last_tested_at = NOW(), last_test_ok = true WHERE id = $1',
      [connectionId]
    );

    return { success: true, message: 'Connection successful', latencyMs };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Connection failed';

    await query(
      'UPDATE db_connections SET last_tested_at = NOW(), last_test_ok = false WHERE id = $1',
      [connectionId]
    );

    return { success: false, message };
  } finally {
    client?.release();
  }
};

// ── Private helpers ────────────────────────────────────────
const getConnectionRow = async (connectionId: string, userId: string) => {
  const result = await query(
    `SELECT id, host, port, database_name, username, password_enc, ssl_enabled
     FROM db_connections
     WHERE id = $1 AND user_id = $2 AND is_active = true`,
    [connectionId, userId]
  );
  if (result.rows.length === 0) throw new ApiError(404, 'Connection not found or unauthorized');
  return result.rows[0];
};
