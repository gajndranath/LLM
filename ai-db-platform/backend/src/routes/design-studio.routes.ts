import { Router, Request, Response } from 'express';
import axios from 'axios';
import { authenticate } from '../middleware/auth.middleware';
import { getConnectionPool } from '../services/connection.service';
import { extractSchema, formatSchemaForPrompt } from '../services/schema.service';
import { dbQuery as query } from '../config/database';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { env } from '../config/env';

const router = Router();
router.use(authenticate);

// Internal AI client (same pattern as query.service.ts)
const aiClient = axios.create({
  baseURL: env.AI_SERVICE_URL,
  timeout: 90000, // 90s — schema generation can take a while
  headers: {
    'Content-Type': 'application/json',
    'X-Internal-Secret': env.AI_SERVICE_SECRET,
  },
});

// ── GET /api/design-studio/sessions — List all sessions ──────
router.get('/sessions', asyncHandler(async (req: Request, res: Response) => {
  const result = await query(
    `SELECT id, mode, connection_id, status, current_design, requirements_transcript, created_at, updated_at
     FROM design_studio_sessions
     WHERE user_id = $1
     ORDER BY updated_at DESC
     LIMIT 20`,
    [req.user!.userId]
  );
  return res.json(new ApiResponse(200, result.rows, 'Sessions fetched'));
}));

// ── POST /api/design-studio/sessions — Create new session ─────
router.post('/sessions', asyncHandler(async (req: Request, res: Response) => {
  const { mode, connectionId } = req.body;

  if (!mode || !['new', 'existing'].includes(mode)) {
    throw new ApiError(400, "mode must be 'new' or 'existing'");
  }
  if (mode === 'existing' && !connectionId) {
    throw new ApiError(400, 'connectionId is required for existing mode');
  }

  const result = await query(
    `INSERT INTO design_studio_sessions (user_id, mode, connection_id, requirements_transcript, status)
     VALUES ($1, $2, $3, '[]'::jsonb, 'active')
     RETURNING id, mode, connection_id, status, requirements_transcript, created_at`,
    [req.user!.userId, mode, connectionId || null]
  );

  return res.status(201).json(new ApiResponse(201, result.rows[0], 'Session created'));
}));

// ── POST /api/design-studio/probe — AI asks requirements questions ─
router.post('/probe', asyncHandler(async (req: Request, res: Response) => {
  const { sessionId, userMessage } = req.body;

  if (!sessionId || !userMessage) {
    throw new ApiError(400, 'sessionId and userMessage are required');
  }

  // Load session + existing transcript + connection_id
  const sessionResult = await query(
    `SELECT id, requirements_transcript, connection_id FROM design_studio_sessions
     WHERE id = $1 AND user_id = $2 AND status = 'active'`,
    [sessionId, req.user!.userId]
  );
  if (sessionResult.rows.length === 0) {
    throw new ApiError(404, 'Session not found or already completed');
  }

  const session = sessionResult.rows[0];
  const transcript: { role: string; content: string }[] = session.requirements_transcript || [];

  // NEW: Fetch schema context if it's an existing DB session
  let schemaContext = "";
  if (session.connection_id) {
    try {
      const pool = await getConnectionPool(session.connection_id, req.user!.userId);
      const schema = await extractSchema(pool);
      schemaContext = formatSchemaForPrompt(schema);
    } catch (err) {
      console.error("Failed to extract schema for probe context", err);
    }
  }

  // Build conversation context string for AI
  const conversationContext = transcript
    .map((msg: { role: string; content: string }) => `${msg.role === 'user' ? 'User' : 'ATLAS'}: ${msg.content}`)
    .join('\n');

  // Call AI service for probing response
  const aiResponse = await aiClient.post('/design-studio/probe-requirements', {
    user_input: userMessage,
    conversation_context: conversationContext,
    schema_context: schemaContext, // Pass the "Eyes" of the architect
  });

  const atlasReply: string = aiResponse.data.probes;
  const isReady = atlasReply.includes('READY_TO_GENERATE');
  const cleanReply = atlasReply.replace('READY_TO_GENERATE', '').trim();

  // Append both messages to transcript
  const updatedTranscript = [
    ...transcript,
    { role: 'user', content: userMessage },
    { role: 'atlas', content: cleanReply },
  ];

  await query(
    `UPDATE design_studio_sessions
     SET requirements_transcript = $1::jsonb, updated_at = NOW()
     WHERE id = $2`,
    [JSON.stringify(updatedTranscript), sessionId]
  );

  return res.json(
    new ApiResponse(200, {
      reply: cleanReply,
      isReadyToGenerate: isReady,
      transcript: updatedTranscript,
    }, 'JARVIS response received')
  );
}));

// ── POST /api/design-studio/generate-schema — Build full blueprint ─
router.post('/generate-schema', asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.body;

  if (!sessionId) throw new ApiError(400, 'sessionId is required');

  const sessionResult = await query(
    `SELECT id, requirements_transcript FROM design_studio_sessions
     WHERE id = $1 AND user_id = $2 AND mode = 'new'`,
    [sessionId, req.user!.userId]
  );
  if (sessionResult.rows.length === 0) {
    throw new ApiError(404, 'Session not found or not in new-db mode');
  }

  const transcript: { role: string; content: string }[] = sessionResult.rows[0].requirements_transcript || [];
  const conversationTranscript = transcript
    .map((m: { role: string; content: string }) => `${m.role === 'user' ? 'User' : 'ATLAS'}: ${m.content}`)
    .join('\n');

  const aiResponse = await aiClient.post('/design-studio/generate-schema', {
    conversation_transcript: conversationTranscript,
  });

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

// ── POST /api/design-studio/audit-existing — Full A-to-Z audit ──
router.post('/audit-existing', asyncHandler(async (req: Request, res: Response) => {
  const { sessionId, connectionId, userConcerns } = req.body;

  if (!connectionId) throw new ApiError(400, 'connectionId is required');

  // Pull the live schema from user's database
  const pool = await getConnectionPool(connectionId, req.user!.userId);
  const schema = await extractSchema(pool);
  const schemaText = formatSchemaForPrompt(schema);

  // Call the senior audit
  const aiResponse = await aiClient.post('/design-studio/audit-senior-level', {
    schema: schemaText,
    user_concerns: userConcerns || '',
  });

  const auditResult = aiResponse.data.audit;

  // Persist audit result if a session was provided
  if (sessionId) {
    await query(
      `UPDATE design_studio_sessions
       SET current_design = $1::jsonb, status = 'completed', updated_at = NOW()
       WHERE id = $2 AND user_id = $3`,
      [JSON.stringify(auditResult), sessionId, req.user!.userId]
    );
  }

  return res.json(new ApiResponse(200, auditResult, 'A-to-Z audit completed'));
}));

// ── DELETE /api/design-studio/sessions/:id — Archive a session ──
router.delete('/sessions/:id', asyncHandler(async (req: Request, res: Response) => {
  await query(
    `UPDATE design_studio_sessions SET status = 'archived', updated_at = NOW()
     WHERE id = $1 AND user_id = $2`,
    [req.params.id, req.user!.userId]
  );
  return res.json(new ApiResponse(200, null, 'Session archived'));
}));

export default router;
