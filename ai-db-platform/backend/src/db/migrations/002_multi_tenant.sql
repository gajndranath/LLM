-- ============================================================
-- Migration 002: Multi-Tenant Architecture
-- Atlas Platform — Organizations, Staff Invites, Plan Subscriptions
-- ============================================================

-- ── Organizations ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organizations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  VARCHAR(255) NOT NULL,
  slug                  VARCHAR(100) UNIQUE NOT NULL,  -- URL-safe lowercase name
  plan                  VARCHAR(20) NOT NULL DEFAULT 'free'
                        CHECK (plan IN ('free', 'pro', 'mega')),
  plan_status           VARCHAR(20) NOT NULL DEFAULT 'active'
                        CHECK (plan_status IN ('active', 'trialing', 'cancelled', 'past_due')),
  owner_id              UUID REFERENCES users(id) ON DELETE SET NULL,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  razorpay_customer_id  VARCHAR(255),
  stripe_customer_id    VARCHAR(255),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_plan ON organizations(plan);
CREATE INDEX IF NOT EXISTS idx_organizations_owner ON organizations(owner_id);

CREATE OR REPLACE TRIGGER trg_organizations_updated
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Alter Users — Add organization_id and created_by ─────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- SUPER_ADMIN will have organization_id = NULL (they own the platform, not an org)
CREATE INDEX IF NOT EXISTS idx_users_organization ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_created_by ON users(created_by);

-- ── Staff Invites ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff_invites (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invited_by       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email            VARCHAR(255) NOT NULL,
  name             VARCHAR(100),                -- Optional: admin can pre-fill staff name
  role             VARCHAR(20) NOT NULL
                   CHECK (role IN ('ANALYST', 'VIEWER', 'DISPATCHER', 'DRIVER')),
  token_hash       TEXT NOT NULL UNIQUE,        -- SHA-256 of invite token (never store raw token)
  expires_at       TIMESTAMPTZ NOT NULL,        -- 72 hours
  accepted_at      TIMESTAMPTZ,                 -- NULL = pending, set when accepted
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_invites_org ON staff_invites(organization_id);
CREATE INDEX IF NOT EXISTS idx_staff_invites_email ON staff_invites(email);
CREATE INDEX IF NOT EXISTS idx_staff_invites_token ON staff_invites(token_hash);

-- ── Plan Subscriptions (Audit Trail) ─────────────────────────
CREATE TABLE IF NOT EXISTS plan_subscriptions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan              VARCHAR(20) NOT NULL,
  payment_provider  VARCHAR(20),               -- 'razorpay' | 'stripe' | 'manual'
  provider_sub_id   TEXT,                      -- Razorpay/Stripe subscription/order ID
  amount_cents      INTEGER,                   -- Amount in smallest unit (paise or cents)
  currency          VARCHAR(5),                -- 'INR' or 'USD'
  status            VARCHAR(20) DEFAULT 'active'
                    CHECK (status IN ('active', 'cancelled', 'expired', 'pending')),
  started_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at          TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plan_subs_org ON plan_subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_plan_subs_provider ON plan_subscriptions(payment_provider, provider_sub_id);
