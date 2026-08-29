import { Pool, PoolClient } from 'pg';
import { dbQuery as query } from '../config/database';
import { encrypt, decrypt } from '../utils/encryption';
import { ApiError } from '../utils/ApiError';
import { env } from '../config/env';

import { ConnectionInput, ConnectionRow } from '../types/connection.types';

// Pool cache — avoid recreating pools on every request
const poolCache = new Map<string, Pool>();
const poolLastAccess = new Map<string, number>();

// Evict inactive pools (inactive > 10 minutes) every 5 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
const INACTIVE_LIMIT_MS = 10 * 60 * 1000;

setInterval(async () => {
  const now = Date.now();
  for (const [connectionId, lastAccess] of poolLastAccess.entries()) {
    if (now - lastAccess > INACTIVE_LIMIT_MS) {
      const pool = poolCache.get(connectionId);
      if (pool) {
        console.log(`[ATLAS Cache] Evicting idle database pool: ${connectionId}`);
        try {
          await pool.end();
        } catch (err: any) {
          console.error(`Error ending evicted pool:`, err.message);
        }
        poolCache.delete(connectionId);
      }
      poolLastAccess.delete(connectionId);
    }
  }
}, CLEANUP_INTERVAL_MS).unref();

// ── Create Connection ──────────────────────────────────────
export const createConnection = async (
  userId: string,
  input: ConnectionInput
): Promise<ConnectionRow> => {
  const { name, host, port = 5432, databaseName, username, password, sslEnabled = false, dbType = 'postgres' } = input;

  // Cleanup any inactive connection with the same name for this user to avoid conflicts
  await query(
    'DELETE FROM db_connections WHERE user_id = $1 AND name = $2 AND is_active = false',
    [userId, name]
  );

  // Encrypt password before storing
  const passwordEnc = encrypt(password);

  const result = await query(
    `INSERT INTO db_connections
       (user_id, name, host, port, database_name, username, password_enc, ssl_enabled, db_type)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, user_id, name, host, port, database_name, username,
               ssl_enabled, is_active, db_type, last_tested_at, last_test_ok, created_at`,
    [userId, name, host, port, databaseName, username, passwordEnc, sslEnabled, dbType]
  );

  return result.rows[0];
};

// ── List Connections (Org-level: all members see all org connections) ───────
export const listConnections = async (userId: string): Promise<ConnectionRow[]> => {
  const result = await query(
    `SELECT dc.id, dc.user_id, dc.name, dc.host, dc.port, dc.database_name, dc.username,
            dc.ssl_enabled, dc.is_active, COALESCE(dc.db_type, 'postgres') AS db_type, dc.last_tested_at, dc.last_test_ok, dc.created_at
     FROM db_connections dc
     WHERE dc.is_active = true
       AND (
         dc.user_id = $1
         OR dc.user_id IN (
           SELECT u.id FROM users u
           WHERE u.organization_id = (SELECT organization_id FROM users WHERE id = $1)
             AND u.organization_id IS NOT NULL
         )
       )
     ORDER BY dc.created_at DESC`,
    [userId]
  );
  return result.rows;
};

// ── Delete Connection ──────────────────────────────────────
export const deleteConnection = async (connectionId: string, userId: string): Promise<void> => {
  // Soft delete to preserve audit trail
  const result = await query(
    'UPDATE db_connections SET is_active = false, deleted_at = NOW() WHERE id = $1 AND user_id = $2',
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
    poolLastAccess.set(connectionId, Date.now());
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
    ssl: conn.ssl_enabled
      ? (env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : { rejectUnauthorized: false })
      : false,
  });

  pool.on('error', (err: Error) => {
    console.error(`Pool error for connection ${connectionId}:`, err.message);
    poolCache.delete(connectionId);
    poolLastAccess.delete(connectionId);
  });

  // Evict LRU if cache size exceeds limit (Max 10 active pools)
  if (poolCache.size >= 10) {
    let oldestId: string | null = null;
    let oldestTime = Infinity;

    for (const [id, lastAccess] of poolLastAccess.entries()) {
      if (lastAccess < oldestTime) {
        oldestTime = lastAccess;
        oldestId = id;
      }
    }

    if (oldestId) {
      const oldestPool = poolCache.get(oldestId);
      if (oldestPool) {
        console.log(`[ATLAS Cache] LRU evicting pool: ${oldestId}`);
        try {
          await oldestPool.end();
        } catch (err: any) {
          console.error(`Error ending LRU evicted pool:`, err.message);
        }
        poolCache.delete(oldestId);
      }
      poolLastAccess.delete(oldestId);
    }
  }

  poolCache.set(connectionId, pool);
  poolLastAccess.set(connectionId, Date.now());
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

// ── Update Connection ────────────────────────────────────────
export const updateConnection = async (
  connectionId: string,
  userId: string,
  input: Partial<ConnectionInput>
): Promise<ConnectionRow> => {
  const conn = await getConnectionRow(connectionId, userId);

  const name = input.name ?? conn.name;
  const host = input.host ?? conn.host;
  const port = input.port ?? conn.port;
  const databaseName = input.databaseName ?? conn.database_name;
  const username = input.username ?? conn.username;
  const sslEnabled = input.sslEnabled ?? conn.ssl_enabled;
  
  let passwordEnc = conn.password_enc;
  if (input.password && input.password.trim() !== '') {
    passwordEnc = encrypt(input.password);
  }

  const result = await query(
    `UPDATE db_connections
     SET name = $1, host = $2, port = $3, database_name = $4, username = $5, password_enc = $6, ssl_enabled = $7, updated_at = NOW()
     WHERE id = $8 AND user_id = $9
     RETURNING id, user_id, name, host, port, database_name, username,
               ssl_enabled, is_active, last_tested_at, last_test_ok, created_at`,
    [name, host, port, databaseName, username, passwordEnc, sslEnabled, connectionId, userId]
  );

  // Evict the updated connection from pool cache so it recreates with new credentials
  const pool = poolCache.get(connectionId);
  if (pool) {
    await pool.end();
    poolCache.delete(connectionId);
  }

  return result.rows[0];
};

// ── Private helpers ────────────────────────────────────────
// Allows the owner OR any org member to access a connection
const getConnectionRow = async (connectionId: string, userId: string) => {
  const result = await query(
    `SELECT dc.id, dc.host, dc.port, dc.database_name, dc.username, dc.password_enc, dc.ssl_enabled
     FROM db_connections dc
     WHERE dc.id = $1
       AND dc.is_active = true
       AND (
         dc.user_id = $2
         OR dc.user_id IN (
           SELECT u2.id FROM users u1
           JOIN users u2 ON u1.organization_id = u2.organization_id
           WHERE u1.id = $2 AND u1.organization_id IS NOT NULL
         )
       )`,
    [connectionId, userId]
  );
  if (result.rows.length === 0) throw new ApiError(404, 'Connection not found or unauthorized');
  return result.rows[0];
};

