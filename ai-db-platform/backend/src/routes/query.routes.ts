import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireMinRole } from '../middleware/rbac.middleware';
import { getConnectionPool } from '../services/connection.service';
import { extractSchema, formatSchemaForPrompt } from '../services/schema.service';
import { generateSQL, optimizeQuery } from '../services/query.service';
import { executeQuery, explainQuery, saveQueryHistory } from '../services/execution.service';
import { dbQuery as query } from '../config/database';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';

const router = Router();
router.use(authenticate);

// POST /api/query/generate — Natural language → SQL
router.post('/generate', requireMinRole('ANALYST'), asyncHandler(async (req: Request, res: Response) => {
  const { naturalQuery, connectionId } = req.body;

  const pool = await getConnectionPool(connectionId, req.user!.userId);
  const schema = await extractSchema(pool);
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
router.post('/execute', requireMinRole('ANALYST'), asyncHandler(async (req: Request, res: Response) => {
  const { sql, connectionId, readOnly = true } = req.body;

  const pool = await getConnectionPool(connectionId, req.user!.userId);
  const result = await executeQuery(pool, sql, [], readOnly);

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
router.post('/explain', requireMinRole('ANALYST'), asyncHandler(async (req: Request, res: Response) => {
  const { sql, connectionId } = req.body;

  const pool = await getConnectionPool(connectionId, req.user!.userId);
  const explainResult = await explainQuery(pool, sql);

  return res.status(200).json(
    new ApiResponse(200, explainResult, "Explain plan generated")
  );
}));

// POST /api/query/optimize — Optimize bad query
router.post('/optimize', requireMinRole('ANALYST'), asyncHandler(async (req: Request, res: Response) => {
  const { sql, connectionId } = req.body;

  const pool = await getConnectionPool(connectionId, req.user!.userId);
  const schema = await extractSchema(pool);
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
  params.push(parseInt(limit as string), parseInt(offset as string));

  const result = await query(queryText, params);

  return res.status(200).json(
    new ApiResponse(200, result.rows, "Query history fetched")
  );
}));

// POST /api/query/insights — Generate NL insights from results
router.post('/insights', requireMinRole('ANALYST'), asyncHandler(async (req: Request, res: Response) => {
  const { query: naturalQuery, results, connectionId } = req.body;

  if (!results || !Array.isArray(results)) {
    throw new ApiError(400, "Results array is required for insights");
  }

  let schemaContext = "";
  if (connectionId) {
    try {
      const pool = await getConnectionPool(connectionId, req.user!.userId);
      const schema = await extractSchema(pool);
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
