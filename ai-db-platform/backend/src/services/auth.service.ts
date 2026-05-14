import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { dbQuery as query } from '../config/database';
import { env } from '../config/env';
import { JwtPayload, UserRole } from '../middleware/auth.middleware';
import { ApiError } from '../utils/ApiError';
import { validateEmail, validatePassword } from '../utils/validators';
import { sendEmail, sendOTPEmail } from './email.service';
import { redisClient } from '../config/redis';

const SALT_ROUNDS = 12;

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  otp: string;
  deviceId?: string;
  role?: UserRole;
}

export interface LoginInput {
  email: string;
  password: string;
  deviceId?: string;
}

export interface AuthResult {
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  };
  accessToken: string;
  refreshToken: string;
}

/**
 * 1. Request OTP for Registration
 */
export const requestOTP = async (email: string) => {
  if (!validateEmail(email)) {
    throw new ApiError(400, "Invalid email format");
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  // Store OTP (Prefer Redis, fallback to Postgres)
  try {
    await redisClient.setEx(`otp:${email}`, 300, otp);
  } catch {
    await query(
      'INSERT INTO verification_otps (email, otp, expires_at) VALUES ($1, $2, $3)',
      [email, otp, expiresAt]
    );
  }

  // Send Email
  await sendOTPEmail(email, otp);

  return { message: "OTP sent to your email" };
};

/**
 * 2. Verify OTP and Complete Registration
 */
export const register = async (input: RegisterInput): Promise<AuthResult> => {
  const { name, email, password, otp, deviceId, role = 'ANALYST' } = input;

  // 1. Validate Input
  if (!name || name.trim().length < 2) {
    throw new ApiError(400, "Name must be at least 2 characters long");
  }
  if (!validatePassword(password)) {
    throw new ApiError(400, "Password is too weak");
  }

  // 2. Verify OTP
  let isValid = false;
  try {
    const storedOtp = await redisClient.get(`otp:${email}`);
    if (storedOtp === otp) isValid = true;
  } catch {
    const result = await query(
      'SELECT id FROM verification_otps WHERE email = $1 AND otp = $2 AND expires_at > NOW()',
      [email, otp]
    );
    if (result.rows.length > 0) isValid = true;
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
    `INSERT INTO users (name, email, password_hash, role, device_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, email, role`,
    [name, email.toLowerCase(), passwordHash, role, deviceId || null]
  );

  const user = result.rows[0];
  
  // Cleanup OTP
  try { await redisClient.del(`otp:${email}`); } catch {
    await query('DELETE FROM verification_otps WHERE email = $1', [email]);
  }

  return generateAuthResult(user);
};

// ── Login ──────────────────────────────────────────────────
export const login = async (input: LoginInput): Promise<AuthResult> => {
  const { email, password, deviceId } = input;

  const result = await query(
    `SELECT id, name, email, role, password_hash, is_active, device_id
     FROM users WHERE email = $1`,
    [email.toLowerCase()]
  );

  if (result.rows.length === 0) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const user = result.rows[0];

  if (!user.is_active) {
    throw new ApiError(403, 'Account is deactivated');
  }

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    throw new ApiError(401, 'Invalid email or password');
  }

  // Update last login and device_id if provided
  await query(
    'UPDATE users SET last_login_at = NOW(), device_id = COALESCE($2, device_id) WHERE id = $1',
    [user.id, deviceId || null]
  );

  return generateAuthResult(user);
};

/**
 * 3. Forgot Password - Send OTP
 */
export const forgotPassword = async (email: string) => {
  const result = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
  if (result.rows.length === 0) {
    throw new ApiError(404, "No account found with this email");
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  try {
    await redisClient.setEx(`reset_otp:${email}`, 600, otp);
  } catch {
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
  });

  return { message: "Reset OTP sent to your email" };
};

/**
 * 4. Reset Password - Verify OTP & Update
 */
export const resetPassword = async (email: string, otp: string, newPassword: string) => {
  if (!validatePassword(newPassword)) {
    throw new ApiError(400, "New password is too weak");
  }

  let isValid = false;
  try {
    const storedOtp = await redisClient.get(`reset_otp:${email}`);
    if (storedOtp === otp) isValid = true;
  } catch {
    const result = await query(
      'SELECT id FROM verification_otps WHERE email = $1 AND otp = $2 AND expires_at > NOW()',
      [email, otp]
    );
    if (result.rows.length > 0) isValid = true;
  }

  if (!isValid) throw new ApiError(400, "Invalid or expired OTP");

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await query('UPDATE users SET password_hash = $1 WHERE email = $2', [passwordHash, email.toLowerCase()]);

  // Cleanup
  try { await redisClient.del(`reset_otp:${email}`); } catch {
    await query('DELETE FROM verification_otps WHERE email = $1', [email]);
  }

  return { message: "Password reset successful" };
};

// ── Refresh Token ─────────────────────────────────────────
export const refreshAccessToken = async (refreshToken: string): Promise<string> => {
  try {
    const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as JwtPayload;

    // Check token in DB
    const tokenHash = hashToken(refreshToken);
    const stored = await query(
      `SELECT id FROM refresh_tokens
       WHERE token_hash = $1 AND user_id = $2 AND expires_at > NOW()`,
      [tokenHash, decoded.userId]
    );

    if (stored.rows.length === 0) {
      throw new ApiError(401, 'Invalid or expired refresh token');
    }

    // Get user
    const userResult = await query(
      'SELECT id, email, role FROM users WHERE id = $1 AND is_active = true',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) throw new ApiError(404, 'User not found or inactive');

    const user = userResult.rows[0];
    return generateAccessToken(user);
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
    'SELECT id, name, email, role, created_at, last_login_at, device_id FROM users WHERE id = $1',
    [userId]
  );
  if (result.rows.length === 0) throw new ApiError(404, 'User not found');
  return result.rows[0];
};

// ── Helpers ───────────────────────────────────────────────
const generateAccessToken = (user: { id: string; email: string; role: UserRole }): string => {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role } as JwtPayload,
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions
  );
};

const generateRefreshToken = async (userId: string): Promise<string> => {
  const token = jwt.sign({ userId }, env.JWT_REFRESH_SECRET, {
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
  id: string; name: string; email: string; role: UserRole;
}): Promise<AuthResult> => {
  const accessToken = generateAccessToken(user);
  const refreshToken = await generateRefreshToken(user.id);

  return {
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    accessToken,
    refreshToken,
  };
};

const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};
