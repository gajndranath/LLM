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
import { DriftDetectionService } from '../services/drift.service';
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
  dbType: z.enum(['postgres', 'mysql', 'mongodb', 'redis', 'sqlite']).optional().default('postgres'),
});

// ── Create Connection ──────────────────────────────────────
router.post(
  '/',
  validateRequest(connectionSchema),
  checkConnectionLimit,
  asyncHandler(async (req: Request, res: Response) => {
    const { name, host, port, databaseName, username, password, sslEnabled, dbType } = req.body;
    
    const connection = await createConnection(req.user!.userId, {
      name, host, port, databaseName, username, password, sslEnabled, dbType,
    });
    
    console.log(`[AUDIT] User ${req.user!.userId} created db_connection ${connection.id} (${connection.name})`);

    return res.status(201).json(
      new ApiResponse(201, connection, "Connection created successfully")
    );
  })
);
// ── Import Offline Zero-Password DDL Blueprint ─────────────
const importDdlSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  ddlText: z.string().min(1, "DDL SQL text is required"),
});

router.post(
  '/import-ddl',
  validateRequest(importDdlSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { name, ddlText } = req.body;
    const { dbQuery: query } = await import('../config/database');

    // Create an offline DDL connection record with mock/sandbox credentials
    const connectionResult = await query(
      `INSERT INTO db_connections
         (user_id, name, host, port, database_name, username, password_enc, ssl_enabled, last_test_ok)
       VALUES ($1, $2, 'offline-sandbox.local', 5432, 'ddl_blueprint', 'offline_user', 'offline_encrypted_token', false, true)
       ON CONFLICT (user_id, name) DO UPDATE SET updated_at = NOW()
       RETURNING id, user_id, name, host, port, database_name, username, ssl_enabled, is_active, last_tested_at, last_test_ok, created_at`,
      [req.user!.userId, `[DDL] ${name}`]
    );

    const connection = connectionResult.rows[0];

    // Create active design studio session with this DDL preloaded
    await query(
      `INSERT INTO design_studio_sessions (user_id, connection_id, mode, status, current_design)
       VALUES ($1, $2, 'existing', 'completed', $3::jsonb)`,
      [
        req.user!.userId,
        connection.id,
        JSON.stringify({
          source: 'offline_ddl_import',
          raw_ddl: ddlText,
          imported_at: new Date().toISOString()
        })
      ]
    );

    console.log(`[AUDIT] User ${req.user!.userId} imported offline DDL source ${connection.id} (${name})`);

    return res.status(201).json(
      new ApiResponse(201, connection, "Offline DDL blueprint imported successfully into database")
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
  const includeVisuals = req.query.visuals === 'true';
  const schema = await extractSchema(pool, req.params.id, includeVisuals);
  
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

// GET /api/connections/:id/drift-report
router.get('/:id/drift-report', asyncHandler(async (req: Request, res: Response) => {
  const driftReport = await DriftDetectionService.checkConnectionDrift(
    req.params.id,
    req.user!.userId
  );
  
  return res.status(200).json(
    new ApiResponse(200, driftReport, driftReport.hasDrift ? "Schema drift detected" : "Schema is synchronized")
  );
}));

export default router;
