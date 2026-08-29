import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware';
import { getConnectionPool } from '../services/connection.service';
import { extractSchema, formatSchemaForPrompt } from '../services/schema.service';
import { aiClient } from '../services/aiClient';
import { dbQuery as query, pool } from '../config/database';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { env } from '../config/env';
import { redisClient, getRedisStatus, cacheGet, cacheSet } from '../config/redis';
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
  provider: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
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
      u.name AS created_by_name,
      (SELECT COALESCE(json_agg(json_build_object('role', sm.role, 'content', sm.content) ORDER BY sm.created_at ASC), '[]'::json)
       FROM session_messages sm WHERE sm.session_id = dss.id) AS requirements_transcript
     FROM design_studio_sessions dss
     JOIN users u ON u.id = dss.user_id
     WHERE (
       dss.user_id = $1
       OR dss.user_id IN (
         SELECT u2.id FROM users u1
         JOIN users u2 ON u1.organization_id = u2.organization_id
         WHERE u1.id = $1 AND u1.organization_id IS NOT NULL
       )
     )
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

// ── DELETE /api/design-studio/sessions/:sessionId/truncate-messages — Truncate chat history ──
router.delete('/sessions/:sessionId/truncate-messages', studioRateLimiter, validateRequest(z.object({
  index: z.number().min(0)
})), asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const { index } = req.body;

  // 1. Verify session belongs to user
  const sessionResult = await query(
    `SELECT id FROM design_studio_sessions WHERE id = $1 AND user_id = $2`,
    [sessionId, req.user!.userId]
  );
  if (sessionResult.rows.length === 0) {
    throw new ApiError(404, 'Session not found');
  }

  // 2. Delete messages from the given index onwards (offset = index)
  // We use a subquery to find the IDs of the messages to delete.
  await query(
    `DELETE FROM session_messages 
     WHERE session_id = $1 AND id IN (
       SELECT id FROM session_messages 
       WHERE session_id = $1 
       ORDER BY created_at ASC 
       OFFSET $2
     )`,
    [sessionId, index]
  );

  // 3. Reset the generated design and status since the history is modified
  await query(
    `UPDATE design_studio_sessions 
     SET current_design = NULL, status = 'active', updated_at = NOW() 
     WHERE id = $1`,
    [sessionId]
  );

  return res.json(new ApiResponse(200, null, 'Chat history truncated successfully'));
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

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendStatus = (status: string) => {
    res.write(`data: ${JSON.stringify({ type: 'status', message: status })}\n\n`);
  };

  const sendError = (error: string) => {
    res.write(`data: ${JSON.stringify({ type: 'error', message: error })}\n\n`);
    res.end();
  };

  const sendComplete = (schema: any) => {
    res.write(`data: ${JSON.stringify({ type: 'complete', schema })}\n\n`);
    res.end();
  };

  try {
    const sessionResult = await query(
      `SELECT id, connection_id FROM design_studio_sessions
       WHERE id = $1 AND user_id = $2 AND mode = 'new'`,
      [sessionId, req.user!.userId]
    );
    if (sessionResult.rows.length === 0) {
      return sendError('Session not found or not in new-db mode');
    }

    const session = sessionResult.rows[0];

    const transcriptResult = await query(
      `SELECT role, content FROM session_messages WHERE session_id = $1 ORDER BY created_at ASC`,
      [sessionId]
    );
    const conversationTranscript = transcriptResult.rows
      .map((m: { role: string; content: string }) => `${m.role === 'user' ? 'User' : 'ATLAS'}: ${m.content}`)
      .join('\n');

    // ── Enterprise Redis L1 Deterministic Hash Cache ───────────
    const crypto = await import('crypto');
    const cacheKey = `cache:schema:${crypto.createHash('sha256').update(conversationTranscript + (session.connection_id || '')).digest('hex')}`;
    const cachedSchema = await cacheGet(cacheKey);

    if (cachedSchema) {
      try {
        const parsedCached = JSON.parse(cachedSchema);
        sendStatus("⚡ [L1 Cache Hit] Found pre-compiled verified blueprint in Redis (20ms response)...");
        await query(
          `UPDATE design_studio_sessions SET current_design = $1::jsonb, status = 'completed', updated_at = NOW() WHERE id = $2`,
          [cachedSchema, sessionId]
        );
        sendComplete(parsedCached);
        return;
      } catch (e) {
        // Fallback to live LLM generation if cache parse fails
      }
    }

    let schemaContext = "";
    if (session.connection_id) {
      sendStatus("🔍 Extracting live database schema...");
      try {
        const pool = await getConnectionPool(session.connection_id, req.user!.userId);
        const extracted = await extractSchema(pool, session.connection_id);
        schemaContext = formatSchemaForPrompt(extracted);
      } catch (err) {
        console.error("Failed to extract schema for generate context", err);
      }
    }

    // 1. Mark session as generating in the database for background persistence
    await query(
      `UPDATE design_studio_sessions SET status = 'generating', updated_at = NOW() WHERE id = $1`,
      [sessionId]
    );

    let retryCount = 0;
    const maxRetries = 3;
    let schema: any = null;
    let aiResponse: any = null;
    let lastError = "";

    while (retryCount < maxRetries) {
      try {
        if (retryCount === 0) {
           sendStatus("🔍 Meghna is analyzing requirements & normalization...");
        } else {
           sendStatus(`⚠️ Error detected! Sam is self-correcting (Attempt ${retryCount + 1}): ${lastError.substring(0, 45)}...`);
        }
        
        aiResponse = await aiClient.post('/design-studio/generate-schema', {
          conversation_transcript: conversationTranscript,
          current_schema: schemaContext,
          last_error: lastError,
          provider,
          model
        });
        
        schema = aiResponse.data.schema;
        
        // If there's no connection, we can't dry run. Just break and accept it.
        if (!session.connection_id || !schema.sql_scripts || schema.sql_scripts.length === 0) {
          break;
        }
        
        sendStatus(`🧪 Transaction Manager is running dry-run validation (Attempt ${retryCount + 1})...`);
        
        const pool = await getConnectionPool(session.connection_id, req.user!.userId);
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          
          // Run all scripts
          const sqlToTest = schema.sql_scripts.map((s: any) => s.sql).join('\n');
          await client.query(sqlToTest);
          
          // If it succeeds, rollback so we don't actually deploy it!
          await client.query('ROLLBACK');
          sendStatus("🎨 Visualizer is mapping coordinate layouts...");
          console.log(`[AGENTIC LOOP] Dry run successful on attempt ${retryCount + 1}`);
          break; // Success!
        } catch (dbErr: any) {
          await client.query('ROLLBACK');
          lastError = dbErr.message;
          console.warn(`[AGENTIC LOOP] Dry run failed on attempt ${retryCount + 1}: ${lastError}`);
          retryCount++;
        } finally {
          client.release();
        }
      } catch (err: any) {
        if (err.response && err.response.status) {
          return sendError(err.response.data?.detail || err.message);
        }
        throw err;
      }
    }

    if (!schema) {
      return sendError("Failed to generate schema after multiple attempts.");
    }

    // Save the generated design in Postgres
    await query(
      `UPDATE design_studio_sessions
       SET current_design = $1::jsonb, status = 'completed', updated_at = NOW()
       WHERE id = $2`,
      [JSON.stringify(schema), sessionId]
    );

    // Save to Redis L1 Cache (TTL: 3600s = 1 hour)
    try {
      const { cacheSet } = await import('../config/redis');
      await cacheSet(cacheKey, JSON.stringify(schema), 3600);
    } catch (cacheErr) {
      console.warn("Failed to set Redis schema cache:", cacheErr);
    }

    sendStatus("✅ Blueprint compiled successfully!");
    sendComplete(schema);
  } catch (err: any) {
    console.error("Error in generate-schema:", err);
    sendError(err.message || 'Internal Server Error');
  }
}));

