import Razorpay from 'razorpay';
import crypto from 'crypto';
import { env } from '../config/env';
import { dbQuery as query } from '../config/database';
import { ApiError } from '../utils/ApiError';

// Initialize Razorpay conditionally (allows app to start even if keys are mock/empty)
const razorpay = (env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET)
  ? new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET,
    })
  : null;

export const createRazorpayOrder = async (orgId: string, plan: string) => {
  if (!razorpay) throw new ApiError(500, 'Razorpay is not configured');
  
  // Fetch dynamic plan price
  const planResult = await query('SELECT price_cents, is_active FROM subscription_plans WHERE code = $1', [plan]);
  if (planResult.rows.length === 0) throw new ApiError(400, 'Invalid plan');
  if (!planResult.rows[0].is_active) throw new ApiError(400, 'Plan is not currently active');

  const amountCents = planResult.rows[0].price_cents;
  if (amountCents === 0) throw new ApiError(400, 'Cannot create order for free plan');
  
  try {
    const order = await razorpay.orders.create({
      amount: amountCents, // Amount already in cents/paise from DB
      currency: 'INR', // Defaulting to INR for Razorpay mock
      receipt: `rcpt_${orgId.substring(0, 8)}_${Date.now().toString().slice(-8)}`,
      notes: {
        orgId,
        plan
      }
    });

    // Insert pending transaction for analytics & reminders
    await query(
      `INSERT INTO payment_transactions (organization_id, provider, provider_order_id, amount_cents, currency, status, signature_verified, plan_code)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [orgId, 'razorpay', order.id, order.amount, order.currency, 'pending', false, plan]
    );

    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: env.RAZORPAY_KEY_ID
    };
  } catch (err: any) {
    console.error('Razorpay Error:', err);
    throw new ApiError(500, `Failed to create payment order: ${err.error?.description || err.message || JSON.stringify(err)}`);
  }
};

export const verifyRazorpayWebhook = async (
  signature: string,
  payload: string
) => {
  if (!env.RAZORPAY_WEBHOOK_SECRET) throw new ApiError(500, 'Webhook secret not configured');

  let data;
  try {
    data = JSON.parse(payload);
  } catch (e) {
    throw new ApiError(400, 'Invalid JSON payload');
  }

  const expectedSignature = crypto
    .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  // Constant-time comparison to prevent side-channel timing attacks
  const signatureBuffer = Buffer.from(signature, 'utf8');
  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
  const isSignatureValid = signatureBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(signatureBuffer, expectedBuffer);

  const event = data.event;
  const createdAt = data.created_at || data.payload?.payment?.entity?.created_at;

  // Webhook Replay Attack Defense: Reject webhooks older than 5 minutes (300 seconds)
  if (createdAt) {
    const eventTimeMs = typeof createdAt === 'number' && createdAt < 1e11 ? createdAt * 1000 : Number(createdAt);
    if (Date.now() - eventTimeMs > 300 * 1000) {
      console.warn(`[SECURITY] Rejected expired/replayed webhook from timestamp: ${new Date(eventTimeMs).toISOString()}`);
      throw new ApiError(400, 'Webhook timestamp expired. Possible replay attack.');
    }
  }

  const payment = data.payload?.payment?.entity;
  const orderId = payment?.order_id;
  const orgId = payment?.notes?.orgId;
  const plan = payment?.notes?.plan;

  if (!isSignatureValid) {
    // FRAUD ATTEMPT DETECTED!
    if (orderId && orgId && plan) {
      // Mark transaction as a failed/fraud attempt
      await query(
        `INSERT INTO payment_transactions (organization_id, provider, provider_order_id, provider_payment_id, amount_cents, currency, status, signature_verified, plan_code)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (provider_order_id) DO UPDATE 
         SET status = 'failed', signature_verified = false`,
        [orgId, 'razorpay', orderId, payment.id || null, payment.amount || 0, payment.currency || 'INR', 'failed', false, plan]
      );
      console.warn(`[FRAUD ALERT] Invalid signature for order ${orderId}. Tracked in DB.`);
    }
    throw new ApiError(400, 'Invalid webhook signature');
  }

  // We are primarily interested in payment.captured or order.paid
  if (event === 'payment.captured' || event === 'order.paid') {

    if (!orgId || !plan) return; // Ignore payments not initiated by our system

    // --- IDEMPOTENCY & AMOUNT VERIFICATION CHECK ---
    const existingTx = await query('SELECT status, amount_cents FROM payment_transactions WHERE provider_order_id = $1', [payment.order_id]);
    
    if (existingTx.rows.length === 0) {
      console.warn(`[FRAUD ALERT] Webhook received for unknown order ${payment.order_id}`);
      return;
    }

    if (existingTx.rows[0].status === 'captured') {
      console.log(`[AUDIT] Ignored duplicate Razorpay webhook for order ${payment.order_id}`);
      return;
    }

    // Amount Verification (Crucial Anti-Fraud)
    if (parseInt(existingTx.rows[0].amount_cents) !== parseInt(payment.amount)) {
      console.warn(`[FRAUD ALERT] Amount mismatch for order ${payment.order_id}. Expected ${existingTx.rows[0].amount_cents}, got ${payment.amount}`);
      await query(
        `UPDATE payment_transactions SET status = 'failed', signature_verified = false WHERE provider_order_id = $1`,
        [payment.order_id]
      );
      return;
    }

    const client = await (await import('../config/database')).pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `INSERT INTO payment_transactions (organization_id, provider, provider_order_id, provider_payment_id, amount_cents, currency, status, signature_verified, plan_code)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (provider_order_id) DO UPDATE 
         SET provider_payment_id = EXCLUDED.provider_payment_id,
             status = 'captured',
             signature_verified = true`,
        [orgId, 'razorpay', payment.order_id, payment.id, payment.amount, payment.currency, 'captured', true, plan]
      );

      // Update organization plan securely
      await client.query(
        'UPDATE organizations SET plan = $1, plan_status = $2 WHERE id = $3',
        [plan, 'active', orgId]
      );

      // Record subscription audit trail
      await client.query(
        `INSERT INTO plan_subscriptions (organization_id, plan, payment_provider, provider_sub_id, amount_cents, currency, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [orgId, plan, 'razorpay', payment.order_id, payment.amount, payment.currency, 'active']
      );

      await client.query('COMMIT');
      console.log(`[AUDIT] Organization ${orgId} upgraded to ${plan} via Razorpay (Idempotent tracking successful).`);
    } catch (dbError) {
      await client.query('ROLLBACK');
      console.error(`[CRITICAL] DB Error during webhook processing for payment ${payment.id}. Auto-refunding customer to prevent loss.`, dbError);
      
      if (razorpay) {
        try {
          // Automatically refund the user so they don't lose money
          await razorpay.payments.refund(payment.id, {
            amount: payment.amount,
            notes: { reason: 'Technical error during plan upgrade', orgId }
          });
          console.log(`[AUDIT] Auto-refund successful for payment ${payment.id}`);
          
          await query(
            `UPDATE payment_transactions SET status = 'refunded' WHERE provider_order_id = $1`,
            [payment.order_id]
          );
        } catch (refundError) {
          console.error(`[URGENT] Auto-refund FAILED for payment ${payment.id}. Manual intervention required!`, refundError);
        }
      }
      throw new ApiError(500, 'Internal Server Error during webhook processing');
    } finally {
      client.release();
    }
  }
};

