import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware';
import { requireMinRole } from '../middleware/rbac.middleware';
import { getConnectionPool } from '../services/connection.service';
import { extractSchema, formatSchemaForPrompt } from '../services/schema.service';
import { analyzeArchitecture } from '../services/architect.service';
import { dbQuery as query } from '../config/database';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { executeQuery } from '../services/execution.service';
import { createRateLimiter } from '../middleware/rateLimit.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { aiClient } from '../services/aiClient';
import { redisClient, getRedisStatus } from '../config/redis';

const router = Router();
router.use(authenticate);

const architectRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 15,
  message: "Too many architectural review requests. Please slow down.",
  prefix: "architect"
});

const reviewSchema = z.object({
  connectionId: z.string().uuid("Invalid connectionId UUID"),
  requirements: z.string().optional(),
  scale: z.string().optional(),
});

const applyFixSchema = z.object({
  connectionId: z.string().uuid("Invalid connectionId UUID"),
  title: z.string().min(1, "title is required"),
  description: z.string().optional(),
  sql: z.string().min(1, "sql is required"),
  rollbackSql: z.string().optional(),
  confirmWrite: z.boolean().optional(),
});

const rollbackFixSchema = z.object({
  mutationId: z.string().uuid("Invalid mutationId UUID"),
  confirmWrite: z.boolean().optional(),
});

