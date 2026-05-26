import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware';
import { requireMinRole } from '../middleware/rbac.middleware';
import { getConnectionPool } from '../services/connection.service';
import { extractSchema, formatSchemaForPrompt } from '../services/schema.service';
import { generateSQL, optimizeQuery } from '../services/query.service';
import { executeQuery, explainQuery, saveQueryHistory } from '../services/execution.service';
import { dbQuery as query } from '../config/database';
import { validateRequest } from '../middleware/validation.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { createRateLimiter } from '../middleware/rateLimit.middleware';
import { redisClient, getRedisStatus } from '../config/redis';

const router = Router();
router.use(authenticate);

const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 15,
  message: "Too many query requests. Please slow down.",
  prefix: "query"
});

// Zod Validation Schemas
const generateQuerySchema = z.object({
  naturalQuery: z.string().min(1, "naturalQuery is required"),
  connectionId: z.string().uuid("Invalid connectionId UUID"),
});

const executeQuerySchema = z.object({
  sql: z.string().min(1, "sql is required"),
  connectionId: z.string().uuid("Invalid connectionId UUID"),
  readOnly: z.boolean().optional(),
  confirmWrite: z.boolean().optional(),
});

const isWriteQuery = (sql: string): boolean => {
  const cleanSql = sql.trim().toLowerCase();
  const withoutComments = cleanSql
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');

  const writeKeywords = [
    /\binsert\b/i,
    /\bupdate\b/i,
    /\bdelete\b/i,
    /\bcreate\b/i,
    /\balter\b/i,
    /\bdrop\b/i,
    /\btruncate\b/i,
    /\breplace\b/i,
    /\bgrant\b/i,
    /\brevoke\b/i,
  ];

  return writeKeywords.some((regex) => regex.test(withoutComments));
};

const explainQuerySchema = z.object({
  sql: z.string().min(1, "sql is required"),
  connectionId: z.string().uuid("Invalid connectionId UUID"),
});

const optimizeQuerySchema = z.object({
  sql: z.string().min(1, "sql is required"),
  connectionId: z.string().uuid("Invalid connectionId UUID"),
});

const insightsQuerySchema = z.object({
  query: z.string().min(1, "query is required"),
  results: z.array(z.any()),
  connectionId: z.string().uuid("Invalid connectionId UUID").optional(),
});

// POST /api/query/generate — Natural language → SQL
router.post('/generate', requireMinRole('ANALYST'), apiRateLimiter, validateRequest(generateQuerySchema), asyncHandler(async (req: Request, res: Response) => {
  const { naturalQuery, connectionId } = req.body;

  const pool = await getConnectionPool(connectionId, req.user!.userId);
  const schema = await extractSchema(pool, connectionId);
  const schemaContext = formatSchemaForPrompt(schema);

  const result = await generateSQL({ naturalQuery, schemaContext, connectionId });

  await saveQueryHistory(query, {
    userId: req.user!.userId,
    connectionId,
    naturalQuery,
    generatedSql: result.sql,
    executed: false,
    warnings: result.warnings,
    provider: result.provider,
    model: result.model,
  });

  return res.status(200).json(
    new ApiResponse(200, result, "SQL generated successfully")
  );
}));

