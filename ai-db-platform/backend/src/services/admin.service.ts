import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { pool, dbQuery as query } from '../config/database';
import { ApiError } from '../utils/ApiError';
import { sendEmail } from './email.service';
import { env } from '../config/env';
import { UserRole } from '../types/auth.types';

const INVITE_EXPIRY_HOURS = 72;
const SALT_ROUNDS = 12;

// ── Create Staff Invite ────────────────────────────────────
export const createStaffInvite = async (
  adminUserId: string,
  orgId: string,
  email: string,
  role: UserRole,
  name?: string
): Promise<{ message: string }> => {
  // Validate role — admins cannot create other ADMINs or SUPER_ADMINs
  const allowedRoles: UserRole[] = ['ANALYST', 'VIEWER', 'DISPATCHER', 'DRIVER'];
  if (!allowedRoles.includes(role)) {
    throw new ApiError(400, `Cannot invite with role "${role}". Allowed: ${allowedRoles.join(', ')}`);
  }

  // Check if user is already a member of any org
  const existingUser = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
  if (existingUser.rows.length > 0) {
    throw new ApiError(409, 'A user with this email already has an account on Atlas');
  }

  // Check for existing pending invite to same org
  const existingInvite = await query(
    `SELECT id FROM staff_invites
     WHERE organization_id = $1 AND email = $2 AND accepted_at IS NULL AND expires_at > NOW()`,
    [orgId, email.toLowerCase()]
  );
  if (existingInvite.rows.length > 0) {
    throw new ApiError(409, 'A pending invite already exists for this email. Please wait or cancel the existing invite.');
  }

  // Get org name for the email
  const orgResult = await query('SELECT name FROM organizations WHERE id = $1', [orgId]);
  if (orgResult.rows.length === 0) throw new ApiError(404, 'Organization not found');
  const orgName = orgResult.rows[0].name;

  // Generate secure token
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_HOURS * 60 * 60 * 1000);

  await query(
    `INSERT INTO staff_invites (organization_id, invited_by, email, name, role, token_hash, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [orgId, adminUserId, email.toLowerCase(), name || null, role, tokenHash, expiresAt]
  );

  // Send invite email
  const inviteLink = `${env.FRONTEND_URL}/invite/${rawToken}`;
  const textContent = `You've been invited! 🎉\n\nYou've been invited to join ${orgName} on Atlas AI as a ${role}.\n${name ? `We've reserved this spot for ${name}.\n` : ''}\nAccept your invitation here: ${inviteLink}\n\nThis invitation expires in ${INVITE_EXPIRY_HOURS} hours. If you did not expect this, you can safely ignore this email.`;

  await sendEmail({
    to: email,
    subject: `You're invited to join ${orgName} on Atlas AI`,
    text: textContent,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f172a; color: #e2e8f0; padding: 40px; border-radius: 16px; max-width: 560px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="font-size: 28px; font-weight: 800; background: linear-gradient(135deg, #60a5fa, #34d399); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin: 0;">Atlas AI</h1>
          <p style="color: #64748b; font-size: 12px; margin: 4px 0 0;">Enterprise Database Intelligence</p>
        </div>
        <h2 style="font-size: 22px; font-weight: 700; color: #f1f5f9; margin-bottom: 12px;">You've been invited! 🎉</h2>
        <p style="color: #94a3b8; line-height: 1.7; margin-bottom: 24px;">
          You've been invited to join <strong style="color: #f1f5f9;">${orgName}</strong> on Atlas AI as a <strong style="color: #60a5fa;">${role}</strong>.
          ${name ? `<br/>We've reserved this spot for <strong style="color: #f1f5f9;">${name}</strong>.` : ''}
        </p>
        <div style="background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <p style="color: #64748b; font-size: 12px; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.05em;">Your Role</p>
          <p style="color: #60a5fa; font-size: 18px; font-weight: 700; margin: 0;">${role}</p>
        </div>
        <a href="${inviteLink}" style="display: block; text-align: center; background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; font-weight: 700; padding: 16px 24px; border-radius: 12px; text-decoration: none; font-size: 16px; margin-bottom: 20px;">Accept Invitation →</a>
        <p style="color: #475569; font-size: 12px; text-align: center; margin: 0;">This invitation expires in ${INVITE_EXPIRY_HOURS} hours. If you did not expect this, you can safely ignore this email.</p>
      </div>
    `,
  });

  console.log(`[AUDIT] Staff invite sent: org=${orgId}, email=${email}, role=${role}, invited_by=${adminUserId}`);
  return { message: `Invite sent to ${email}` };
};

// ── List Staff in Organization ─────────────────────────────
export const listStaff = async (orgId: string) => {
  const result = await query(
    `SELECT
       u.id, u.name, u.email, u.role, u.is_active, u.last_login_at, u.created_at,
       creator.name AS invited_by_name
     FROM users u
     LEFT JOIN users creator ON creator.id = u.created_by
     WHERE u.organization_id = $1
       AND u.role != 'ADMIN'
     ORDER BY u.created_at DESC`,
    [orgId]
  );

  const pendingInvites = await query(
    `SELECT id, email, name, role, expires_at, created_at
     FROM staff_invites
     WHERE organization_id = $1 AND accepted_at IS NULL AND expires_at > NOW()
     ORDER BY created_at DESC`,
    [orgId]
  );

  return {
    staff: result.rows,
    pendingInvites: pendingInvites.rows,
  };
};

// ── Update Staff Role ──────────────────────────────────────
export const updateStaffRole = async (
  orgId: string,
  targetUserId: string,
  newRole: UserRole
): Promise<void> => {
  const allowedRoles: UserRole[] = ['ANALYST', 'VIEWER', 'DISPATCHER', 'DRIVER'];
  if (!allowedRoles.includes(newRole)) {
    throw new ApiError(400, `Cannot assign role "${newRole}"`);
  }

  const result = await query(
    `UPDATE users SET role = $1
     WHERE id = $2 AND organization_id = $3 AND role != 'ADMIN'
     RETURNING id`,
    [newRole, targetUserId, orgId]
  );

  if (result.rowCount === 0) {
    throw new ApiError(404, 'Staff member not found in your organization');
  }
};

// ── Toggle Staff Status ────────────────────────────────────
export const toggleStaffStatus = async (
  orgId: string,
  targetUserId: string,
  isActive: boolean
): Promise<void> => {
  const result = await query(
    `UPDATE users SET is_active = $1
     WHERE id = $2 AND organization_id = $3 AND role != 'ADMIN'
     RETURNING id`,
    [isActive, targetUserId, orgId]
  );
  if (result.rowCount === 0) {
    throw new ApiError(404, 'Staff member not found in your organization');
  }
};

// ── Remove Staff ───────────────────────────────────────────
export const removeStaff = async (
  orgId: string,
  targetUserId: string
): Promise<void> => {
  const result = await query(
    `DELETE FROM users
     WHERE id = $1 AND organization_id = $2 AND role != 'ADMIN' AND role != 'SUPER_ADMIN'
     RETURNING id`,
    [targetUserId, orgId]
  );
  if (result.rowCount === 0) {
    throw new ApiError(404, 'Staff member not found or cannot be removed');
  }
};

// ── Cancel Pending Invite ──────────────────────────────────
export const cancelInvite = async (orgId: string, inviteId: string): Promise<void> => {
  const result = await query(
    'DELETE FROM staff_invites WHERE id = $1 AND organization_id = $2 AND accepted_at IS NULL',
    [inviteId, orgId]
  );
  if (result.rowCount === 0) {
    throw new ApiError(404, 'Invite not found or already accepted');
  }
};

// ── Resend Pending Invite ──────────────────────────────────
export const resendInvite = async (orgId: string, inviteId: string): Promise<{ message: string }> => {
  const inviteResult = await query(
    'SELECT email, role, name FROM staff_invites WHERE id = $1 AND organization_id = $2 AND accepted_at IS NULL',
    [inviteId, orgId]
  );
  if (inviteResult.rows.length === 0) {
    throw new ApiError(404, 'Invite not found or already accepted');
  }
  const { email, role, name } = inviteResult.rows[0];

  const orgResult = await query('SELECT name FROM organizations WHERE id = $1', [orgId]);
  const orgName = orgResult.rows[0].name;

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_HOURS * 60 * 60 * 1000);

  await query(
    'UPDATE staff_invites SET token_hash = $1, expires_at = $2 WHERE id = $3',
    [tokenHash, expiresAt, inviteId]
  );

  const inviteLink = `${env.FRONTEND_URL}/invite/${rawToken}`;
  const textContent = `You've been invited! 🎉\n\nYou've been invited to join ${orgName} on Atlas AI as a ${role}.\n${name ? `We've reserved this spot for ${name}.\n` : ''}\nAccept your invitation here: ${inviteLink}\n\nThis invitation expires in ${INVITE_EXPIRY_HOURS} hours. If you did not expect this, you can safely ignore this email.`;

  await sendEmail({
    to: email,
    subject: `Reminder: You're invited to join ${orgName} on Atlas AI`,
    text: textContent,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f172a; color: #e2e8f0; padding: 40px; border-radius: 16px; max-width: 560px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="font-size: 28px; font-weight: 800; background: linear-gradient(135deg, #60a5fa, #34d399); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin: 0;">Atlas AI</h1>
          <p style="color: #64748b; font-size: 12px; margin: 4px 0 0;">Enterprise Database Intelligence</p>
        </div>
        <h2 style="font-size: 22px; font-weight: 700; color: #f1f5f9; margin-bottom: 12px;">Reminder: You've been invited! 🎉</h2>
        <p style="color: #94a3b8; line-height: 1.7; margin-bottom: 24px;">
          You've been invited to join <strong style="color: #f1f5f9;">${orgName}</strong> on Atlas AI as a <strong style="color: #60a5fa;">${role}</strong>.
          ${name ? `<br/>We've reserved this spot for <strong style="color: #f1f5f9;">${name}</strong>.` : ''}
        </p>
        <div style="background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <p style="color: #64748b; font-size: 12px; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.05em;">Your Role</p>
          <p style="color: #60a5fa; font-size: 18px; font-weight: 700; margin: 0;">${role}</p>
        </div>
        <a href="${inviteLink}" style="display: block; text-align: center; background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; font-weight: 700; padding: 16px 24px; border-radius: 12px; text-decoration: none; font-size: 16px; margin-bottom: 20px;">Accept Invitation →</a>
        <p style="color: #475569; font-size: 12px; text-align: center; margin: 0;">This invitation expires in ${INVITE_EXPIRY_HOURS} hours. If you did not expect this, you can safely ignore this email.</p>
      </div>
    `,
  });

  return { message: 'Invite resent successfully' };
};

// ── Get Organization Billing Info ──────────────────────────
export const getOrgBilling = async (orgId: string) => {
  const orgResult = await query(
    `SELECT o.id, o.name, o.plan, o.plan_status, o.created_at,
       (SELECT COUNT(*) FROM users u WHERE u.organization_id = o.id) AS total_members,
       (SELECT COUNT(*) FROM users u WHERE u.organization_id = o.id AND u.is_active = true) AS active_members
     FROM organizations o
     WHERE o.id = $1`,
    [orgId]
  );
  if (orgResult.rows.length === 0) throw new ApiError(404, 'Organization not found');

  const org = orgResult.rows[0];

  const planDetails = await query(
    `SELECT name, description, price_cents, currency, max_connections, max_staff, max_queries_per_day, features
     FROM subscription_plans
     WHERE code = $1`,
    [org.plan]
  );

  const subscriptions = await query(
    `SELECT plan, payment_provider, amount_cents, currency, status, started_at, ended_at
     FROM plan_subscriptions
     WHERE organization_id = $1
     ORDER BY started_at DESC
     LIMIT 1`,
    [orgId]
  );

  const transactions = await query(
    `SELECT id, provider, provider_order_id, amount_cents, currency, status, signature_verified, plan_code, created_at
     FROM payment_transactions
     WHERE organization_id = $1
     ORDER BY created_at DESC
     LIMIT 20`,
    [orgId]
  );

  let nextBillingDate = null;
  if (subscriptions.rows.length > 0 && org.plan !== 'free') {
    const startedAt = new Date(subscriptions.rows[0].started_at);
    startedAt.setDate(startedAt.getDate() + 30);
    nextBillingDate = startedAt;
  }

  return {
    organization: org,
    planDetails: planDetails.rows[0],
    currentSubscription: subscriptions.rows[0] || null,
    nextBillingDate,
    transactions: transactions.rows,
  };
};

// ── Validate + Accept Invite (Public) ─────────────────────
export const getInviteByToken = async (rawToken: string) => {
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const result = await query(
    `SELECT si.id, si.email, si.name, si.role, si.expires_at, si.accepted_at,
       o.name AS organization_name, o.id AS organization_id
     FROM staff_invites si
     JOIN organizations o ON o.id = si.organization_id
     WHERE si.token_hash = $1`,
    [tokenHash]
  );
  if (result.rows.length === 0) throw new ApiError(404, 'Invalid or expired invite link');

  const invite = result.rows[0];
  if (invite.accepted_at) throw new ApiError(400, 'This invite has already been accepted');
  if (new Date(invite.expires_at) < new Date()) throw new ApiError(400, 'This invite has expired');

  return invite;
};

export const acceptInvite = async (
  rawToken: string,
  name: string,
  password: string
): Promise<void> => {
  const invite = await getInviteByToken(rawToken);

  if (!name || name.trim().length < 2) throw new ApiError(400, 'Name must be at least 2 characters');
  if (password.length < 8 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    throw new ApiError(400, 'Password must be at least 8 chars with uppercase, lowercase, and number');
  }

  // Check if email is already registered
  const existing = await query('SELECT id FROM users WHERE email = $1', [invite.email]);
  if (existing.rows.length > 0) throw new ApiError(409, 'An account with this email already exists');

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Find the invite's invited_by user for created_by tracking
    const inviteRow = await client.query(
      'SELECT invited_by FROM staff_invites WHERE token_hash = $1 FOR UPDATE',
      [tokenHash]
    );

    if (inviteRow.rows.length === 0) {
      throw new ApiError(404, 'Invite not found or expired');
    }

    await client.query(
      `INSERT INTO users (name, email, password_hash, role, organization_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [name.trim(), invite.email, passwordHash, invite.role, invite.organization_id, inviteRow.rows[0]?.invited_by || null]
    );

    await client.query('UPDATE staff_invites SET accepted_at = NOW() WHERE token_hash = $1', [tokenHash]);
    
    await client.query('COMMIT');
    console.log(`[AUDIT] Staff invite accepted: email=${invite.email}, role=${invite.role}, org=${invite.organization_id}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
