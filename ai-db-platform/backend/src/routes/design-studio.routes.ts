import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware';
import { getConnectionPool } from '../services/connection.service';
import { extractSchema, formatSchemaForPrompt } from '../services/schema.service';
import { aiClient } from '../services/aiClient';
import { dbQuery as query } from '../config/database';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { env } from '../config/env';
import { createRateLimiter } from '../middleware/rateLimit.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { checkLLMQueryLimit } from '../middleware/plan.middleware';

const router = Router();
router.use(authenticate);

const studioRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 15,
  message: "Too many requests to design studio. Please slow down.",
  prefix: "studio"
});

// Zod Validation Schemas
const createSessionSchema = z.object({
  mode: z.enum(['new', 'existing']),
  connectionId: z.string().uuid("Invalid connectionId UUID").optional().nullable(),
}).refine(data => data.mode !== 'existing' || data.connectionId, {
  message: "connectionId is required for existing mode",
  path: ['connectionId']
});

const probeSchema = z.object({
  sessionId: z.string().uuid("Invalid sessionId UUID"),
  userMessage: z.string().min(1, "userMessage is required"),
});

const generateSchemaSchema = z.object({
  sessionId: z.string().uuid("Invalid sessionId UUID"),
});

const auditExistingSchema = z.object({
  sessionId: z.string().uuid("Invalid sessionId UUID").optional().nullable(),
  connectionId: z.string().uuid("Invalid connectionId UUID"),
  userConcerns: z.string().optional().nullable(),
});

const deploySchema = z.object({
  sessionId: z.string().uuid("Invalid sessionId UUID"),
  connectionId: z.string().uuid("Invalid connectionId UUID"),
});

// ── GET /api/design-studio/sessions — List all sessions ──────
router.get('/sessions', asyncHandler(async (req: Request, res: Response) => {
  const result = await query(
    `SELECT dss.id, dss.mode, dss.connection_id, dss.status, dss.current_design, dss.created_at, dss.updated_at,
      (SELECT COALESCE(json_agg(json_build_object('role', sm.role, 'content', sm.content) ORDER BY sm.created_at ASC), '[]'::json)
       FROM session_messages sm WHERE sm.session_id = dss.id) AS requirements_transcript
     FROM design_studio_sessions dss
     WHERE dss.user_id = $1
     ORDER BY dss.updated_at DESC
     LIMIT 20`,
    [req.user!.userId]
  );
  return res.json(new ApiResponse(200, result.rows, 'Sessions fetched'));
}));

// ── POST /api/design-studio/sessions — Create new session ─────
router.post('/sessions', studioRateLimiter, validateRequest(createSessionSchema), asyncHandler(async (req: Request, res: Response) => {
  const { mode, connectionId } = req.body;

  const result = await query(
    `INSERT INTO design_studio_sessions (user_id, mode, connection_id, status)
     VALUES ($1, $2, $3, 'active')
     RETURNING id, mode, connection_id, status, created_at`,
    [req.user!.userId, mode, connectionId || null]
  );

  return res.status(201).json(new ApiResponse(201, result.rows[0], 'Session created'));
}));