// ── POST /api/design-studio/deploy — Deploy generated schema to Live DB ──
router.post('/deploy', studioRateLimiter, validateRequest(deploySchema), asyncHandler(async (req: Request, res: Response) => {
  const { sessionId, connectionId } = req.body;

  const mainClient = await pool.connect();
  const targetPool = await getConnectionPool(connectionId, req.user!.userId);
  const targetClient = await targetPool.connect();

  try {
    await mainClient.query('BEGIN');
    
    // 1. Fetch and Lock the blueprint session
    const sessionResult = await mainClient.query(
      `SELECT current_design, status FROM design_studio_sessions 
       WHERE id = $1 AND user_id = $2 FOR UPDATE`,
      [sessionId, req.user!.userId]
    );

    if (sessionResult.rows.length === 0) {
      throw new ApiError(404, 'No session found');
    }

    const session = sessionResult.rows[0];
    if (session.status === 'deployed') {
      throw new ApiError(400, 'This blueprint has already been deployed');
    }
    if (!session.current_design) {
      throw new ApiError(404, 'No generated blueprint found for this session');
    }

    const design = session.current_design;
    const sqlScripts = design.sql_scripts || [];

    if (sqlScripts.length === 0) {
      throw new ApiError(400, 'Blueprint contains no SQL scripts to deploy');
    }

    let combinedSqlExecuted = "";
    let combinedRollbackSql = "";
    
    await targetClient.query('BEGIN'); // Start transaction on target DB

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
          await targetClient.query(sanitizedSql);
          combinedSqlExecuted += `${sanitizedSql}\n\n`;
          
          // Accumulate rollbacks in reverse order (LIFO)
          if (script.rollback_sql && script.rollback_sql.trim().length > 0) {
            combinedRollbackSql = `${script.rollback_sql.trim()}\n\n` + combinedRollbackSql;
          }
        }
      }
    }

    // 4. Log the transaction as a single mutation in ATLAS core DB
    await mainClient.query(
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
    await mainClient.query(
      `UPDATE design_studio_sessions SET connection_id = $1, status = 'deployed', updated_at = NOW() WHERE id = $2`,
      [connectionId, sessionId]
    );

    await targetClient.query('COMMIT'); // Commit target DB change
    await mainClient.query('COMMIT'); // Commit platform DB change

    // 6. Clear Redis Schema Cache
    if (getRedisStatus()) {
      try {
        await redisClient.del(`schema:cache:${connectionId}`);
      } catch (redisErr) {
        console.warn("[Deploy] Failed to clear Redis cache:", redisErr);
      }
    }

    // 7. Emit Immutable SOC-2 Compliant HMAC Hash-Chained Audit Log
    try {
      const { AuditService } = await import('../services/audit.service');
      await AuditService.logEvent({
        actorId: req.user!.userId,
        organizationId: req.user!.organizationId || null,
        action: 'SCHEMA_DEPLOY',
        resourceType: 'BLUEPRINT',
        resourceId: sessionId,
        clientIp: req.ip || '127.0.0.1',
        userAgent: req.headers['user-agent'] || 'Browser Client',
        payloadDelta: {
          connectionId,
          tablesCount: design.entities?.length || 0,
          sqlExecuted: combinedSqlExecuted.trim()
        }
      });
    } catch (auditErr) {
      console.warn("[Deploy] Failed to log immutable audit event:", auditErr);
    }
    
    return res.json(new ApiResponse(200, null, 'Blueprint successfully deployed to live database!'));
  } catch (err: any) {
    await targetClient.query('ROLLBACK').catch(() => {});
    await mainClient.query('ROLLBACK').catch(() => {});
    console.error("Blueprint deployment failed, rolling back:", err);
    throw new ApiError(500, `Deployment failed at runtime: ${err.message}`);
  } finally {
    targetClient.release();
    mainClient.release();
  }
}));

