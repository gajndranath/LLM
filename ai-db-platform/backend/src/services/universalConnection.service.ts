import { Pool } from 'pg';
import mysql from 'mysql2/promise';
import { MongoClient } from 'mongodb';
import Redis from 'ioredis';
import { dbQuery as query } from '../config/database';
import { decrypt } from '../utils/encryption';
import { ApiError } from '../utils/ApiError';
import { DatabaseEngineType } from '../types/connection.types';

// Polyglot Engine Pool Caches
const pgPoolCache = new Map<string, Pool>();
const mysqlPoolCache = new Map<string, mysql.Pool>();
const mongoClientCache = new Map<string, MongoClient>();
const redisClientCache = new Map<string, Redis>();
const poolLastAccess = new Map<string, number>();

// Inactive Pool Eviction (10 mins idle limit)
const INACTIVE_LIMIT_MS = 10 * 60 * 1000;
setInterval(async () => {
  const now = Date.now();
  for (const [connectionId, lastAccess] of poolLastAccess.entries()) {
    if (now - lastAccess > INACTIVE_LIMIT_MS) {
      // Evict PostgreSQL
      const pgPool = pgPoolCache.get(connectionId);
      if (pgPool) {
        try { await pgPool.end(); } catch (_) {}
        pgPoolCache.delete(connectionId);
      }
      // Evict MySQL
      const mysqlPool = mysqlPoolCache.get(connectionId);
      if (mysqlPool) {
        try { await mysqlPool.end(); } catch (_) {}
        mysqlPoolCache.delete(connectionId);
      }
      // Evict MongoDB
      const mongoClient = mongoClientCache.get(connectionId);
      if (mongoClient) {
        try { await mongoClient.close(); } catch (_) {}
        mongoClientCache.delete(connectionId);
      }
      // Evict Redis
      const redisClient = redisClientCache.get(connectionId);
      if (redisClient) {
        try { redisClient.disconnect(); } catch (_) {}
        redisClientCache.delete(connectionId);
      }
      poolLastAccess.delete(connectionId);
    }
  }
}, 5 * 60 * 1000).unref();

/**
 * Universal Database Client Provider
 * Transparently returns the correct native pool or client based on db_type.
 */
export const getDatabaseClient = async (
  connectionId: string,
  userId: string
): Promise<{
  engine: DatabaseEngineType;
  pgPool?: Pool;
  mysqlPool?: mysql.Pool;
  mongoClient?: MongoClient;
  redisClient?: Redis;
  databaseName: string;
}> => {
  poolLastAccess.set(connectionId, Date.now());

  // 1. Fetch connection details from Core DB
  const result = await query(
    `SELECT id, name, host, port, database_name, username, password_enc, ssl_enabled,
            COALESCE(db_type, 'postgres') AS db_type
     FROM db_connections
     WHERE id = $1 AND user_id = $2 AND is_active = true`,
    [connectionId, userId]
  );

  if (result.rows.length === 0) {
    throw new ApiError(404, 'Database connection not found or unauthorized');
  }

  const conn = result.rows[0];
  const password = decrypt(conn.password_enc);
  const engine: DatabaseEngineType = conn.db_type as DatabaseEngineType;

  // 2. Route by Database Engine
  switch (engine) {
    case 'mysql': {
      if (!mysqlPoolCache.has(connectionId)) {
        const pool = mysql.createPool({
          host: conn.host,
          port: conn.port || 3306,
          user: conn.username,
          password: password,
          database: conn.database_name,
          ssl: conn.ssl_enabled ? { rejectUnauthorized: false } : undefined,
          waitForConnections: true,
          connectionLimit: 10,
          queueLimit: 0,
        });
        mysqlPoolCache.set(connectionId, pool);
      }
      return { engine: 'mysql', mysqlPool: mysqlPoolCache.get(connectionId), databaseName: conn.database_name };
    }

    case 'mongodb': {
      if (!mongoClientCache.has(connectionId)) {
        const uri = conn.host.startsWith('mongodb') 
          ? conn.host 
          : `mongodb://${encodeURIComponent(conn.username)}:${encodeURIComponent(password)}@${conn.host}:${conn.port || 27017}/${conn.database_name}?authSource=admin`;
        const client = new MongoClient(uri);
        await client.connect();
        mongoClientCache.set(connectionId, client);
      }
      return { engine: 'mongodb', mongoClient: mongoClientCache.get(connectionId), databaseName: conn.database_name };
    }

    case 'redis': {
      if (!redisClientCache.has(connectionId)) {
        const client = new Redis({
          host: conn.host,
          port: conn.port || 6379,
          password: password || undefined,
          lazyConnect: true,
        });
        await client.connect();
        redisClientCache.set(connectionId, client);
      }
      return { engine: 'redis', redisClient: redisClientCache.get(connectionId), databaseName: conn.database_name };
    }

    case 'postgres':
    default: {
      if (!pgPoolCache.has(connectionId)) {
        const pool = new Pool({
          host: conn.host,
          port: conn.port || 5432,
          database: conn.database_name,
          user: conn.username,
          password: password,
          ssl: conn.ssl_enabled ? { rejectUnauthorized: false } : false,
          max: 10,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 5000,
        });
        pgPoolCache.set(connectionId, pool);
      }
      return { engine: 'postgres', pgPool: pgPoolCache.get(connectionId), databaseName: conn.database_name };
    }
  }
};