// ── POST /api/design-studio/probe — AI asks requirements questions ─
router.post('/probe', studioRateLimiter, checkLLMQueryLimit, validateRequest(probeSchema), asyncHandler(async (req: Request, res: Response) => {
  const { sessionId, userMessage, provider, model } = req.body;

  // Load session + existing transcript + connection_id
  const sessionResult = await query(
    `SELECT id, connection_id FROM design_studio_sessions
     WHERE id = $1 AND user_id = $2`,
    [sessionId, req.user!.userId]
  );
  if (sessionResult.rows.length === 0) {
    throw new ApiError(404, 'Session not found');
  }

  const session = sessionResult.rows[0];

  const transcriptResult = await query(
    `SELECT role, content FROM session_messages WHERE session_id = $1 ORDER BY created_at ASC`,
    [sessionId]
  );
  const transcript = transcriptResult.rows;

  // NEW: Fetch schema context if it's an existing DB session
  let schemaContext = "";
  if (session.connection_id) {
    try {
      const pool = await getConnectionPool(session.connection_id, req.user!.userId);
      const schema = await extractSchema(pool, session.connection_id);
      schemaContext = formatSchemaForPrompt(schema);
    } catch (err) {
      console.error("Failed to extract schema for probe context", err);
    }
  }

  // Build conversation context string for AI
  const conversationContext = transcript
    .map((msg: { role: string; content: string }) => `${msg.role === 'user' ? 'User' : 'ATLAS'}: ${msg.content}`)
    .join('\n');

  let aiResponse;
  try {
    aiResponse = await aiClient.post('/design-studio/probe-requirements', {
      user_input: userMessage,
      conversation_context: conversationContext,
      schema_context: schemaContext,
      provider,
      model
    });
  } catch (err: any) {
    if (err.response && err.response.status) {
      throw new ApiError(err.response.status, err.response.data?.detail || err.message);
    }
    throw err;
  }

  const atlasReply: string = aiResponse.data.probes;
  const isReady = atlasReply.includes('READY_TO_GENERATE');
  const cleanReply = atlasReply.replace('READY_TO_GENERATE', '').trim();

  // Append both messages to relational table
  await query('BEGIN');
  await query(
    `INSERT INTO session_messages (session_id, role, content) VALUES ($1, 'user', $2)`,
    [sessionId, userMessage]
  );
  await query(
    `INSERT INTO session_messages (session_id, role, content) VALUES ($1, 'atlas', $2)`,
    [sessionId, cleanReply]
  );
  await query('UPDATE design_studio_sessions SET updated_at = NOW() WHERE id = $1', [sessionId]);
  await query('COMMIT');

  const updatedTranscript = [
    ...transcript,
    { role: 'user', content: userMessage },
    { role: 'atlas', content: cleanReply }
  ];

  return res.json(
    new ApiResponse(200, {
      reply: cleanReply,
      isReadyToGenerate: isReady,
      transcript: updatedTranscript,
    }, 'JARVIS response received')
  );
}));

// ── POST /api/design-studio/generate-schema — Run Step 1 (Schema Generation) ──
router.post('/generate-schema', studioRateLimiter, checkLLMQueryLimit, validateRequest(generateSchemaSchema), asyncHandler(async (req: Request, res: Response) => {
  const { sessionId, provider, model } = req.body;

  const sessionResult = await query(
    `SELECT id FROM design_studio_sessions
     WHERE id = $1 AND user_id = $2 AND mode = 'new'`,
    [sessionId, req.user!.userId]
  );
  if (sessionResult.rows.length === 0) {
    throw new ApiError(404, 'Session not found or not in new-db mode');
  }

  const transcriptResult = await query(
    `SELECT role, content FROM session_messages WHERE session_id = $1 ORDER BY created_at ASC`,
    [sessionId]
  );
  const transcript = transcriptResult.rows
  const conversationTranscript = transcriptResult.rows
    .map((m: { role: string; content: string }) => `${m.role === 'user' ? 'User' : 'ATLAS'}: ${m.content}`)
    .join('\n');

  let aiResponse;
  try {
    aiResponse = await aiClient.post('/design-studio/generate-schema', {
      conversation_transcript: conversationTranscript,
      provider,
      model
    });
  } catch (err: any) {
    if (err.response && err.response.status) {
      throw new ApiError(err.response.status, err.response.data?.detail || err.message);
    }
    throw err;
  }

  const generatedDesign = aiResponse.data.schema;
  const schema = aiResponse.data.schema;

  // Save the generated design
  await query(
    `UPDATE design_studio_sessions
     SET current_design = $1::jsonb, status = 'completed', updated_at = NOW()
     WHERE id = $2`,
    [JSON.stringify(schema), sessionId]
  );

  return res.json(new ApiResponse(200, schema, 'Blueprint generated successfully'));
}));

