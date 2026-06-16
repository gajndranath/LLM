import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { 
  register, 
  registerOrg,
  login, 
  refreshAccessToken, 
  logout, 
  getMe, 
  requestOTP, 
  forgotPassword, 
  resetPassword 
} from '../services/auth.service';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import { createRateLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

const authRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 5,
  message: "Too many authentication requests. Please try again after a minute.",
  prefix: "auth"
});

// Zod Validation Schemas
const sendOtpSchema = z.object({
  email: z.string().email("Invalid email format"),
});

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long"),
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters long")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  otp: z.string().length(6, "OTP must be exactly 6 characters"),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email format"),
});

const resetPasswordSchema = z.object({
  email: z.string().email("Invalid email format"),
  otp: z.string().length(6, "OTP must be exactly 6 characters"),
  newPassword: z.string().min(8, "Password must be at least 8 characters long")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

const logoutSchema = z.object({
  refreshToken: z.string().optional(),
});

// POST /api/auth/send-otp
router.post('/send-otp', authRateLimiter, validateRequest(sendOtpSchema), asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;
  const result = await requestOTP(email);
  return res.status(200).json(new ApiResponse(200, result, "OTP sent successfully"));
}));

// Helper to set HTTP-Only Cookie
const setAuthCookie = (res: Response, token: string) => {
  res.cookie('jwt', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  });
};

// POST /api/auth/register
router.post('/register', authRateLimiter, validateRequest(registerSchema), asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, otp } = req.body;
  const result = await register({ name, email, password, otp });
  
  setAuthCookie(res, result.accessToken);
  const { accessToken, refreshToken, ...userData } = result as any;
  
  return res.status(201).json(
    new ApiResponse(201, userData, "Registration successful")
  );
}));

// POST /api/auth/login
router.post('/login', authRateLimiter, validateRequest(loginSchema), asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const result = await login({ email, password });
  
  setAuthCookie(res, result.accessToken);
  const { accessToken, refreshToken, ...userData } = result as any;
  
  return res.status(200).json(
    new ApiResponse(200, userData, "Login successful")
  );
}));

// POST /api/auth/forgot-password
router.post('/forgot-password', authRateLimiter, validateRequest(forgotPasswordSchema), asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;
  const result = await forgotPassword(email);
  return res.status(200).json(new ApiResponse(200, result, "Reset OTP sent"));
}));

// POST /api/auth/reset-password
router.post('/reset-password', authRateLimiter, validateRequest(resetPasswordSchema), asyncHandler(async (req: Request, res: Response) => {
  const { email, otp, newPassword } = req.body;
  const result = await resetPassword(email, otp, newPassword);
  return res.status(200).json(new ApiResponse(200, result, "Password updated successfully"));
}));

// POST /api/auth/refresh
router.post('/refresh', validateRequest(refreshSchema), asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  const accessToken = await refreshAccessToken(refreshToken);
  
  setAuthCookie(res, accessToken);
  
  return res.status(200).json(
    new ApiResponse(200, null, "Token refreshed")
  );
}));

// POST /api/auth/logout
router.post('/logout', asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    try { await logout(refreshToken); } catch (e) {}
  }
  
  res.clearCookie('jwt');
  return res.status(200).json(
    new ApiResponse(200, null, "Logged out successfully")
  );
}));

// GET /api/auth/me
router.get('/me', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const user = await getMe(req.user!.userId);
  
  return res.status(200).json(
    new ApiResponse(200, { user }, "User profile fetched")
  );
}));

// GET /api/auth/maintenance-status — ANY logged-in user can check maintenance state
router.get('/maintenance-status', authenticate, asyncHandler(async (_req: Request, res: Response) => {
  let isMaintenance = false;
  try {
    const { getRedisStatus, redisClient } = await import('../config/redis');
    if (getRedisStatus()) {
      const status = await redisClient.get('system:maintenance_mode');
      isMaintenance = status === 'true';
    }
  } catch { /* ignore */ }
  return res.status(200).json(new ApiResponse(200, { isMaintenance }, 'Maintenance status fetched'));
}));


// POST /api/auth/register-org — Organization (company) self-registration
const registerOrgSchema = z.object({
  companyName: z.string().min(2, 'Company name must be at least 2 characters').max(255),
  adminName:   z.string().min(2, 'Admin name must be at least 2 characters').max(100),
  email:       z.string().email('Invalid email format'),
  password:    z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  plan: z.enum(['free', 'pro', 'mega']),
  otp: z.string().length(6, 'OTP must be exactly 6 digits'),
});

router.post(
  '/register-org',
  authRateLimiter,
  validateRequest(registerOrgSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { companyName, adminName, email, password, plan, otp } = req.body;
    const result = await registerOrg({ companyName, adminName, email, password, plan, otp });
    
    setAuthCookie(res, result.accessToken);
    const { accessToken, refreshToken, ...userData } = result as any;

    return res.status(201).json(
      new ApiResponse(201, userData, 'Organization registered successfully')
    );
  })
);

export default router;
