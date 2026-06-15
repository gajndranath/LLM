import { Router as ExpressRouter, Request as ExpressReq, Response as ExpressRes } from 'express';
import { createRazorpayOrder, verifyRazorpayWebhook } from '../services/billing.service';
import { authenticate } from '../middleware/auth.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';

const router = ExpressRouter();

import { dbQuery as query } from '../config/database';

// ── GET Plans ──────────────────────────────────────────────
router.get('/plans', asyncHandler(async (req: ExpressReq, res: ExpressRes) => {
  const result = await query(
    'SELECT code as id, name, description, price_cents, currency, max_connections, max_staff, max_queries_per_day, features, is_custom FROM subscription_plans WHERE is_active = true ORDER BY price_cents ASC'
  );
  return res.status(200).json(new ApiResponse(200, result.rows, "Plans fetched successfully"));
}));

// ── Create Checkout Order ──────────────────────────────────
router.post('/create-order', authenticate, asyncHandler(async (req: ExpressReq, res: ExpressRes) => {
  const { plan } = req.body;
  // Ensure only admins can initiate billing
  if (req.user!.role !== 'ADMIN' && req.user!.role !== 'SUPER_ADMIN') {
    return res.status(403).json(new ApiResponse(403, null, "Only admins can upgrade plans"));
  }

  const orgId = req.user?.organizationId;
  if (!orgId) {
    return res.status(403).json(new ApiResponse(403, null, "No organization associated with this account"));
  }

  const order = await createRazorpayOrder(orgId, plan);
  return res.status(200).json(new ApiResponse(200, order, "Order created successfully"));
}));

// ── Cancel Subscription ────────────────────────────────────
router.post('/cancel-plan', authenticate, asyncHandler(async (req: ExpressReq, res: ExpressRes) => {
  if (req.user!.role !== 'ADMIN' && req.user!.role !== 'SUPER_ADMIN') {
    return res.status(403).json(new ApiResponse(403, null, "Only admins can cancel plans"));
  }

  const orgId = req.user?.organizationId;
  if (!orgId) {
    return res.status(403).json(new ApiResponse(403, null, "No organization associated with this account"));
  }

  const { cancelPlan } = await import('../services/billing.service');
  const result = await cancelPlan(orgId);
  return res.status(200).json(new ApiResponse(200, result, "Plan cancelled successfully"));
}));

// ── Verify Payment (Frontend Callback Fallback) ────────────
router.post('/verify-payment', authenticate, asyncHandler(async (req: ExpressReq, res: ExpressRes) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json(new ApiResponse(400, null, "Missing verification parameters"));
  }

  const { verifyRazorpayPayment } = await import('../services/billing.service');
  const result = await verifyRazorpayPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature);
  
  return res.status(200).json(new ApiResponse(200, result, "Payment verified successfully"));
}));

// ── Razorpay Webhook ───────────────────────────────────────
// Must use raw body for webhook verification, but since we use express.json() globally,
// we'll stringify the body to verify. In production, raw-body parsing is preferred.
router.post('/webhook/razorpay', asyncHandler(async (req: ExpressReq, res: ExpressRes) => {
  const signature = req.headers['x-razorpay-signature'] as string;
  // Express parses JSON, but crypto needs the raw payload. 
  // For Razorpay, stringified JSON matches raw body in most cases if exact same keys.
  const payload = JSON.stringify(req.body);

  if (!signature) {
    return res.status(400).json(new ApiResponse(400, null, "Missing signature"));
  }

  await verifyRazorpayWebhook(signature, payload);

  return res.status(200).json({ status: "ok" });
}));

export default router;