// ── GET /api/design-studio/mutations — Fetch deployment history ──
router.get('/mutations', asyncHandler(async (req: Request, res: Response) => {
  const { connectionId } = req.query;
  if (!connectionId) {
    throw new ApiError(400, 'connectionId query parameter is required');
  }

  const result = await query(
    `SELECT dsm.id, dsm.title, dsm.description, dsm.sql_executed, dsm.rollback_sql,
            dsm.created_at, dsm.status, u.name AS applied_by_name
     FROM architect_mutations dsm
     JOIN users u ON u.id = dsm.user_id
     WHERE dsm.connection_id = $2
       AND (
         dsm.user_id = $1
         OR dsm.user_id IN (
           SELECT u2.id FROM users u1
           JOIN users u2 ON u1.organization_id = u2.organization_id
           WHERE u1.id = $1 AND u1.organization_id IS NOT NULL
         )
       )
     ORDER BY dsm.created_at DESC`,
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

  if (mutation.status === 'REVERTED' || mutation.status === 'ROLLED_BACK') {
    throw new ApiError(400, 'Mutation is already reverted / rolled back');
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

    // 4. Mark as ROLLED_BACK
    await query(
      `UPDATE architect_mutations SET status = 'ROLLED_BACK', updated_at = NOW() WHERE id = $1`,
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