// ── POST /api/design-studio/deploy — Deploy generated schema to Live DB ──
router.post('/deploy', studioRateLimiter, validateRequest(deploySchema), asyncHandler(async (req: Request, res: Response) => {
  const { sessionId, connectionId } = req.body;

  // 1. Fetch the blueprint
  const sessionResult = await query(
    `SELECT current_design FROM design_studio_sessions 
     WHERE id = $1 AND user_id = $2 AND status = 'completed'`,
    [sessionId, req.user!.userId]
  );

  if (sessionResult.rows.length === 0 || !sessionResult.rows[0].current_design) {
    throw new ApiError(404, 'No generated blueprint found for this session');
  }

  const design = sessionResult.rows[0].current_design;
  const sqlScripts = design.sql_scripts || [];

  if (sqlScripts.length === 0) {
    throw new ApiError(400, 'Blueprint contains no SQL scripts to deploy');
  }

  // 2. Connect to the target DB
  const targetPool = await getConnectionPool(connectionId, req.user!.userId);
  const client = await targetPool.connect();

  let combinedSqlExecuted = "";
  let combinedRollbackSql = "";
  
  try {
    await client.query('BEGIN'); // Start transaction

    // 3. Execute all scripts sequentially
    for (const script of sqlScripts) {
      if (script.sql) {
        // Sanitize: fix known AI-generated SQL issues before executing
        let sanitizedSql = script.sql
          // Fix unquoted extension names containing hyphens (e.g. uuid-ossp → "uuid-ossp")
          .replace(/CREATE EXTENSION\s+IF NOT EXISTS\s+([a-z][a-z0-9_]*(?:-[a-z0-9_]+)+)/gi,
            (_match: string, extName: string) => `CREATE EXTENSION IF NOT EXISTS "${extName}"`)
          // Fix double-escaped newlines from JSON serialization
          .replace(/\\n/g, '\n')
          .replace(/\\t/g, '\t')
          .trim();

        if (sanitizedSql.length > 0) {
          await client.query(sanitizedSql);
          combinedSqlExecuted += `${sanitizedSql}\n\n`;
          
          // Accumulate rollbacks in reverse order (LIFO)
          if (script.rollback_sql && script.rollback_sql.trim().length > 0) {
            combinedRollbackSql = `${script.rollback_sql.trim()}\n\n` + combinedRollbackSql;
          }
        }
      }
    }

    // 4. Log the transaction as a single mutation in ATLAS core DB
    await query(
      `INSERT INTO architect_mutations 
       (user_id, connection_id, title, description, sql_executed, rollback_sql, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'APPLIED')`,
      [
        req.user!.userId,
        connectionId,
        "Deployed AI Blueprint",
        `Created ${design.entities?.length || 0} tables via Architect Studio (Session: ${sessionId})`,
        combinedSqlExecuted.trim(),
        combinedRollbackSql.trim() || null
      ]
    );

    // 5. Update session connection_id and mark as deployed
    await query(
      `UPDATE design_studio_sessions SET connection_id = $1, status = 'deployed' WHERE id = $2`,
      [connectionId, sessionId]
    );

    await client.query('COMMIT'); // Commit transaction
    
    return res.json(new ApiResponse(200, null, 'Blueprint successfully deployed to live database!'));
  } catch (err: any) {
    await client.query('ROLLBACK'); // Rollback everything if any script fails
    console.error("Blueprint deployment failed, rolling back:", err);
    throw new ApiError(500, `Deployment failed at runtime: ${err.message}`);
  } finally {
    client.release();
  }
}));

// ── GET /api/design-studio/mutations — Fetch deployment history ──
router.get('/mutations', asyncHandler(async (req: Request, res: Response) => {
  const { connectionId } = req.query;
  if (!connectionId) {
    throw new ApiError(400, 'connectionId query parameter is required');
  }

  const result = await query(
    `SELECT id, title, description, sql_executed, rollback_sql, created_at, status 
     FROM architect_mutations 
     WHERE user_id = $1 AND connection_id = $2
     ORDER BY created_at DESC`,
    [req.user!.userId, connectionId]
  );

  return res.json(new ApiResponse(200, result.rows, 'Mutations fetched successfully'));
}));

// ── POST /api/design-studio/mutations/:id/rollback — Undo a deployment ──
router.post('/mutations/:id/rollback', studioRateLimiter, asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { connectionId } = req.body;

  if (!connectionId) {
    throw new ApiError(400, 'connectionId is required in the body');
  }

  // 1. Fetch the mutation
  const mutationResult = await query(
    `SELECT * FROM architect_mutations WHERE id = $1 AND user_id = $2`,
    [id, req.user!.userId]
  );

  if (mutationResult.rows.length === 0) {
    throw new ApiError(404, 'Mutation not found');
  }

  const mutation = mutationResult.rows[0];

  if (mutation.status === 'REVERTED') {
    throw new ApiError(400, 'Mutation is already reverted');
  }

  if (!mutation.rollback_sql || mutation.rollback_sql.trim() === '') {
    throw new ApiError(400, 'No rollback SQL exists for this mutation');
  }

  // 2. Connect to the target DB
  const targetPool = await getConnectionPool(connectionId, req.user!.userId);
  const client = await targetPool.connect();

  try {
    await client.query('BEGIN');

    // 3. Execute rollback SQL
    await client.query(mutation.rollback_sql);

    // 4. Mark as REVERTED
    await query(
      `UPDATE architect_mutations SET status = 'REVERTED', updated_at = NOW() WHERE id = $1`,
      [id]
    );

    await client.query('COMMIT');

    return res.json(new ApiResponse(200, null, 'Rollback successful! Database restored.'));
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error("Rollback failed:", err);
    throw new ApiError(500, `Rollback failed at runtime: ${err.message}`);
  } finally {
    client.release();
  }
}));