// POST /api/architect/review — Deep audit of connected DB
router.post('/review', requireMinRole('ANALYST'), architectRateLimiter, validateRequest(reviewSchema), asyncHandler(async (req: Request, res: Response) => {
  const { connectionId, requirements, scale } = req.body;
  
  if (!connectionId) {
    return res.status(400).json(new ApiResponse(400, null, "Connection ID is required"));
  }

  const pool = await getConnectionPool(connectionId, req.user!.userId);
  const schema = await extractSchema(pool, connectionId);
  const schemaContext = formatSchemaForPrompt(schema);

  // NEW: Fetch last 3 audits to provide "Long-term Memory"
  const pastAudits = await query(
    `SELECT scale, requirements, scalability_score, created_at 
     FROM architect_audits 
     WHERE connection_id = $1 
     ORDER BY created_at DESC LIMIT 3`,
    [connectionId]
  );

  const historyContext = pastAudits.rows.length > 0 
    ? pastAudits.rows.map((a: any) => 
        `Audit on ${a.created_at}: Score ${a.scalability_score}, Scale ${a.scale}. Req: ${a.requirements || 'N/A'}`
      ).join('\n')
    : "No previous audits found for this database.";

  const review = await analyzeArchitecture({
    schemaContext,
    requirements,
    scale,
    historyContext // Pass the "Brain" context
  });

  // NEW: Save to Audit History
  await query(
    `INSERT INTO architect_audits 
      (user_id, connection_id, scale, requirements, review_data, scalability_score)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [req.user!.userId, connectionId, scale, requirements || null, JSON.stringify(review), review.scalability_score]
  );

  // Save ATLAS Missions — deduplicated by (user_id, connection_id, title)
  if (review.suggested_missions && review.suggested_missions.length > 0) {
    for (const mission of review.suggested_missions) {
      await query(
        `INSERT INTO architect_missions 
          (user_id, connection_id, title, description, priority, ai_reasoning, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'PLANNED')
         ON CONFLICT (user_id, connection_id, title) DO NOTHING`,
        [req.user!.userId, connectionId, mission.title, mission.description, mission.priority, mission.reasoning]
      );
    }
  }

  return res.status(200).json(
    new ApiResponse(200, review, "Architectural review completed & missions updated")
  );
}));

// GET /api/architect/history — Get past audits
router.get('/history', requireMinRole('ANALYST'), asyncHandler(async (req: Request, res: Response) => {
  const { connectionId } = req.query;
  
  let queryText = `
    SELECT a.*, c.name as connection_name 
    FROM architect_audits a
    JOIN db_connections c ON a.connection_id = c.id
    WHERE a.user_id = $1
  `;
  const params: any[] = [req.user!.userId];

  if (connectionId) {
    const parseResult = z.string().uuid("Invalid connectionId format").safeParse(connectionId);
    if (!parseResult.success) {
      return res.status(400).json(new ApiResponse(400, null, parseResult.error.issues[0].message));
    }
    queryText += ` AND a.connection_id = $2`;
    params.push(connectionId);
  }

  queryText += ` ORDER BY a.created_at DESC LIMIT 50`;

  const result = await query(queryText, params);

  return res.status(200).json(
    new ApiResponse(200, result.rows, "Audit history fetched")
  );
}));

// POST /api/architect/apply-fix — Apply an architectural schema fix
router.post('/apply-fix', requireMinRole('ADMIN'), architectRateLimiter, validateRequest(applyFixSchema), asyncHandler(async (req: Request, res: Response) => {
  const { connectionId, title, description, sql, rollbackSql, confirmWrite = false } = req.body;

  if (!connectionId || !sql || !title) {
    return res.status(400).json(new ApiResponse(400, null, "connectionId, title, and sql are required"));
  }

  if (!confirmWrite) {
    return res.status(200).json(
      new ApiResponse(200, {
        requiresConfirmation: true,
        message: "Applying this architectural schema fix requires explicit confirmation."
      }, "Apply fix execution requires confirmation")
    );
  }

  const pool = await getConnectionPool(connectionId, req.user!.userId);

  // Self-healing database execution:
  // 1. If SQL contains encrypt or decrypt, make sure pgcrypto is created.
  if (/encrypt|decrypt/i.test(sql) || (rollbackSql && /encrypt|decrypt/i.test(rollbackSql))) {
    try {
      await executeQuery(pool, "CREATE EXTENSION IF NOT EXISTS pgcrypto;", [], false);
    } catch (e) {
      console.warn("Failed to create pgcrypto extension, trying query anyway:", e);
    }
  }

  // 2. Translate raw DDL & functions via AI service sqlglot AST transformation
  let finalSql = sql;
  try {
    const transformRes = await aiClient.post('/transform-sql', { sql, dialect: 'postgres' });
    finalSql = transformRes.data.transformed_sql;
  } catch (err) {
    console.warn("SQL transformation service failed, falling back to original SQL:", err);
  }

  let finalRollbackSql = rollbackSql;
  if (rollbackSql) {
    try {
      const transformRollbackRes = await aiClient.post('/transform-sql', { sql: rollbackSql, dialect: 'postgres' });
      finalRollbackSql = transformRollbackRes.data.transformed_sql;
    } catch (err) {
      console.warn("SQL rollback transformation service failed, falling back to original rollback SQL:", err);
    }
  }

  // 3. Validate final SQL safety via AI service
  try {
    const validateRes = await aiClient.post('/validate-sql', { sql: finalSql, dialect: 'postgres' });
    if (!validateRes.data.valid) {
      throw new ApiError(400, `SQL Safety Validation Failed: ${validateRes.data.error}`);
    }
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    console.warn("SQL validation service failed/errored, proceeding with caution:", err);
  }

  // Execute the schema mutation SQL
  await executeQuery(pool, finalSql, [], false);

  console.log(`[AUDIT] User ${req.user!.userId} (${req.user!.email}) applied architectural fix "${title}" on connection ${connectionId}: "${finalSql.slice(0, 150).replace(/\r?\n|\r/g, ' ')}"`);

  // Invalidate schema cache
  if (getRedisStatus()) {
    try {
      await redisClient.del(`schema:cache:${connectionId}`);
    } catch (err) {
      console.warn("[Schema Cache] Failed to invalidate cache on apply-fix:", err);
    }
  }

  // Record the schema mutation in ATLAS system DB
  const result = await query(
    `INSERT INTO schema_mutations 
      (user_id, connection_id, title, description, sql_executed, rollback_sql, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'APPLIED')
     RETURNING id, title, status, created_at`,
    [req.user!.userId, connectionId, title, description || null, finalSql, finalRollbackSql || null]
  );

  return res.status(200).json(
    new ApiResponse(200, result.rows[0], "Schema fix applied successfully and logged")
  );
}));

// GET /api/architect/mutations — Get applied schema mutations
router.get('/mutations', requireMinRole('ANALYST'), asyncHandler(async (req: Request, res: Response) => {
  const { connectionId } = req.query;

  if (!connectionId) {
    return res.status(400).json(new ApiResponse(400, null, "connectionId query parameter is required"));
  }

  const result = await query(
    `SELECT id, connection_id, title, description, sql_executed, rollback_sql, status, created_at
     FROM schema_mutations
     WHERE user_id = $1 AND connection_id = $2
     ORDER BY created_at DESC`,
    [req.user!.userId, connectionId]
  );

  return res.status(200).json(
    new ApiResponse(200, result.rows, "Schema mutations fetched")
  );
}));

// POST /api/architect/rollback-fix — Rollback an applied schema fix
router.post('/rollback-fix', requireMinRole('ADMIN'), architectRateLimiter, validateRequest(rollbackFixSchema), asyncHandler(async (req: Request, res: Response) => {
  const { mutationId, confirmWrite = false } = req.body;

  if (!mutationId) {
    return res.status(400).json(new ApiResponse(400, null, "mutationId is required"));
  }

  if (!confirmWrite) {
    return res.status(200).json(
      new ApiResponse(200, {
        requiresConfirmation: true,
        message: "Rolling back this architectural fix requires explicit confirmation."
      }, "Rollback execution requires confirmation")
    );
  }

  // Fetch the mutation details
  const mutationResult = await query(
    `SELECT * FROM schema_mutations WHERE id = $1 AND user_id = $2`,
    [mutationId, req.user!.userId]
  );

  if (mutationResult.rows.length === 0) {
    return res.status(404).json(new ApiResponse(404, null, "Mutation record not found"));
  }

  const mutation = mutationResult.rows[0];

  if (mutation.status !== 'APPLIED') {
    return res.status(400).json(new ApiResponse(400, null, `Mutation status is currently '${mutation.status}'. Only 'APPLIED' mutations can be rolled back.`));
  }

  if (!mutation.rollback_sql) {
    return res.status(400).json(new ApiResponse(400, null, "No rollback SQL exists for this mutation"));
  }

  const pool = await getConnectionPool(mutation.connection_id, req.user!.userId);

  // Execute rollback SQL
  await executeQuery(pool, mutation.rollback_sql, [], false);

  console.log(`[AUDIT] User ${req.user!.userId} (${req.user!.email}) rolled back architectural fix "${mutation.title}" (mutation ID: ${mutationId}) on connection ${mutation.connection_id}`);

  // Invalidate schema cache
  if (getRedisStatus()) {
    try {
      await redisClient.del(`schema:cache:${mutation.connection_id}`);
    } catch (err) {
      console.warn("[Schema Cache] Failed to invalidate cache on rollback-fix:", err);
    }
  }

  // Update status in ATLAS system DB
  const updated = await query(
    `UPDATE schema_mutations 
     SET status = 'ROLLED_BACK' 
     WHERE id = $1 
     RETURNING id, title, status`,
    [mutationId]
  );

  return res.status(200).json(
    new ApiResponse(200, updated.rows[0], "Mutation rolled back successfully")
  );
}));

// DELETE /api/architect/history/:id — Delete a specific audit history entry
router.delete('/history/:id', requireMinRole('ANALYST'), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const parseResult = z.string().uuid("Invalid audit history ID format").safeParse(id);
  if (!parseResult.success) {
    return res.status(400).json(new ApiResponse(400, null, parseResult.error.issues[0].message));
  }

  const result = await query(
    `DELETE FROM architect_audits 
     WHERE id = $1 AND user_id = $2`,
    [id, req.user!.userId]
  );
  if (result.rowCount === 0) {
    return res.status(404).json(new ApiResponse(404, null, "Audit history record not found"));
  }
  return res.status(200).json(
    new ApiResponse(200, null, "Audit history record deleted successfully")
  );
}));

export default router;
