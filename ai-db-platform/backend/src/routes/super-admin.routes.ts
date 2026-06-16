import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import {
  getPlatformStats,
  listOrganizations,
  getOrganizationDetail,
  getQueryAnalytics,
  getTopOrganizations,
  updateOrgPlan,
  toggleOrgStatus,
  getRecentSignups,
} from '../services/super-admin.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { validateRequest } from '../middleware/validation.middleware';
import { io } from '../index';

const router = Router();

// ALL routes require SUPER_ADMIN role
router.use(authenticate);
router.use(requireRole('SUPER_ADMIN'));

// ── GET /api/super-admin/stats ─────────────────────────────
router.get('/stats', asyncHandler(async (_req: Request, res: Response) => {
  const stats = await getPlatformStats();
  return res.status(200).json(new ApiResponse(200, stats, 'Platform stats fetched'));
}));

// ── GET /api/super-admin/analytics/queries ─────────────────
router.get('/analytics/queries', asyncHandler(async (req: Request, res: Response) => {
  const days = Math.min(Math.max(parseInt(req.query.days as string) || 30, 1), 90);
  const data = await getQueryAnalytics(days);
  return res.status(200).json(new ApiResponse(200, data, 'Query analytics fetched'));
}));

// ── GET /api/super-admin/analytics/top-orgs ────────────────
router.get('/analytics/top-orgs', asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 5, 1), 20);
  const data = await getTopOrganizations(limit);
  return res.status(200).json(new ApiResponse(200, data, 'Top organizations fetched'));
}));

// ── GET /api/super-admin/analytics/recent-signups ──────────
router.get('/analytics/recent-signups', asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 10, 1), 50);
  const data = await getRecentSignups(limit);
  return res.status(200).json(new ApiResponse(200, data, 'Recent signups fetched'));
}));

// ── GET /api/super-admin/analytics/finance ──────────
router.get('/analytics/finance', asyncHandler(async (req: Request, res: Response) => {
  const { getFinancialAnalytics } = await import('../services/super-admin.service');
  const data = await getFinancialAnalytics();
  return res.status(200).json(new ApiResponse(200, data, 'Financial analytics fetched'));
}));

// ── GET /api/super-admin/transactions ──────────
router.get('/transactions', asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(parseInt(req.query.page as string) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 20, 1), 100);
  const { getTransactionsList } = await import('../services/super-admin.service');
  const data = await getTransactionsList(page, limit);
  return res.status(200).json(new ApiResponse(200, data, 'Transactions fetched'));
}));

// ── GET /api/super-admin/analytics/unpaid ──────────
router.get('/analytics/unpaid', asyncHandler(async (req: Request, res: Response) => {
  const { getUnpaidOrgs } = await import('../services/super-admin.service');
  const data = await getUnpaidOrgs();
  return res.status(200).json(new ApiResponse(200, data, 'Unpaid orgs fetched'));
}));

// ── POST /api/super-admin/remind-unpaid ──────────
router.post('/remind-unpaid', asyncHandler(async (req: Request, res: Response) => {
  const { orgId } = req.body;
  if (!orgId) throw new ApiError(400, 'Organization ID is required');
  
  const { getUnpaidOrgs } = await import('../services/super-admin.service');
  const { sendEmail } = await import('../services/email.service');
  
  const unpaidOrgs = await getUnpaidOrgs();
  const org = unpaidOrgs.find(o => o.id === orgId);
  
  if (!org) throw new ApiError(404, 'Organization not found in unpaid list');
  if (!org.admin_email) throw new ApiError(400, 'Organization has no admin email to notify');
  
  await sendEmail({
    to: org.admin_email,
    subject: 'Complete Your Upgrade - AI Database Platform',
    html: `
      <h2>Hello ${org.admin_name || 'Admin'},</h2>
      <p>We noticed you attempted to upgrade to the <strong>${org.attempted_plan.toUpperCase()}</strong> plan recently, but the transaction was not completed.</p>
      <p>Click <a href="${process.env.FRONTEND_URL}/billing">here</a> to complete your payment and unlock enterprise features.</p>
      <br/><p>Thanks,<br/>Platform Team</p>
    `
  });
  
  return res.status(200).json(new ApiResponse(200, null, 'Reminder email sent successfully'));
}));

// ── GET /api/super-admin/organizations ─────────────────────
router.get('/organizations', asyncHandler(async (req: Request, res: Response) => {
  const page   = Math.max(parseInt(req.query.page as string) || 1, 1);
  const limit  = Math.min(Math.max(parseInt(req.query.limit as string) || 20, 1), 100);
  const search = req.query.search as string | undefined;
  const plan   = req.query.plan as string | undefined;

  const data = await listOrganizations(page, limit, search, plan);
  return res.status(200).json(new ApiResponse(200, data, 'Organizations fetched'));
}));

// ── GET /api/super-admin/organizations/:id ─────────────────
router.get('/organizations/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!z.string().uuid().safeParse(id).success) {
    throw new ApiError(400, 'Invalid organization ID format');
  }
  const data = await getOrganizationDetail(id);
  return res.status(200).json(new ApiResponse(200, data, 'Organization detail fetched'));
}));