// ── POST /api/design-studio/audit-existing — Deep Audit Mode ──
router.post('/audit-existing', studioRateLimiter, checkLLMQueryLimit, validateRequest(auditExistingSchema), asyncHandler(async (req: Request, res: Response) => {
  const { sessionId, connectionId, userConcerns, provider, model } = req.body;

  // Pull the live schema from user's database
  const pool = await getConnectionPool(connectionId, req.user!.userId);
  const schema = await extractSchema(pool, connectionId);
  const schemaText = formatSchemaForPrompt(schema);

  let aiResponse;
  try {
    aiResponse = await aiClient.post('/design-studio/audit-senior-level', {
      schema: schemaText,
      user_concerns: userConcerns || '',
      provider,
      model
    });
  } catch (err: any) {
    if (err.response && err.response.status) {
      throw new ApiError(err.response.status, err.response.data?.detail || err.message);
    }
    throw err;
  }

  const auditResult = aiResponse.data.audit;

  // 1. Persist audit result in active design studio session if provided
  if (sessionId) {
    await query(
      `UPDATE design_studio_sessions
       SET current_design = $1::jsonb, status = 'completed', updated_at = NOW()
       WHERE id = $2 AND user_id = $3`,
      [JSON.stringify(auditResult), sessionId, req.user!.userId]
    );
  }

  // 2. Persist audit result in architect_audits (general history) to keep score and history updated
  await query(
    `INSERT INTO architect_audits 
      (user_id, connection_id, scale, requirements, review_data, scalability_score)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      req.user!.userId,
      connectionId,
      '1M rows',
      userConcerns || 'Studio Audit',
      JSON.stringify(auditResult),
      auditResult.health_score || 70
    ]
  );

  // 3. Persist suggested missions — deduplicated by (user_id, connection_id, title)
  const improvements = auditResult.improvements || auditResult.issues || [];
  if (improvements.length > 0) {
    for (const imp of improvements) {
      await query(
        `INSERT INTO architect_missions 
          (user_id, connection_id, title, description, priority, ai_reasoning, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'PLANNED')
         ON CONFLICT (user_id, connection_id, title) DO NOTHING`,
        [
          req.user!.userId,
          connectionId,
          imp.title,
          imp.detail || imp.description || 'Audit recommendation',
          imp.priority || imp.severity || 'MEDIUM',
          imp.detail || 'Suggested by A-to-Z audit'
        ]
      );
    }
  }

  return res.json(new ApiResponse(200, auditResult, 'A-to-Z audit completed'));
}));

// ── DELETE /api/design-studio/sessions/:id — Hard delete a session ──
router.delete('/sessions/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const parseResult = z.string().uuid("Invalid session ID format").safeParse(id);
  if (!parseResult.success) {
    throw new ApiError(400, parseResult.error.issues[0].message);
  }

  const result = await query(
    `DELETE FROM design_studio_sessions 
     WHERE id = $1 AND user_id = $2`,
    [id, req.user!.userId]
  );
  if (result.rowCount === 0) {
    throw new ApiError(404, 'Session not found');
  }
  return res.json(new ApiResponse(200, null, 'Session deleted successfully'));
}));

// ── DELETE /api/design-studio/schema-cache — Manual Cache Invalidation ──
router.delete('/schema-cache', asyncHandler(async (req: Request, res: Response) => {
  const { connectionId } = req.query;
  if (!connectionId) {
    throw new ApiError(400, 'connectionId is required');
  }

  const { getRedisStatus, redisClient } = require('../config/redis');
  
  if (getRedisStatus()) {
    const cacheKey = `schema:cache:${connectionId}`;
    await redisClient.del(cacheKey);
  }

  return res.json(new ApiResponse(200, null, 'Schema cache successfully invalidated'));
}));

export default router;
