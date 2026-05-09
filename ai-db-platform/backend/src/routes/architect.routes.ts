import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireMinRole } from '../middleware/rbac.middleware';
import { getConnectionPool } from '../services/connection.service';
import { extractSchema, formatSchemaForPrompt } from '../services/schema.service';
import { analyzeArchitecture } from '../services/architect.service';
import { dbQuery as query } from '../config/database';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';

const router = Router();
router.use(authenticate);

// POST /api/architect/review — Deep audit of connected DB
router.post('/review', requireMinRole('ANALYST'), asyncHandler(async (req: Request, res: Response) => {
  const { connectionId, requirements, scale } = req.body;
  
  if (!connectionId) {
    return res.status(400).json(new ApiResponse(400, null, "Connection ID is required"));
  }

  const pool = await getConnectionPool(connectionId, req.user!.userId);
  const schema = await extractSchema(pool);
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

  // NEW: Save Jarvis Missions (Proactive Tasks)
  if (review.suggested_missions && review.suggested_missions.length > 0) {
    for (const mission of review.suggested_missions) {
      await query(
        `INSERT INTO architect_missions 
          (user_id, connection_id, title, description, priority, ai_reasoning, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'PLANNED')
         ON CONFLICT DO NOTHING`, // Simple deduplication by title (if we added a unique constraint later)
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
    queryText += ` AND a.connection_id = $2`;
    params.push(connectionId);
  }

  queryText += ` ORDER BY a.created_at DESC LIMIT 50`;

  const result = await query(queryText, params);

  return res.status(200).json(
    new ApiResponse(200, result.rows, "Audit history fetched")
  );
}));

export default router;
