-- ============================================================
-- Operant - Aurora PostgreSQL schema
-- Supabase handles auth only. Application data lives in Aurora.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------- Users ----------
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       VARCHAR(255) NOT NULL UNIQUE,
  name        VARCHAR(120),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Agents ----------
-- The table keeps its historical name to avoid a destructive production rename.
CREATE TABLE IF NOT EXISTS companions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name            VARCHAR(120) NOT NULL,
  companion_type  VARCHAR(20) NOT NULL DEFAULT 'custom'
                   CHECK (companion_type IN ('prebuilt', 'custom')),
  trait           TEXT NOT NULL DEFAULT '',
  persona         TEXT NOT NULL DEFAULT '',
  emoji           VARCHAR(16) NOT NULL DEFAULT 'AI',
  color           VARCHAR(16) NOT NULL DEFAULT '#6366f1',
  model           VARCHAR(60) NOT NULL DEFAULT 'openai/gpt-5.4',
  level           INT NOT NULL DEFAULT 1 CHECK (level >= 1),
  xp              INT NOT NULL DEFAULT 0 CHECK (xp >= 0),
  skills          JSONB NOT NULL DEFAULT '[]'::jsonb,
  message_count   INT NOT NULL DEFAULT 0 CHECK (message_count >= 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_companions_user_id ON companions(user_id);
CREATE INDEX IF NOT EXISTS idx_companions_user_created ON companions(user_id, created_at DESC);

-- ---------- Conversations ----------
CREATE TABLE IF NOT EXISTS conversations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  companion_id  UUID NOT NULL REFERENCES companions(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role          VARCHAR(12) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content       TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversations_companion ON conversations(companion_id, created_at);
CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id);

-- ---------- Installed skills ----------
CREATE TABLE IF NOT EXISTS companion_skills (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  companion_id  UUID NOT NULL REFERENCES companions(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_id      VARCHAR(120) NOT NULL,
  skill_name    VARCHAR(120) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (companion_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_companion_skills_user ON companion_skills(user_id);

-- ---------- Orders ----------
-- Stripe checkout session id is the idempotency key for fulfillment.
CREATE TABLE IF NOT EXISTS orders (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  items              JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_cents        INT NOT NULL DEFAULT 0 CHECK (total_cents >= 0),
  status             VARCHAR(20) NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'completed', 'refunded', 'failed')),
  stripe_session_id  VARCHAR(255) UNIQUE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_stripe_sid ON orders(stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;

ALTER TABLE companions
  ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_companions_order_id ON companions(order_id)
  WHERE order_id IS NOT NULL;

-- ---------- Pending skills ----------
-- Paid shop upgrades that have not yet been assigned to an owned agent.
CREATE TABLE IF NOT EXISTS pending_skills (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_id           VARCHAR(120) NOT NULL,
  skill_name         VARCHAR(120) NOT NULL,
  stripe_session_id  VARCHAR(255),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, skill_id, stripe_session_id)
);

CREATE INDEX IF NOT EXISTS idx_pending_skills_user ON pending_skills(user_id);

-- ---------- User milestones ----------
CREATE TABLE IF NOT EXISTS user_milestones (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  milestone_id  VARCHAR(120) NOT NULL,
  xp_awarded    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, milestone_id)
);

CREATE INDEX IF NOT EXISTS idx_user_milestones_user ON user_milestones(user_id);

-- ---------- updated_at trigger ----------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_companions_updated_at ON companions;
CREATE TRIGGER trg_companions_updated_at BEFORE UPDATE ON companions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