// ── PUT /api/super-admin/organizations/:id/plan ────────────
const updatePlanSchema = z.object({
  plan: z.string().min(1),
});

router.put(
  '/organizations/:id/plan',
  validateRequest(updatePlanSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!z.string().uuid().safeParse(id).success) throw new ApiError(400, 'Invalid organization ID');

    await updateOrgPlan(id, req.body.plan, req.user!.userId);
    return res.status(200).json(new ApiResponse(200, null, `Plan updated to ${req.body.plan}`));
  })
);

// ── PUT /api/super-admin/organizations/:id/status ──────────
const updateStatusSchema = z.object({
  isActive: z.boolean(),
});

router.put(
  '/organizations/:id/status',
  validateRequest(updateStatusSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!z.string().uuid().safeParse(id).success) throw new ApiError(400, 'Invalid organization ID');

    await toggleOrgStatus(id, req.body.isActive, req.user!.userId);
    return res.status(200).json(new ApiResponse(200, null, `Organization ${req.body.isActive ? 'activated' : 'deactivated'}`));
  })
);

// ── PLAN MANAGEMENT (CRUD) ───────────────────────────────────

router.get('/plans', asyncHandler(async (req: Request, res: Response) => {
  const { dbQuery: query } = await import('../config/database');
  const result = await query('SELECT * FROM subscription_plans ORDER BY price_cents ASC');
  return res.status(200).json(new ApiResponse(200, result.rows, 'Plans fetched'));
}));

const createPlanSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  price_cents: z.number().int().min(0),
  currency: z.string().default('INR'),
  max_connections: z.number().int().min(1),
  max_staff: z.number().int().min(1),
  max_queries_per_day: z.number().int().min(1),
  features: z.array(z.string()),
  is_custom: z.boolean().default(false),
});

router.post(
  '/plans',
  validateRequest(createPlanSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { code, name, description, price_cents, currency, max_connections, max_staff, max_queries_per_day, features, is_custom } = req.body;
    
    // We import query directly here for simplicity since it's a super admin route
    const { dbQuery: query } = await import('../config/database');
    
    const result = await query(
      `INSERT INTO subscription_plans 
       (code, name, description, price_cents, currency, max_connections, max_staff, max_queries_per_day, features, is_custom)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [code, name, description, price_cents, currency, max_connections, max_staff, max_queries_per_day, JSON.stringify(features), is_custom]
    );

    return res.status(201).json(new ApiResponse(201, result.rows[0], 'Plan created successfully'));
  })
);

router.put(
  '/plans/:id',
  validateRequest(createPlanSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { code, name, description, price_cents, currency, max_connections, max_staff, max_queries_per_day, features, is_custom } = req.body;
    
    const { dbQuery: query } = await import('../config/database');
    const result = await query(
      `UPDATE subscription_plans 
       SET code=$1, name=$2, description=$3, price_cents=$4, currency=$5, max_connections=$6, max_staff=$7, max_queries_per_day=$8, features=$9, is_custom=$10
       WHERE id = $11 RETURNING *`,
      [code, name, description, price_cents, currency, max_connections, max_staff, max_queries_per_day, JSON.stringify(features), is_custom, id]
    );

    if (result.rows.length === 0) throw new ApiError(404, 'Plan not found');
    return res.status(200).json(new ApiResponse(200, result.rows[0], 'Plan updated successfully'));
  })
);

router.patch(
  '/plans/:id/toggle',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { dbQuery: query } = await import('../config/database');
    
    const result = await query(
      `UPDATE subscription_plans SET is_active = NOT is_active WHERE id = $1 RETURNING is_active`,
      [id]
    );

    if (result.rows.length === 0) throw new ApiError(404, 'Plan not found');
    const status = result.rows[0].is_active ? 'activated' : 'deactivated';
    return res.status(200).json(new ApiResponse(200, null, `Plan ${status} successfully`));
  })
);

// ── SYSTEM MAINTENANCE ─────────────────────────────────────────

router.get('/maintenance', asyncHandler(async (req: Request, res: Response) => {
  const { getRedisStatus, redisClient } = await import('../config/redis');
  let isMaintenance = false;
  if (getRedisStatus()) {
    const status = await redisClient.get('system:maintenance_mode');
    isMaintenance = status === 'true';
  }
  return res.status(200).json(new ApiResponse(200, { isMaintenance }, 'Maintenance status fetched'));
}));

router.post('/maintenance/toggle', asyncHandler(async (req: Request, res: Response) => {
  const { getRedisStatus, redisClient } = await import('../config/redis');
  if (!getRedisStatus()) throw new ApiError(500, 'Redis is not connected. Cannot toggle maintenance mode.');
  
  const currentStatus = await redisClient.get('system:maintenance_mode');
  const newStatus = currentStatus === 'true' ? 'false' : 'true';
  await redisClient.set('system:maintenance_mode', newStatus);

  // Broadcast maintenance state change to ALL connected clients in real-time
  io.emit('maintenance_toggle', { isMaintenance: newStatus === 'true' });
  
  return res.status(200).json(new ApiResponse(200, { isMaintenance: newStatus === 'true' }, `Maintenance mode turned ${newStatus === 'true' ? 'ON' : 'OFF'}`));
}));

export default router;
