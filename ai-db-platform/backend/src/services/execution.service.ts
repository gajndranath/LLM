import { Pool, PoolClient } from 'pg';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';

import { ExecutionResult, ExplainResult } from '../types/execution.types';

// ── Execute SQL Safely ─────────────────────────────────────
export const executeQuery = async (
  pool: Pool,
  sql: string,
  params: unknown[] = [],
  readOnly: boolean = true // Default to true for safety
): Promise<ExecutionResult> => {
  let client: PoolClient | null = null;
  const startTime = Date.now();

  try {
    client = await pool.connect();

    // Set statement timeout on this connection
    await client.query(`SET statement_timeout = ${env.QUERY_TIMEOUT_MS}`);

    if (readOnly) {
      // Set transaction to read-only for safety
      await client.query('BEGIN');
      await client.query('SET TRANSACTION READ ONLY');
    } else {
      // Start a write transaction for ACID safety
      await client.query('BEGIN');
    }

    // Add LIMIT if not present and it's a SELECT (always do this to protect process memory)
    const safeSql = addLimitIfMissing(sql, env.MAX_QUERY_ROWS);

    const result = await client.query({
      text: safeSql,
      values: params,
      rowMode: 'array',  // Faster for large results
    });

    if (readOnly) {
      await client.query('ROLLBACK'); // Always rollback read-only queries
    } else {
      await client.query('COMMIT'); // Commit mutations
    }

    const executionMs = Date.now() - startTime;

    // Check if truncated
    const truncated = result.rowCount !== null && result.rowCount >= env.MAX_QUERY_ROWS;

    // Convert array rows to objects
    const fields = result.fields
      ? result.fields.map((f: any) => ({ name: f.name, dataTypeID: f.dataTypeID }))
      : [];
    const rows = result.rows && Array.isArray(result.rows)
      ? (result.rows as unknown[][]).map((row: any[]) =>
          Object.fromEntries(fields.map((f: any, i: number) => [f.name, row[i]]))
        )
      : [];

    return { rows, rowCount: rows.length, fields, executionMs, truncated };
  } catch (error: any) {
    if (client) {
      try { await client.query('ROLLBACK'); } catch { /* ignore */ }
    }

    let message = error.message;
    if (message.includes('canceling statement due to statement timeout')) {
      message = `Query timeout: exceeded ${env.QUERY_TIMEOUT_MS / 1000}s limit`;
    }
    
    throw new ApiError(400, `Database Execution Error: ${message}`);
  } finally {
    client?.release();
  }
};

// ── EXPLAIN ANALYZE ────────────────────────────────────────
export const explainQuery = async (
  pool: Pool,
  sql: string
): Promise<ExplainResult> => {
  let client: PoolClient | null = null;

  try {
    client = await pool.connect();
    await client.query(`SET statement_timeout = ${env.QUERY_TIMEOUT_MS}`);
    
    // Security Fix: Wrap EXPLAIN in a READ ONLY transaction to prevent 
    // destructive DDL (like DROP TABLE) if injected via multiple statements
    await client.query('BEGIN');
    await client.query('SET TRANSACTION READ ONLY');

    const explainSql = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`;
    const result = await client.query(explainSql);

    await client.query('ROLLBACK');

    const plan = result.rows[0]['QUERY PLAN'];
    const topNode = plan[0]['Plan'];

    // Extract key metrics
    const totalCost = topNode['Total Cost'] || 0;
    const actualTime = topNode['Actual Total Time'] || 0;

    // Check for sequential scans (performance warning)
    const planStr = JSON.stringify(plan);
    const hasSeqScan = planStr.includes('"Seq Scan"');

    const warnings: string[] = [];
    if (hasSeqScan) warnings.push('Sequential scan detected — consider adding an index');
    if (totalCost > 10000) warnings.push('High query cost — may be slow on large tables');
    if (actualTime > 1000) warnings.push('Query took >1s — optimization recommended');

    return { plan, totalCost, actualTime, hasSeqScan, warnings };
  } catch (error: any) {
    throw new ApiError(400, `EXPLAIN Error: ${error.message}`);
  } finally {
    if (client) {
      try { await client.query('ROLLBACK'); } catch { /* ignore */ }
      client.release();
    }
  }
};

// ── Save Query to History ──────────────────────────────────
export const saveQueryHistory = async (
  dbQuery: (text: string, params?: unknown[]) => Promise<{ rows: unknown[] }>,
  data: {
    userId: string;
    connectionId?: string;
    naturalQuery?: string;
    generatedSql: string;
    executed: boolean;
    rowCount?: number;
    executionMs?: number;
    hadError?: boolean;
    errorMessage?: string;
    explainPlan?: unknown;
    warnings?: string[];
    provider?: string;
    model?: string;
  }
): Promise<void> => {
  await dbQuery(
    `INSERT INTO query_history
       (user_id, connection_id, natural_query, generated_sql, executed,
        row_count, execution_ms, had_error, error_message, explain_plan,
        warnings, provider, model)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [
      data.userId,
      data.connectionId || null,
      data.naturalQuery || null,
      data.generatedSql,
      data.executed,
      data.rowCount || null,
      data.executionMs || null,
      data.hadError || false,
      data.errorMessage || null,
      data.explainPlan ? JSON.stringify(data.explainPlan) : null,
      data.warnings ? JSON.stringify(data.warnings) : null,
      data.provider || null,
      data.model || null,
    ]
  );
};

// ── Helper: Add LIMIT if missing ───────────────────────────
const addLimitIfMissing = (sql: string, maxRows: number): string => {
  let cleanSql = sql.trim();
  const normalized = cleanSql.toLowerCase();
  
  if (!normalized.startsWith('select')) return sql;
  if (normalized.includes(' limit ')) return sql;

  // Strip semicolon to allow LIMIT append
  if (cleanSql.endsWith(';')) {
    cleanSql = cleanSql.slice(0, -1);
  }
  
  return `${cleanSql} LIMIT ${maxRows}`;
};
