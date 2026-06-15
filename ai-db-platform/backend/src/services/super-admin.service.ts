import { dbQuery as query } from '../config/database';
import { ApiError } from '../utils/ApiError';

// ── Platform-Wide Stats ────────────────────────────────────
export const getPlatformStats = async () => {
  const [orgs, users, queries, plans] = await Promise.all([
    query(`
      SELECT
        COUNT(*) FILTER (WHERE is_active = true)  AS total_active,
        COUNT(*) FILTER (WHERE is_active = false) AS total_inactive,
        COUNT(*) AS total_all,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') AS new_this_month,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days')  AS new_this_week
      FROM organizations
    `),
    query(`
      SELECT
        COUNT(*) AS total_users,
        COUNT(*) FILTER (WHERE role = 'ADMIN')       AS total_admins,
        COUNT(*) FILTER (WHERE role != 'ADMIN' AND role != 'SUPER_ADMIN') AS total_staff,
        COUNT(*) FILTER (WHERE is_active = true)     AS active_users,
        COUNT(*) FILTER (WHERE last_login_at > NOW() - INTERVAL '7 days') AS active_last_7d
      FROM users
      WHERE role != 'SUPER_ADMIN'
    `),
    query(`
      SELECT
        COUNT(*) AS total_queries,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') AS queries_today,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days')   AS queries_this_week,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days')  AS queries_this_month
      FROM query_history
    `),
    query(`
      SELECT plan, COUNT(*) AS count
      FROM organizations
      WHERE is_active = true
      GROUP BY plan
    `),
  ]);

  const planBreakdown: Record<string, number> = {};
  plans.rows.forEach((r: any) => { planBreakdown[r.plan] = parseInt(r.count); });

  return {
    organizations: orgs.rows[0],
    users: users.rows[0],
    queries: queries.rows[0],
    planBreakdown,
  };
};

