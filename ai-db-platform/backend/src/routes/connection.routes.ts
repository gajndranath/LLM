import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  createConnection,
  listConnections,
  deleteConnection,
  testConnection,
  getConnectionPool,
} from '../services/connection.service';
import { extractSchema } from '../services/schema.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';

const router = Router();

// All connection routes require authentication
router.use(authenticate);

// POST /api/connections
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const { name, host, port, databaseName, username, password, sslEnabled } = req.body;
  
  const connection = await createConnection(req.user!.userId, {
    name, host, port, databaseName, username, password, sslEnabled,
  });
  
  return res.status(201).json(
    new ApiResponse(201, connection, "Connection created successfully")
  );
}));

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
  const schema = await extractSchema(pool);
  
  return res.status(200).json(
    new ApiResponse(200, schema, "Schema extracted successfully")
  );
}));

// DELETE /api/connections/:id
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  await deleteConnection(req.params.id, req.user!.userId);
  
  return res.status(200).json(
    new ApiResponse(200, null, "Connection deleted successfully")
  );
}));

export default router;
