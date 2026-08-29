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

// ── Apply Coupon Code ──────────────────────────────────────
router.post('/apply-coupon', authenticate, asyncHandler(async (req: ExpressReq, res: ExpressRes) => {
  const { code } = req.body;
  if (!code || typeof code !== 'string') {
    return res.status(400).json(new ApiResponse(400, null, "Coupon code is required"));
  }

  const orgId = req.user?.organizationId;
  if (!orgId) {
    return res.status(403).json(new ApiResponse(403, null, "No organization associated with this account"));
  }

  const cleanCode = code.trim().toUpperCase();

  // 1. Fetch coupon
  const couponRes = await query(
    `SELECT * FROM subscription_coupons WHERE code = $1 AND is_active = true`,
    [cleanCode]
  );

  if (couponRes.rows.length === 0) {
    return res.status(404).json(new ApiResponse(404, null, "Invalid or expired coupon code"));
  }

  const coupon = couponRes.rows[0];

  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return res.status(400).json(new ApiResponse(400, null, "This coupon code has expired"));
  }

  if (coupon.current_uses >= coupon.max_uses) {
    return res.status(400).json(new ApiResponse(400, null, "This coupon has reached its maximum redemptions limit"));
  }

  // 2. Check if already redeemed by this org
  const redemptionCheck = await query(
    `SELECT * FROM coupon_redemptions WHERE coupon_id = $1 AND organization_id = $2`,
    [coupon.id, orgId]
  );

  if (redemptionCheck.rows.length > 0) {
    return res.status(400).json(new ApiResponse(400, null, "Your organization has already redeemed this coupon"));
  }

  // 3. Atomically apply coupon
  await query('BEGIN');
  try {
    await query(
      `INSERT INTO coupon_redemptions (coupon_id, organization_id, user_id) VALUES ($1, $2, $3)`,
      [coupon.id, orgId, req.user!.userId]
    );

    await query(
      `UPDATE subscription_coupons SET current_uses = current_uses + 1 WHERE id = $1`,
      [coupon.id]
    );

    // If 100% lifetime or God-mode coupon, directly upgrade org
    if (coupon.discount_percent === 100) {
      const targetPlan = coupon.target_plan || 'mega';
      await query(
        `UPDATE organizations SET plan = $1, plan_status = 'active', updated_at = NOW() WHERE id = $2`,
        [targetPlan, orgId]
      );
      await query('COMMIT');
      return res.status(200).json(new ApiResponse(200, {
        unlockedPlan: targetPlan,
        isLifetime: coupon.is_lifetime,
        message: "🎉 100% Lifetime Developer Access Unlocked!"
      }, "Coupon redeemed! Plan upgraded successfully."));
    }

    await query('COMMIT');
    return res.status(200).json(new ApiResponse(200, {
      discountPercent: coupon.discount_percent,
      discountAmountCents: coupon.discount_amount_cents,
      isLifetime: coupon.is_lifetime
    }, `Coupon applied! You get ${coupon.discount_percent}% discount.`));
  } catch (err: any) {
    await query('ROLLBACK');
    throw err;
  }
}));

// ── GET Invoices & Payment History ─────────────────────────
router.get('/invoices', authenticate, asyncHandler(async (req: ExpressReq, res: ExpressRes) => {
  const orgId = req.user?.organizationId;
  if (!orgId) {
    return res.status(403).json(new ApiResponse(403, null, "No organization associated with this account"));
  }

  const result = await query(
    `SELECT id, invoice_number, amount_cents, tax_cents, currency, status, plan_code, payment_provider, provider_payment_id, created_at
     FROM billing_invoices
     WHERE organization_id = $1
     ORDER BY created_at DESC`,
    [orgId]
  );

  return res.status(200).json(new ApiResponse(200, result.rows, "Invoices fetched successfully"));
}));

export default router;
