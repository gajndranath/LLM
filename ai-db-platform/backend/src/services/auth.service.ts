import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { dbQuery as query } from '../config/database';
import { env } from '../config/env';
import { JwtPayload, UserRole, RegisterInput, RegisterOrgInput, LoginInput, AuthResult } from '../types/auth.types';
import { ApiError } from '../utils/ApiError';
import { validateEmail, validatePassword } from '../utils/validators';
import { sendEmail, sendOTPEmail } from './email.service';
import { redisClient, getRedisStatus } from '../config/redis';

const SALT_ROUNDS = 12;

// In-memory fallback trackers for lockout when Redis is disconnected
const memoryAttempts = new Map<string, { count: number; expiresAt: number }>();
const memoryLockouts = new Map<string, number>();



/**
 * 1. Request OTP for Registration
 */
export const requestOTP = async (email: string) => {
  if (!validateEmail(email)) {
    throw new ApiError(400, "Invalid email format");
  }

  // Generate 6-digit OTP using cryptographically secure random number
  const otp = crypto.randomInt(100000, 1000000).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  // Store OTP (Prefer Redis, fallback to Postgres)
  if (getRedisStatus()) {
    try {
      await redisClient.setEx(`otp:${email}`, 300, otp);
    } catch (err) {
      console.warn("Failed to save OTP to Redis, falling back to Postgres:", err);
      await query(
        'INSERT INTO verification_otps (email, otp, expires_at) VALUES ($1, $2, $3)',
        [email, otp, expiresAt]
      );
    }
  } else {
    console.warn("Redis is offline, writing OTP directly to Postgres");
    await query(
      'INSERT INTO verification_otps (email, otp, expires_at) VALUES ($1, $2, $3)',
      [email, otp, expiresAt]
    );
  }

  // Dispatch Email as Asynchronous Background Worker Task (Non-Blocking HTTP Response)
  setImmediate(() => {
    sendOTPEmail(email, otp).catch(err => {
      console.error(`[BACKGROUND_WORKER] Failed to send OTP email to ${email}:`, err.message);
    });
  });

  return { message: "OTP sent to your email" };
};

/**
 * 2. Verify OTP and Complete Registration
 */
