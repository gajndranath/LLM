import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware';
import { dbQuery as query } from '../config/database';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { validateRequest } from '../middleware/validation.middleware';

const router = Router();
router.use(authenticate);

// Zod Validation Schemas
const updateStatusSchema = z.object({
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
});

// GET /api/missions/active — Get current AI missions
router.get('/active', asyncHandler(async (req: Request, res: Response) => {
  const { connectionId } = req.query;
  
  let queryText = `
    SELECT m.*, c.name as connection_name, u.name AS created_by_name
    FROM architect_missions m
    JOIN db_connections c ON m.connection_id = c.id
    JOIN users u ON u.id = m.user_id
    WHERE m.status != 'CANCELLED'
      AND (
        m.user_id = $1
        OR m.user_id IN (
          SELECT u2.id FROM users u1
          JOIN users u2 ON u1.organization_id = u2.organization_id
          WHERE u1.id = $1 AND u1.organization_id IS NOT NULL
        )
      )
  `;
  const params: any[] = [req.user!.userId];

  if (connectionId) {
    const parseResult = z.string().uuid("Invalid connectionId format").safeParse(connectionId);
    if (!parseResult.success) {
      throw new ApiError(400, parseResult.error.issues[0].message);
    }
    queryText += ` AND m.connection_id = $2`;
    params.push(connectionId);
  }

  queryText += ` ORDER BY 
    CASE priority 
    WHEN 'CRITICAL' THEN 1 
      WHEN 'HIGH' THEN 2 
      WHEN 'MEDIUM' THEN 3 
      ELSE 4 
    END, created_at DESC`;

  const result = await query(queryText, params);

  return res.status(200).json(
    new ApiResponse(200, result.rows, "Active missions fetched")
  );
}));

// PATCH /api/missions/:id/status — Update mission status
router.patch('/:id/status', validateRequest(updateStatusSchema), asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.body;
  const { id } = req.params;

  const parseResult = z.string().uuid("Invalid mission ID format").safeParse(id);
  if (!parseResult.success) {
    throw new ApiError(400, parseResult.error.issues[0].message);
  }

  await query(
    `UPDATE architect_missions SET status = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3`,
    [status, id, req.user!.userId]
  );

  return res.status(200).json(
    new ApiResponse(200, null, "Mission status updated")
  );
}));

export default router;
