import { Request, Response, NextFunction } from 'express';
import { dbQuery as query } from '../config/database';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';

const getOrgPlanLimits = async (orgId: string) => {
  // First, find the organization's plan code
  const orgResult = await query('SELECT plan FROM organizations WHERE id = $1', [orgId]);
  if (orgResult.rows.length === 0) throw new ApiError(404, 'Organization not found');
  
  const planCode = orgResult.rows[0].plan || 'free';
  
  // Then fetch the limits from subscription_plans
  const planResult = await query(
    'SELECT max_connections, max_staff, max_queries_per_day FROM subscription_plans WHERE code = $1 AND is_active = true',
    [planCode]
  );
  
  // Fallback to strict free tier limits if plan is not found or inactive
  if (planResult.rows.length === 0) {
    return { planCode, maxConnections: 1, maxStaff: 2, maxQueriesPerDay: 50 };
  }

  const row = planResult.rows[0];
  return {
    planCode,
    maxConnections: row.max_connections,
    maxStaff: row.max_staff,
    maxQueriesPerDay: row.max_queries_per_day
  };
};

export const checkConnectionLimit = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const orgId = req.user?.organizationId;
  if (!orgId) throw new ApiError(403, 'No organization associated with this account');
  
  const limits = await getOrgPlanLimits(orgId);

  const currentCount = await query(
    `SELECT COUNT(*) as count 
     FROM db_connections c 
     JOIN users u ON c.user_id = u.id 
     WHERE u.organization_id = $1 AND c.is_active = true`,
    [orgId]
  );

  if (parseInt(currentCount.rows[0].count) >= limits.maxConnections) {
    throw new ApiError(403, `Plan Limit Exceeded: ${limits.planCode.toUpperCase()} plan allows a maximum of ${limits.maxConnections} connections.`);
  }
  
  next();
});

export const checkStaffLimit = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const orgId = req.user?.organizationId;
  if (!orgId) throw new ApiError(403, 'No organization associated with this account');
  
  const limits = await getOrgPlanLimits(orgId);

  const currentCount = await query(
    `SELECT COUNT(*) as count FROM users WHERE organization_id = $1 AND is_active = true`,
    [orgId]
  );

  if (parseInt(currentCount.rows[0].count) >= limits.maxStaff) {
    throw new ApiError(403, `Plan Limit Exceeded: ${limits.planCode.toUpperCase()} plan allows a maximum of ${limits.maxStaff} staff members.`);
  }

  next();
});

export const checkLLMQueryLimit = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const orgId = req.user?.organizationId;
  if (!orgId) throw new ApiError(403, 'No organization associated with this account');
  
  const limits = await getOrgPlanLimits(orgId);

  // Count queries across all AI surfaces to prevent loopholes
  const todayCount = await query(
    `SELECT (
      (SELECT COUNT(*) FROM query_history q JOIN users u ON q.user_id = u.id WHERE u.organization_id = $1 AND q.created_at >= CURRENT_DATE) +
      (SELECT COUNT(*) FROM architect_audits a JOIN users u ON a.user_id = u.id WHERE u.organization_id = $1 AND a.created_at >= CURRENT_DATE) +
      (SELECT COUNT(*) FROM design_studio_sessions s JOIN users u ON s.user_id = u.id WHERE u.organization_id = $1 AND s.updated_at >= CURRENT_DATE)
    ) as count`,
    [orgId]
  );

  if (parseInt(todayCount.rows[0].count) >= limits.maxQueriesPerDay) {
    throw new ApiError(429, `Plan Limit Exceeded: ${limits.planCode.toUpperCase()} plan allows a maximum of ${limits.maxQueriesPerDay} AI queries/operations per day.`);
  }

  next();
});