export const cancelPlan = async (orgId: string) => {
  const orgResult = await query('SELECT plan FROM organizations WHERE id = $1', [orgId]);
  if (orgResult.rows.length === 0) throw new ApiError(404, 'Organization not found');
  
  if (orgResult.rows[0].plan === 'free') {
    throw new ApiError(400, 'Organization is already on the free plan');
  }

  // 1. Update org to free plan
  await query('UPDATE organizations SET plan = $1, plan_status = $2 WHERE id = $3', ['free', 'active', orgId]);

  // 2. Security Check: Disable all active database connections to prevent quota bypass
  await query(
    `UPDATE db_connections 
     SET is_active = false 
     WHERE user_id IN (SELECT id FROM users WHERE organization_id = $1)`,
    [orgId]
  );

  // 3. Security Check: Disable all non-admin staff members to prevent quota bypass
  await query(
    `UPDATE users 
     SET is_active = false 
     WHERE organization_id = $1 AND role != 'ADMIN'`,
    [orgId]
  );

  // 4. Record cancellation in subscriptions
  await query(
    `INSERT INTO plan_subscriptions (organization_id, plan, payment_provider, status)
     VALUES ($1, $2, $3, $4)`,
    [orgId, 'free', 'manual', 'cancelled_previous']
  );

  return { message: 'Subscription cancelled successfully. You are now on the Free plan. Notice: All active connections and staff members have been disabled to comply with free tier limits. Please re-enable them manually.' };
};

export const verifyRazorpayPayment = async (
  razorpay_order_id: string,
  razorpay_payment_id: string,
  razorpay_signature: string
) => {
  if (!env.RAZORPAY_KEY_SECRET) throw new ApiError(500, 'Razorpay key secret not configured');

  const generatedSignature = crypto
    .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
    .update(razorpay_order_id + '|' + razorpay_payment_id)
    .digest('hex');

  if (generatedSignature !== razorpay_signature) {
    throw new ApiError(400, 'Invalid payment signature');
  }

  // Find the transaction
  const existingTx = await query('SELECT organization_id, plan_code, amount_cents, status FROM payment_transactions WHERE provider_order_id = $1', [razorpay_order_id]);
  
  if (existingTx.rows.length === 0) {
    throw new ApiError(404, 'Transaction not found');
  }

  if (existingTx.rows[0].status === 'captured') {
    return { message: 'Payment already verified' };
  }

  const { organization_id, plan_code, amount_cents } = existingTx.rows[0];

  const client = await (await import('../config/database')).pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE payment_transactions 
       SET provider_payment_id = $1, status = 'captured', signature_verified = true
       WHERE provider_order_id = $2`,
      [razorpay_payment_id, razorpay_order_id]
    );

    // Update organization plan securely
    await client.query(
      'UPDATE organizations SET plan = $1, plan_status = $2 WHERE id = $3',
      [plan_code, 'active', organization_id]
    );

    // Record subscription audit trail
    await client.query(
      `INSERT INTO plan_subscriptions (organization_id, plan, payment_provider, provider_sub_id, amount_cents, currency, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [organization_id, plan_code, 'razorpay', razorpay_order_id, amount_cents, 'INR', 'active']
    );

    await client.query('COMMIT');
    console.log(`[AUDIT] Organization ${organization_id} upgraded to ${plan_code} via frontend manual verification.`);
  } catch (dbError) {
    await client.query('ROLLBACK');
    console.error(`[CRITICAL] DB Error during manual payment verification`, dbError);
    throw new ApiError(500, 'Internal Server Error during payment verification');
  } finally {
    client.release();
  }

  return { message: 'Payment verified and plan upgraded successfully' };
};