export const register = async (input: RegisterInput): Promise<AuthResult> => {
  const { name, email, password, otp } = input;
  const role = 'ANALYST';

  // 1. Validate Input
  if (!name || name.trim().length < 2) {
    throw new ApiError(400, "Name must be at least 2 characters long");
  }
  if (!validatePassword(password)) {
    throw new ApiError(400, "Password is too weak");
  }

  // 2. Verify OTP
  let isValid = false;
  if (getRedisStatus()) {
    try {
      const storedOtp = await redisClient.get(`otp:${email}`);
      if (storedOtp === otp) {
        isValid = true;
      }
    } catch (err) {
      console.warn("Redis OTP fetch failed, checking Postgres fallback:", err);
    }
  } else {
    console.warn("Redis is offline, looking up OTP in Postgres");
  }

  if (!isValid) {
    const result = await query(
      'SELECT id FROM verification_otps WHERE email = $1 AND otp = $2 AND expires_at > NOW()',
      [email, otp]
    );
    if (result.rows.length > 0) {
      isValid = true;
    }
  }

  if (!isValid) {
    throw new ApiError(400, "Invalid or expired OTP");
  }

  // 3. Check duplicate email
  const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
  if (existing.rows.length > 0) {
    throw new ApiError(409, 'User with this email already registered');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const result = await query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, role`,
    [name, email.toLowerCase(), passwordHash, role]
  );

  const user = result.rows[0];
  
  // Cleanup OTP
  if (getRedisStatus()) {
    try {
      await redisClient.del(`otp:${email}`);
    } catch (err) {
      console.warn("Failed to delete OTP from Redis:", err);
    }
  }
  await query('DELETE FROM verification_otps WHERE email = $1', [email]);

  console.log(`[AUDIT] User registered: ${user.id} (${user.email}) with role: ${user.role}`);
  return generateAuthResult(user);
};

// ── Login ──────────────────────────────────────────────────
export const login = async (input: LoginInput): Promise<AuthResult> => {
  const { email, password } = input;
  const emailKey = email.toLowerCase();
  const lockoutKey = `lockout:${emailKey}`;
  const attemptsKey = `login_attempts:${emailKey}`;

  // Check if account is currently locked out
  if (getRedisStatus()) {
    try {
      const isLocked = await redisClient.get(lockoutKey);
      if (isLocked) {
        throw new ApiError(429, 'Account is temporarily locked due to consecutive failed login attempts. Please try again in 15 minutes.');
      }
    } catch (err: any) {
      if (err instanceof ApiError) throw err;
    }
  } else {
    const lockExpiry = memoryLockouts.get(emailKey);
    if (lockExpiry && lockExpiry > Date.now()) {
      throw new ApiError(429, 'Account is temporarily locked due to consecutive failed login attempts. Please try again in 15 minutes.');
    }
  }

  const recordFailedAttempt = async () => {
    if (getRedisStatus()) {
      try {
        const attempts = await redisClient.incr(attemptsKey);
        if (attempts === 1) {
          await redisClient.expire(attemptsKey, 900);
        }
        if (attempts >= 5) {
          await redisClient.setEx(lockoutKey, 900, 'locked');
          await redisClient.del(attemptsKey);
          throw new ApiError(429, 'Account is temporarily locked due to consecutive failed login attempts. Please try again in 15 minutes.');
        }
      } catch (err: any) {
        if (err instanceof ApiError) throw err;
      }
    } else {
      const record = memoryAttempts.get(emailKey) || { count: 0, expiresAt: Date.now() + 900000 };
      if (record.expiresAt < Date.now()) {
        record.count = 0;
        record.expiresAt = Date.now() + 900000;
      }
      record.count += 1;
      memoryAttempts.set(emailKey, record);
      if (record.count >= 5) {
        memoryLockouts.set(emailKey, Date.now() + 900000);
        memoryAttempts.delete(emailKey);
        throw new ApiError(429, 'Account is temporarily locked due to consecutive failed login attempts. Please try again in 15 minutes.');
      }
    }
  };

  const result = await query(
    `SELECT u.id, u.name, u.email, u.role, u.password_hash, u.is_active, u.device_id,
            u.organization_id AS "organizationId", o.name AS "organizationName"
     FROM users u
     LEFT JOIN organizations o ON o.id = u.organization_id
     WHERE u.email = $1`,
    [emailKey]
  );

  if (result.rows.length === 0) {
    await recordFailedAttempt();
    throw new ApiError(401, 'Invalid email or password');
  }

  const user = result.rows[0];

  if (!user.is_active) {
    throw new ApiError(403, 'Account is deactivated');
  }

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    await recordFailedAttempt();
    throw new ApiError(401, 'Invalid email or password');
  }

  // Clear failed attempts on successful authentication
  if (getRedisStatus()) {
    try {
      await redisClient.del(attemptsKey);
      await redisClient.del(lockoutKey);
    } catch (err) {
      // Ignore cleanup error
    }
  } else {
    memoryAttempts.delete(emailKey);
    memoryLockouts.delete(emailKey);
  }

  // Update last login
  await query(
    'UPDATE users SET last_login_at = NOW() WHERE id = $1',
    [user.id]
  );

  return generateAuthResult(user);
};

/**
 * 3. Forgot Password - Send OTP
 */
export const forgotPassword = async (email: string) => {
  // SECURITY: We do NOT reveal whether this email is registered.
  // We silently check and only generate/send an OTP if the account exists.
  const result = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);

  // Always return the same generic message regardless of outcome
  // to prevent email enumeration attacks.
  if (result.rows.length === 0) {
    return { message: "If this email is registered, a reset OTP will be sent." };
  }

  // Generate 6-digit OTP using cryptographically secure random number
  const otp = crypto.randomInt(100000, 1000000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  if (getRedisStatus()) {
    try {
      await redisClient.setEx(`reset_otp:${email}`, 600, otp);
    } catch (err) {
      console.warn("Failed to save reset OTP to Redis, falling back to Postgres:", err);
      await query(
        'INSERT INTO verification_otps (email, otp, expires_at) VALUES ($1, $2, $3)',
        [email, otp, expiresAt]
      );
    }
  } else {
    console.warn("Redis is offline, writing reset OTP directly to Postgres");
    await query(
      'INSERT INTO verification_otps (email, otp, expires_at) VALUES ($1, $2, $3)',
      [email, otp, expiresAt]
    );
  }

  await sendEmail({
    to: email,
    subject: `Reset Your Password — OTP: ${otp}`,
    html: `<div style="font-family: sans-serif; padding: 20px;">
      <h2>Password Reset Request</h2>
      <p>Your OTP to reset password is: <b style="font-size: 24px; color: #3b82f6;">${otp}</b></p>
      <p>This code will expire in 10 minutes.</p>
    </div>`,
    otp,
  });

  return { message: "If this email is registered, a reset OTP will be sent." };
};

/**
 * 4. Reset Password - Verify OTP & Update
 */
export const resetPassword = async (email: string, otp: string, newPassword: string) => {
  if (!validatePassword(newPassword)) {
    throw new ApiError(400, "New password is too weak");
  }

  let isValid = false;
  if (getRedisStatus()) {
    try {
      const storedOtp = await redisClient.get(`reset_otp:${email}`);
      if (storedOtp === otp) {
        isValid = true;
      }
    } catch (err) {
      console.warn("Redis reset OTP fetch failed, checking Postgres fallback:", err);
    }
  } else {
    console.warn("Redis is offline, looking up reset OTP in Postgres");
  }

  if (!isValid) {
    const result = await query(
      'SELECT id FROM verification_otps WHERE email = $1 AND otp = $2 AND expires_at > NOW()',
      [email, otp]
    );
    if (result.rows.length > 0) {
      isValid = true;
    }
  }

  if (!isValid) throw new ApiError(400, "Invalid or expired OTP");

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await query('UPDATE users SET password_hash = $1 WHERE email = $2', [passwordHash, email.toLowerCase()]);
  console.log(`[AUDIT] Password reset for user: ${email.toLowerCase()}`);

  // Cleanup
  if (getRedisStatus()) {
    try {
      await redisClient.del(`reset_otp:${email}`);
    } catch (err) {
      console.warn("Failed to delete reset OTP from Redis:", err);
    }
  }
  await query('DELETE FROM verification_otps WHERE email = $1', [email]);

  return { message: "Password reset successful" };
};

// ── Refresh Token with Strict RTR (Refresh Token Rotation) ──
export const refreshAccessToken = async (refreshToken: string): Promise<{ accessToken: string; newRefreshToken: string }> => {
  try {
    const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as JwtPayload;
    const tokenHash = hashToken(refreshToken);

    // Check token in DB
    const stored = await query(
      `SELECT id FROM refresh_tokens
       WHERE token_hash = $1 AND user_id = $2 AND expires_at > NOW()`,
      [tokenHash, decoded.userId]
    );

    if (stored.rows.length === 0) {
      // ⚠️ REUSE ATTACK DETECTED! Invalidate all refresh tokens for this user family
      console.warn(`[SECURITY BREACH] Reused refresh token detected for user: ${decoded.userId}. Revoking entire token family!`);
      await query(`DELETE FROM refresh_tokens WHERE user_id = $1`, [decoded.userId]);
      throw new ApiError(401, 'Security alert: Refresh token reuse detected. All sessions terminated.');
    }

    // 1. Invalidate used token
    await query(`DELETE FROM refresh_tokens WHERE id = $1`, [stored.rows[0].id]);

    // 2. Get user
    const userResult = await query(
      `SELECT u.id, u.email, u.role, u.organization_id AS "organizationId", o.name AS "organizationName"
       FROM users u
       LEFT JOIN organizations o ON o.id = u.organization_id
       WHERE u.id = $1 AND u.is_active = true`,
      [decoded.userId]
    );

    if (userResult.rows.length === 0) throw new ApiError(404, 'User not found or inactive');

    const user = userResult.rows[0];
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = await generateRefreshToken(user.id);

    return { accessToken: newAccessToken, newRefreshToken };
  } catch (error: any) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(401, 'Token refresh failed');
  }
};

// ── Logout ────────────────────────────────────────────────
export const logout = async (refreshToken: string): Promise<void> => {
  const tokenHash = hashToken(refreshToken);
  await query('DELETE FROM refresh_tokens WHERE token_hash = $1', [tokenHash]);
};

// ── Get Current User ──────────────────────────────────────
export const getMe = async (userId: string) => {
  const result = await query(
    `SELECT u.id, u.name, u.email, u.role, u.created_at, u.last_login_at,
            u.organization_id AS "organizationId", o.name AS "organizationName"
     FROM users u
     LEFT JOIN organizations o ON o.id = u.organization_id
     WHERE u.id = $1`,
    [userId]
  );
  if (result.rows.length === 0) throw new ApiError(404, 'User not found');
  return result.rows[0];
};

// ── Helpers ───────────────────────────────────────────────
const generateAccessToken = (user: { id: string; email: string; role: UserRole; organizationId?: string; organizationName?: string }): string => {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role, organizationId: user.organizationId, organizationName: user.organizationName } as JwtPayload,
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions
  );
};

const generateRefreshToken = async (userId: string): Promise<string> => {
  const nonce = crypto.randomBytes(16).toString('hex');
  const token = jwt.sign({ userId, nonce }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  } as jwt.SignOptions);

  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt]
  );

  return token;
};

const generateAuthResult = async (user: {
  id: string; name: string; email: string; role: UserRole; organizationId?: string; organizationName?: string;
}): Promise<AuthResult> => {
  const accessToken = generateAccessToken(user);
  const refreshToken = await generateRefreshToken(user.id);

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      organizationName: user.organizationName,
    },
    accessToken,
    refreshToken,
  };
};

const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

// ── Register Organization (Admin self-registration) ────────
export const registerOrg = async (input: RegisterOrgInput): Promise<AuthResult> => {
  const { companyName, adminName, email, password, plan, otp } = input;

  // 1. Validate inputs
  if (!companyName || companyName.trim().length < 2) {
    throw new ApiError(400, 'Company name must be at least 2 characters');
  }
  if (!adminName || adminName.trim().length < 2) {
    throw new ApiError(400, 'Admin name must be at least 2 characters');
  }
  if (!validatePassword(password)) {
    throw new ApiError(400, 'Password is too weak');
  }

  // 2. Verify OTP
  let isValid = false;
  if (getRedisStatus()) {
    try {
      const storedOtp = await redisClient.get(`otp:${email}`);
      if (storedOtp === otp) isValid = true;
    } catch {}
  }
  if (!isValid) {
    const r = await query(
      'SELECT id FROM verification_otps WHERE email = $1 AND otp = $2 AND expires_at > NOW()',
      [email.toLowerCase(), otp]
    );
    if (r.rows.length > 0) isValid = true;
  }
  if (!isValid) throw new ApiError(400, 'Invalid or expired OTP');

  // 3. Check duplicate email
  const emailCheck = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
  if (emailCheck.rows.length > 0) {
    throw new ApiError(409, 'An account with this email already exists');
  }

  // 4. Generate slug from company name
  const baseSlug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  // Ensure uniqueness by appending a short random suffix if needed
  const randomSuffix = crypto.randomBytes(3).toString('hex');
  const slug = `${baseSlug}-${randomSuffix}`;

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // 5. Create organization + admin user in a transaction
  const client = await (await import('../config/database')).pool.connect();
  try {
    await client.query('BEGIN');

    // Create organization
    const orgResult = await client.query(
      `INSERT INTO organizations (name, slug, plan, owner_id)
       VALUES ($1, $2, $3, NULL)
       RETURNING id, name, slug, plan`,
      [companyName.trim(), slug, plan]
    );
    const org = orgResult.rows[0];

    // Create admin user linked to this org
    const userResult = await client.query(
      `INSERT INTO users (name, email, password_hash, role, organization_id)
       VALUES ($1, $2, $3, 'ADMIN', $4)
       RETURNING id, name, email, role, organization_id`,
      [adminName.trim(), email.toLowerCase(), passwordHash, org.id]
    );
    const user = userResult.rows[0];

    // Set owner_id on org now that user exists
    await client.query('UPDATE organizations SET owner_id = $1 WHERE id = $2', [user.id, org.id]);

    // Initial plan subscription record
    await client.query(
      `INSERT INTO plan_subscriptions (organization_id, plan, payment_provider, status)
       VALUES ($1, $2, 'manual', 'active')`,
      [org.id, plan]
    );

    await client.query('COMMIT');

    // Cleanup OTP
    if (getRedisStatus()) {
      try { await redisClient.del(`otp:${email}`); } catch {}
    }
    await query('DELETE FROM verification_otps WHERE email = $1', [email.toLowerCase()]);

    console.log(`[AUDIT] Organization registered: ${org.id} (${org.name}) plan=${plan}. Admin: ${user.id} (${user.email})`);

    return generateAuthResult({
      id: user.id,
      name: user.name,
      email: user.email,
      role: 'ADMIN',
      organizationId: org.id,
      organizationName: org.name,
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    if (err instanceof ApiError) throw err;
    throw new ApiError(500, `Registration failed: ${err.message}`);
  } finally {
    client.release();
  }
};

