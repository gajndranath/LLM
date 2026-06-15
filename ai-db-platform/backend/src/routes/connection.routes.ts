import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware';
import {
  createConnection,
  listConnections,
  deleteConnection,
  testConnection,
  getConnectionPool,
  updateConnection,
} from '../services/connection.service';
import { extractSchema } from '../services/schema.service';
import { validateRequest } from '../middleware/validation.middleware';
import { checkConnectionLimit } from '../middleware/plan.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';

const router = Router();

// All connection routes require authentication
router.use(authenticate);

const connectionSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  host: z.string().min(1, "Host is required"),
  port: z.number().int().min(1).max(65535).optional(),
  databaseName: z.string().min(1, "Database name is required"),
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  sslEnabled: z.boolean().optional(),
});

// ── Create Connection ──────────────────────────────────────
router.post(
  '/',
  validateRequest(connectionSchema),
  checkConnectionLimit,
  asyncHandler(async (req: Request, res: Response) => {
    const { name, host, port, databaseName, username, password, sslEnabled } = req.body;
    
    const connection = await createConnection(req.user!.userId, {
      name, host, port, databaseName, username, password, sslEnabled,
    });
    
    console.log(`[AUDIT] User ${req.user!.userId} created db_connection ${connection.id} (${connection.name})`);

    return res.status(201).json(
      new ApiResponse(201, connection, "Connection created successfully")
    );
  })
);
// GET /api/connections
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const connections = await listConnections(req.user!.userId);
  
  return res.status(200).json(
    new ApiResponse(200, connections, "Connections fetched successfully")
  );
}));

// GET /api/connections/:id/test
router.get('/:id/test', asyncHandler(async (req: Request, res: Response) => {
  const result = await testConnection(req.params.id, req.user!.userId);
  
  return res.status(200).json(
    new ApiResponse(200, result, result.success ? "Test successful" : "Test failed")
  );
}));

// GET /api/connections/:id/schema
router.get('/:id/schema', asyncHandler(async (req: Request, res: Response) => {
  const pool = await getConnectionPool(req.params.id, req.user!.userId);
  const schema = await extractSchema(pool, true);
  
  return res.status(200).json(
    new ApiResponse(200, schema, "Schema extracted successfully")
  );
}));

// PUT /api/connections/:id
router.put(
  '/:id',
  validateRequest(connectionSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { name, host, port, databaseName, username, password, sslEnabled } = req.body;
    
    const connection = await updateConnection(req.params.id, req.user!.userId, {
      name, host, port, databaseName, username, password, sslEnabled,
    });
    
    console.log(`[AUDIT] User ${req.user!.userId} updated db_connection ${connection.id} (${connection.name})`);

    return res.status(200).json(
      new ApiResponse(200, connection, "Connection updated successfully")
    );
  })
);

// DELETE /api/connections/:id
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  await deleteConnection(req.params.id, req.user!.userId);
  
  console.log(`[AUDIT] User ${req.user!.userId} deleted db_connection ${req.params.id}`);

  return res.status(200).json(
    new ApiResponse(200, null, "Connection deleted successfully")
  );
}));

export default router;
