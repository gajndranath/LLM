-- ============================================================
-- Migration 005: Dynamic Billing & Anti-Fraud Logistics
-- ============================================================

-- 1. Create Subscription Plans Table
CREATE TABLE IF NOT EXISTS subscription_plans (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code                VARCHAR(50) UNIQUE NOT NULL, -- e.g., 'free', 'pro', 'mega'
    name                VARCHAR(100) NOT NULL,
    description         TEXT,
    price_cents         INTEGER NOT NULL DEFAULT 0,
    currency            VARCHAR(10) NOT NULL DEFAULT 'INR',
    max_connections     INTEGER NOT NULL DEFAULT 1,
    max_staff           INTEGER NOT NULL DEFAULT 2,
    max_queries_per_day INTEGER NOT NULL DEFAULT 50,
    features            JSONB DEFAULT '[]'::jsonb,
    is_active           BOOLEAN DEFAULT true,
    is_custom           BOOLEAN DEFAULT false,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for updated_at
CREATE TRIGGER trg_subscription_plans_updated
  BEFORE UPDATE ON subscription_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 2. Seed Initial Plans
INSERT INTO subscription_plans (code, name, description, price_cents, max_connections, max_staff, max_queries_per_day, features)
VALUES 
('free', 'Free', 'Perfect for exploring and small projects.', 0, 1, 2, 50, '["1 DB Connection", "50 Queries/day", "Basic SQL Copilot", "Community Support"]'::jsonb),
('pro', 'Pro', 'For growing teams and production databases.', 299900, 5, 10, 500, '["5 DB Connections", "500 Queries/day", "AI Architect", "Email Support", "Query History"]'::jsonb),
('mega', 'Mega', 'Enterprise grade power and priority support.', 999900, 999999, 999999, 9999999, '["Unlimited Connections", "Unlimited Queries", "All Features", "Priority Support", "Custom Integrations"]'::jsonb)
ON CONFLICT (code) DO UPDATE 
SET 
    name = EXCLUDED.name,
    price_cents = EXCLUDED.price_cents,
    max_connections = EXCLUDED.max_connections,
    max_staff = EXCLUDED.max_staff,
    max_queries_per_day = EXCLUDED.max_queries_per_day,
    features = EXCLUDED.features;

-- 3. Create Payment Transactions Table for Anti-Fraud Logistics
CREATE TABLE IF NOT EXISTS payment_transactions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    provider            VARCHAR(50) NOT NULL, -- 'razorpay' or 'stripe'
    provider_order_id   VARCHAR(255) NOT NULL UNIQUE, -- Ensures Idempotency
    provider_payment_id VARCHAR(255),
    amount_cents        INTEGER NOT NULL,
    currency            VARCHAR(10) NOT NULL DEFAULT 'INR',
    status              VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, captured, failed
    signature_verified  BOOLEAN DEFAULT false,
    plan_code           VARCHAR(50),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for updated_at
CREATE TRIGGER trg_payment_transactions_updated
  BEFORE UPDATE ON payment_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_payment_transactions_org ON payment_transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_order ON payment_transactions(provider_order_id);