// POST /api/query/execute — Execute validated SQL
router.post('/execute', requireMinRole('ANALYST'), apiRateLimiter, validateRequest(executeQuerySchema), asyncHandler(async (req: Request, res: Response) => {
  const { sql, connectionId, confirmWrite = false } = req.body;
  const isWrite = isWriteQuery(sql);

  if (isWrite) {
    // 1. Enforce Role: Writes require ADMIN or SUPER_ADMIN
    const userRole = req.user!.role;
    if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
      throw new ApiError(403, "You do not have permission to execute database mutations. Writes are restricted to Administrator roles.");
    }

    // 2. Enforce Confirmation
    if (!confirmWrite) {
      return res.status(200).json(
        new ApiResponse(200, {
          requiresConfirmation: true,
          message: "This query contains write statements. Please check the confirmation checkbox to execute database mutations."
        }, "Write query execution requires confirmation")
      );
    }
  }

  const pool = await getConnectionPool(connectionId, req.user!.userId);
  
  // Enforce readOnly execution unless it's an authorized write query
  const finalReadOnly = !isWrite;
  const result = await executeQuery(pool, sql, [], finalReadOnly);

  // Invalidate schema cache on database mutations
  if (isWrite) {
    console.log(`[AUDIT] User ${req.user!.userId} (${req.user!.email}) executed mutation SQL on connection ${connectionId}: "${sql.slice(0, 150).replace(/\r?\n|\r/g, ' ')}"`);
    if (getRedisStatus()) {
      try {
        await redisClient.del(`schema:cache:${connectionId}`);
      } catch (err) {
        console.warn("[Schema Cache] Failed to invalidate cache on execute:", err);
      }
    }
  }

  await saveQueryHistory(query, {
    userId: req.user!.userId,
    connectionId,
    generatedSql: sql,
    executed: true,
    rowCount: result.rowCount,
    executionMs: result.executionMs,
  });

  return res.status(200).json(
    new ApiResponse(200, result, "Query executed successfully")
  );
}));

// POST /api/query/explain — EXPLAIN ANALYZE
router.post('/explain', requireMinRole('ANALYST'), apiRateLimiter, validateRequest(explainQuerySchema), asyncHandler(async (req: Request, res: Response) => {
  const { sql, connectionId } = req.body;

  const pool = await getConnectionPool(connectionId, req.user!.userId);
  const explainResult = await explainQuery(pool, sql);

  return res.status(200).json(
    new ApiResponse(200, explainResult, "Explain plan generated")
  );
}));

// POST /api/query/optimize — Optimize bad query
router.post('/optimize', requireMinRole('ANALYST'), apiRateLimiter, validateRequest(optimizeQuerySchema), asyncHandler(async (req: Request, res: Response) => {
  const { sql, connectionId } = req.body;

  const pool = await getConnectionPool(connectionId, req.user!.userId);
  const schema = await extractSchema(pool, connectionId);
  const schemaContext = formatSchemaForPrompt(schema);

  let explainPlan = null;
  try {
    explainPlan = await explainQuery(pool, sql);
  } catch { /* ignore */ }

  const result = await optimizeQuery({ sql, schemaContext, explainPlan });

  return res.status(200).json(
    new ApiResponse(200, result, "Optimization suggestions generated")
  );
}));

// GET /api/query/history
router.get('/history', asyncHandler(async (req: Request, res: Response) => {
  const { connectionId, limit = '20', offset = '0' } = req.query;
  const limitVal = Math.min(Math.max(parseInt(limit as string) || 20, 1), 100);
  const offsetVal = Math.max(parseInt(offset as string) || 0, 0);

  let queryText = `
    SELECT id, connection_id, natural_query, generated_sql, executed,
           row_count, execution_ms, had_error, warnings, provider, model, created_at
    FROM query_history
    WHERE user_id = $1
  `;
  const params: unknown[] = [req.user!.userId];

  if (connectionId) {
    queryText += ` AND connection_id = $${params.length + 1}`;
    params.push(connectionId);
  }

  queryText += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limitVal, offsetVal);

  const result = await query(queryText, params);

  return res.status(200).json(
    new ApiResponse(200, result.rows, "Query history fetched")
  );
}));

// POST /api/query/insights — Generate NL insights from results
router.post('/insights', requireMinRole('ANALYST'), apiRateLimiter, validateRequest(insightsQuerySchema), asyncHandler(async (req: Request, res: Response) => {
  const { query: naturalQuery, results, connectionId } = req.body;

  let schemaContext = "";
  if (connectionId) {
    try {
      const pool = await getConnectionPool(connectionId, req.user!.userId);
      const schema = await extractSchema(pool, connectionId);
      schemaContext = formatSchemaForPrompt(schema);
    } catch (err) {
      console.error("Failed to extract schema for insights context", err);
    }
  }

  const { generateInsights } = require('../services/query.service');
  const insights = await generateInsights(naturalQuery, results, schemaContext);

  return res.status(200).json(
    new ApiResponse(200, insights, "Insights generated successfully")
  );
}));

export default router;