// ── List All Organizations ─────────────────────────────────
export const listOrganizations = async (
  page = 1,
  limit = 20,
  search?: string,
  plan?: string
) => {
  const offset = (page - 1) * limit;
  const params: any[] = [];
  let whereClause = 'WHERE 1=1';

  if (search) {
    params.push(`%${search}%`);
    whereClause += ` AND (o.name ILIKE $${params.length} OR owner.email ILIKE $${params.length})`;
  }
  if (plan && ['free', 'pro', 'mega'].includes(plan)) {
    params.push(plan);
    whereClause += ` AND o.plan = $${params.length}`;
  }

  const countResult = await query(
    `SELECT COUNT(*) AS total FROM organizations o LEFT JOIN users owner ON owner.id = o.owner_id ${whereClause}`,
    params
  );

  params.push(limit, offset);
  const result = await query(
    `SELECT
       o.id, o.name, o.slug, o.plan, o.plan_status, o.is_active, o.created_at,
       owner.name  AS admin_name,
       owner.email AS admin_email,
       (SELECT COUNT(*) FROM users u WHERE u.organization_id = o.id) AS member_count,
       (SELECT COUNT(*) FROM query_history qh JOIN users u ON u.id = qh.user_id WHERE u.organization_id = o.id) AS query_count,
       (SELECT MAX(qh.created_at) FROM query_history qh JOIN users u ON u.id = qh.user_id WHERE u.organization_id = o.id) AS last_active_at
     FROM organizations o
     LEFT JOIN users owner ON owner.id = o.owner_id
     ${whereClause}
     ORDER BY o.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return {
    organizations: result.rows,
    total: parseInt(countResult.rows[0].total),
    page,
    limit,
    totalPages: Math.ceil(parseInt(countResult.rows[0].total) / limit),
  };
};

// ── Get Single Organization Detail ─────────────────────────
export const getOrganizationDetail = async (orgId: string) => {
  const orgResult = await query(
    `SELECT o.*, owner.name AS admin_name, owner.email AS admin_email
     FROM organizations o
     LEFT JOIN users owner ON owner.id = o.owner_id
     WHERE o.id = $1`,
    [orgId]
  );
  if (orgResult.rows.length === 0) throw new ApiError(404, 'Organization not found');

  const [members, recentQueries, planHistory] = await Promise.all([
    query(
      `SELECT id, name, email, role, is_active, last_login_at, created_at
       FROM users WHERE organization_id = $1 ORDER BY created_at DESC`,
      [orgId]
    ),
    query(
      `SELECT qh.natural_query, qh.generated_sql, qh.execution_ms, qh.had_error, qh.created_at,
         u.name AS user_name, u.email AS user_email
       FROM query_history qh
       JOIN users u ON u.id = qh.user_id
       WHERE u.organization_id = $1
       ORDER BY qh.created_at DESC
       LIMIT 20`,
      [orgId]
    ),
    query(
      `SELECT plan, payment_provider, amount_cents, currency, status, started_at, ended_at
       FROM plan_subscriptions WHERE organization_id = $1 ORDER BY started_at DESC`,
      [orgId]
    ),
  ]);

  return {
    organization: orgResult.rows[0],
    members: members.rows,
    recentQueries: recentQueries.rows,
    planHistory: planHistory.rows,
  };
};

// ── Query Volume Over Time (for chart) ─────────────────────
export const getQueryAnalytics = async (days = 30) => {
  const result = await query(
    `SELECT
       DATE(created_at) AS date,
       COUNT(*) AS query_count,
       COUNT(*) FILTER (WHERE had_error = true) AS error_count
     FROM query_history
     WHERE created_at > NOW() - INTERVAL '${days} days'
     GROUP BY DATE(created_at)
     ORDER BY date ASC`,
    []
  );
  return result.rows;
};

// ── Top Organizations by Activity ──────────────────────────
export const getTopOrganizations = async (limit = 5) => {
  const result = await query(
    `SELECT
       o.id, o.name, o.plan,
       COUNT(qh.id) AS query_count
     FROM organizations o
     LEFT JOIN users u ON u.organization_id = o.id
     LEFT JOIN query_history qh ON qh.user_id = u.id
       AND qh.created_at > NOW() - INTERVAL '30 days'
     WHERE o.is_active = true
     GROUP BY o.id, o.name, o.plan
     ORDER BY query_count DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
};

// ── Update Organization Plan (Manual override) ─────────────
export const updateOrgPlan = async (
  orgId: string,
  plan: 'free' | 'pro' | 'mega',
  changedBy: string
): Promise<void> => {
  const result = await query(
    `UPDATE organizations SET plan = $1, plan_status = 'active', updated_at = NOW()
     WHERE id = $2 RETURNING id`,
    [plan, orgId]
  );
  if (result.rowCount === 0) throw new ApiError(404, 'Organization not found');

  await query(
    `INSERT INTO plan_subscriptions (organization_id, plan, payment_provider, status)
     VALUES ($1, $2, 'manual', 'active')`,
    [orgId, plan]
  );

  console.log(`[AUDIT] SUPER_ADMIN ${changedBy} manually changed plan for org ${orgId} to ${plan}`);
};

// ── Toggle Organization Status ─────────────────────────────
export const toggleOrgStatus = async (
  orgId: string,
  isActive: boolean,
  changedBy: string
): Promise<void> => {
  const result = await query(
    `UPDATE organizations SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING id`,
    [isActive, orgId]
  );
  if (result.rowCount === 0) throw new ApiError(404, 'Organization not found');
  console.log(`[AUDIT] SUPER_ADMIN ${changedBy} set org ${orgId} isActive=${isActive}`);
};

// ── Get Recent Signups ─────────────────────────────────────
export const getRecentSignups = async (limit = 10) => {
  const result = await query(
    `SELECT o.id, o.name, o.plan, o.created_at,
       owner.email AS admin_email
     FROM organizations o
     LEFT JOIN users owner ON owner.id = o.owner_id
     ORDER BY o.created_at DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
};

// ── Financial Analytics & Fraud Detection ──────────────────
export const getFinancialAnalytics = async () => {
  const [revenue, statusCounts, fraudFlags] = await Promise.all([
    query(`SELECT SUM(amount_cents) as total_cents FROM payment_transactions WHERE status = 'captured'`),
    query(`SELECT status, COUNT(*) as count FROM payment_transactions GROUP BY status`),
    query(`SELECT COUNT(*) as fraud_count FROM payment_transactions WHERE status = 'captured' AND signature_verified = false`)
  ]);

  const statusMap: Record<string, number> = {};
  statusCounts.rows.forEach(r => { statusMap[r.status] = parseInt(r.count); });

  return {
    totalRevenueCents: parseInt(revenue.rows[0].total_cents) || 0,
    successfulTransactions: statusMap['captured'] || 0,
    failedTransactions: statusMap['failed'] || 0,
    pendingTransactions: statusMap['pending'] || 0,
    fraudAttemptsBlocked: parseInt(fraudFlags.rows[0].fraud_count) || 0,
  };
};

export const getTransactionsList = async (page = 1, limit = 20) => {
  const offset = (page - 1) * limit;
  const countResult = await query(`SELECT COUNT(*) AS total FROM payment_transactions`);
  const result = await query(
    `SELECT t.id, t.provider, t.provider_order_id, t.amount_cents, t.currency, t.status, t.signature_verified, t.plan_code, t.created_at,
            o.name as org_name, owner.email as org_email
     FROM payment_transactions t
     JOIN organizations o ON o.id = t.organization_id
     LEFT JOIN users owner ON owner.id = o.owner_id
     ORDER BY t.created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  
  return {
    transactions: result.rows,
    total: parseInt(countResult.rows[0].total),
    page,
    limit,
    totalPages: Math.ceil(parseInt(countResult.rows[0].total) / limit),
  };
};

export const getUnpaidOrgs = async () => {
  // Get orgs with 'pending' transactions but NO 'captured' transactions recently
  const result = await query(`
    SELECT DISTINCT ON (o.id)
      o.id, o.name, o.plan as current_plan, owner.name as admin_name, owner.email as admin_email,
      t.created_at as attempt_date, t.plan_code as attempted_plan, t.amount_cents
    FROM payment_transactions t
    JOIN organizations o ON o.id = t.organization_id
    LEFT JOIN users owner ON owner.id = o.owner_id
    WHERE t.status = 'pending'
      AND NOT EXISTS (
        SELECT 1 FROM payment_transactions t2 
        WHERE t2.organization_id = t.organization_id AND t2.status = 'captured' AND t2.created_at > t.created_at
      )
    ORDER BY o.id, t.created_at DESC
  `);
  return result.rows;
};
