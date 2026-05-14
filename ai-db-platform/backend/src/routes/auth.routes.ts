import { Router, Request, Response } from 'express';
import { 
  register, 
  login, 
  refreshAccessToken, 
  logout, 
  getMe, 
  requestOTP, 
  forgotPassword, 
  resetPassword 
} from '../services/auth.service';
import { authenticate } from '../middleware/auth.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';

const router = Router();

// POST /api/auth/send-otp
router.post('/send-otp', asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;
  const result = await requestOTP(email);
  return res.status(200).json(new ApiResponse(200, result, "OTP sent successfully"));
}));

// POST /api/auth/register
router.post('/register', asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, otp, deviceId, role } = req.body;
  const result = await register({ name, email, password, otp, deviceId, role });
  
  return res.status(201).json(
    new ApiResponse(201, result, "Registration successful")
  );
}));

// POST /api/auth/login
router.post('/login', asyncHandler(async (req: Request, res: Response) => {
  const { email, password, deviceId } = req.body;
  const result = await login({ email, password, deviceId });
  
  return res.status(200).json(
    new ApiResponse(200, result, "Login successful")
  );
}));

// POST /api/auth/forgot-password
router.post('/forgot-password', asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;
  const result = await forgotPassword(email);
  return res.status(200).json(new ApiResponse(200, result, "Reset OTP sent"));
}));

// POST /api/auth/reset-password
router.post('/reset-password', asyncHandler(async (req: Request, res: Response) => {
  const { email, otp, newPassword } = req.body;
  const result = await resetPassword(email, otp, newPassword);
  return res.status(200).json(new ApiResponse(200, result, "Password updated successfully"));
}));

// POST /api/auth/refresh
router.post('/refresh', asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  const accessToken = await refreshAccessToken(refreshToken);
  
  return res.status(200).json(
    new ApiResponse(200, { accessToken }, "Token refreshed")
  );
}));

// POST /api/auth/logout
router.post('/logout', asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await logout(refreshToken);
  }
  
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

export default router;
