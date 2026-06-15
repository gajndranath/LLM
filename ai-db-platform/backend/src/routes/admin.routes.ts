import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import {
  createStaffInvite,
  listStaff,
  updateStaffRole,
  toggleStaffStatus,
  removeStaff,
  cancelInvite,
  getOrgBilling,
  getInviteByToken,
  acceptInvite,
} from '../services/admin.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { validateRequest } from '../middleware/validation.middleware';
import { createRateLimiter } from '../middleware/rateLimit.middleware';
import { checkStaffLimit } from '../middleware/plan.middleware';

const router = Router();

const adminRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Too many admin requests. Please slow down.',
  prefix: 'admin',
});

// ── Schemas ───────────────────────────────────────────────
const inviteSchema = z.object({
  email: z.string().email('Invalid email format'),
  role: z.enum(['ANALYST', 'VIEWER', 'DISPATCHER', 'DRIVER']),
  name: z.string().min(2).max(100).optional(),
});

const updateRoleSchema = z.object({
  role: z.enum(['ANALYST', 'VIEWER', 'DISPATCHER', 'DRIVER']),
});

const toggleStatusSchema = z.object({
  isActive: z.boolean(),
});

const acceptInviteSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-z]/, 'Must contain a lowercase letter')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
});

// ── Admin Protected Routes (ADMIN or SUPER_ADMIN) ─────────

// POST /api/admin/staff/invite
router.post(
  '/staff/invite',
  authenticate,
  requireRole('ADMIN', 'SUPER_ADMIN'),
  checkStaffLimit,
  adminRateLimiter,
  validateRequest(inviteSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const orgId = req.user!.organizationId;
    if (!orgId) throw new ApiError(403, 'No organization associated with your account');

    const { email, role, name } = req.body;
    const result = await createStaffInvite(req.user!.userId, orgId, email, role, name);

    console.log(`[AUDIT] Admin ${req.user!.userId} invited staff: ${email} as ${role}`);
    return res.status(200).json(new ApiResponse(200, result, 'Invite sent successfully'));
  })
);

// GET /api/admin/staff
router.get(
  '/staff',
  authenticate,
  requireRole('ADMIN', 'SUPER_ADMIN'),
  asyncHandler(async (req: Request, res: Response) => {
    const orgId = req.user!.organizationId;
    if (!orgId) throw new ApiError(403, 'No organization associated with your account');

    const data = await listStaff(orgId);
    return res.status(200).json(new ApiResponse(200, data, 'Staff list fetched'));
  })
);

// PUT /api/admin/staff/:id/role
router.put(
  '/staff/:id/role',
  authenticate,
  requireRole('ADMIN', 'SUPER_ADMIN'),
  validateRequest(updateRoleSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const orgId = req.user!.organizationId;
    if (!orgId) throw new ApiError(403, 'No organization associated with your account');

    const { id } = req.params;
    if (!z.string().uuid().safeParse(id).success) throw new ApiError(400, 'Invalid staff ID');

    await updateStaffRole(orgId, id, req.body.role);
    console.log(`[AUDIT] Admin ${req.user!.userId} changed staff ${id} role to ${req.body.role}`);
    return res.status(200).json(new ApiResponse(200, null, 'Role updated successfully'));
  })
);

// PUT /api/admin/staff/:id/status
router.put(
  '/staff/:id/status',
  authenticate,
  requireRole('ADMIN', 'SUPER_ADMIN'),
  validateRequest(toggleStatusSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const orgId = req.user!.organizationId;
    if (!orgId) throw new ApiError(403, 'No organization associated with your account');

    const { id } = req.params;
    if (!z.string().uuid().safeParse(id).success) throw new ApiError(400, 'Invalid staff ID');

    await toggleStaffStatus(orgId, id, req.body.isActive);
    console.log(`[AUDIT] Admin ${req.user!.userId} set staff ${id} active=${req.body.isActive}`);
    return res.status(200).json(new ApiResponse(200, null, `Staff member ${req.body.isActive ? 'activated' : 'deactivated'}`));
  })
);

// DELETE /api/admin/staff/:id
router.delete(
  '/staff/:id',
  authenticate,
  requireRole('ADMIN', 'SUPER_ADMIN'),
  asyncHandler(async (req: Request, res: Response) => {
    const orgId = req.user!.organizationId;
    if (!orgId) throw new ApiError(403, 'No organization associated with your account');

    const { id } = req.params;
    if (!z.string().uuid().safeParse(id).success) throw new ApiError(400, 'Invalid staff ID');

    await removeStaff(orgId, id);
    console.log(`[AUDIT] Admin ${req.user!.userId} removed staff ${id}`);
    return res.status(200).json(new ApiResponse(200, null, 'Staff member removed'));
  })
);

// DELETE /api/admin/invites/:id
router.delete(
  '/invites/:id',
  authenticate,
  requireRole('ADMIN', 'SUPER_ADMIN'),
  asyncHandler(async (req: Request, res: Response) => {
    const orgId = req.user!.organizationId;
    if (!orgId) throw new ApiError(403, 'No organization associated with your account');

    const { id } = req.params;
    if (!z.string().uuid().safeParse(id).success) throw new ApiError(400, 'Invalid invite ID');

    await cancelInvite(orgId, id);
    return res.status(200).json(new ApiResponse(200, null, 'Invite cancelled'));
  })
);

// POST /api/admin/invites/:id/resend
router.post(
  '/invites/:id/resend',
  authenticate,
  requireRole('ADMIN', 'SUPER_ADMIN'),
  asyncHandler(async (req: Request, res: Response) => {
    const orgId = req.user!.organizationId;
    if (!orgId) throw new ApiError(403, 'No organization associated with your account');

    const { id } = req.params;
    if (!z.string().uuid().safeParse(id).success) throw new ApiError(400, 'Invalid invite ID');

    const { resendInvite } = await import('../services/admin.service');
    const result = await resendInvite(orgId, id);
    return res.status(200).json(new ApiResponse(200, null, result.message));
  })
);

// GET /api/admin/billing
router.get(
  '/billing',
  authenticate,
  requireRole('ADMIN', 'SUPER_ADMIN'),
  asyncHandler(async (req: Request, res: Response) => {
    const orgId = req.user!.organizationId;
    if (!orgId) throw new ApiError(403, 'No organization associated with your account');

    const data = await getOrgBilling(orgId);
    return res.status(200).json(new ApiResponse(200, data, 'Billing info fetched'));
  })
);

// ── Public Invite Routes (No Auth Required) ────────────────

// GET /api/admin/invite/:token — Validate invite
router.get(
  '/invite/:token',
  asyncHandler(async (req: Request, res: Response) => {
    const invite = await getInviteByToken(req.params.token);
    return res.status(200).json(new ApiResponse(200, invite, 'Invite valid'));
  })
);

// POST /api/admin/invite/:token/accept — Accept invite + create account
router.post(
  '/invite/:token/accept',
  adminRateLimiter,
  validateRequest(acceptInviteSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { name, password } = req.body;
    await acceptInvite(req.params.token, name, password);
    return res.status(201).json(new ApiResponse(201, null, 'Account created successfully! You can now login.'));
  })
);

export default router;
