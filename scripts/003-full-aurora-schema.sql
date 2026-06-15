-- ============================================================
-- Migration 003: Full Operant schema — missing tables + fixes
-- Run in your AWS Aurora PostgreSQL instance (or RDS Query Editor)
-- ============================================================

-- Required extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── Fix companions model default ───────────────────────────────────────────
-- The old default 'openai/gpt-5.5' doesn't exist. Fix to gpt-4o.
ALTER TABLE companions
  ALTER COLUMN model SET DEFAULT 'openai/gpt-4o';

-- Backfill any rows that still have the bad default
UPDATE companions
SET model = 'openai/gpt-4o'
WHERE model = 'openai/gpt-5.5';

-- ─── message_count column (used by chat routes) ──────────────────────────────
ALTER TABLE companions
  ADD COLUMN IF NOT EXISTS message_count INT NOT NULL DEFAULT 0 CHECK (message_count >= 0);

-- ─── Companion skills ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS companion_skills (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  companion_id  UUID NOT NULL REFERENCES companions(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id)      ON DELETE CASCADE,
  skill_id      VARCHAR(120) NOT NULL,
  skill_name    VARCHAR(120) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (companion_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_companion_skills_companion ON companion_skills(companion_id);
CREATE INDEX IF NOT EXISTS idx_companion_skills_user      ON companion_skills(user_id);

-- ─── Orders ──────────────────────────────────────────────────────────────────
-- Replaces the Supabase 'orders' table — source of truth is Aurora.
CREATE TABLE IF NOT EXISTS orders (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  items              JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_cents        INT  NOT NULL DEFAULT 0 CHECK (total_cents >= 0),
  status             VARCHAR(20) NOT NULL DEFAULT 'completed'
                       CHECK (status IN ('pending', 'completed', 'refunded', 'failed')),
  stripe_session_id  VARCHAR(255) UNIQUE,   -- idempotency key
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_user       ON orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_stripe_sid ON orders(stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;

-- ─── Pending skills ──────────────────────────────────────────────────────────
-- Shop upgrades that have been paid for but not yet assigned to a companion.
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

-- ─── User milestones ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_milestones (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  milestone_id  VARCHAR(120) NOT NULL,
  xp_awarded    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, milestone_id)   -- idempotent completions
);

CREATE INDEX IF NOT EXISTS idx_user_milestones_user ON user_milestones(user_id);

-- ─── Atomic XP increment function ───────────────────────────────────────────
-- Replaces the read-modify-write pattern to avoid race conditions.
CREATE OR REPLACE FUNCTION increment_companion_xp(
  p_companion_id UUID,
  p_user_id      UUID,
  p_xp           INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_new_xp      INTEGER;
  v_new_level   INTEGER;
BEGIN
  UPDATE companions
  SET
    xp            = xp + p_xp,
    message_count = message_count + 1,
    level         = GREATEST(level, FLOOR((xp + p_xp) / 100)::INT + 1)
  WHERE id = p_companion_id AND user_id = p_user_id
  RETURNING xp, level
  INTO v_new_xp, v_new_level;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Companion % not found for user %', p_companion_id, p_user_id;
  END IF;

  RETURN json_build_object('xp', v_new_xp, 'level', v_new_level);
END;
$$;

-- ─── Row Level Security (recommended for Aurora Serverless v2) ───────────────
-- If you have RLS enabled, add policies. Skip if using IAM-only access.
-- ALTER TABLE companions        ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE conversations     ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE orders            ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE companion_skills  ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_milestones   ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE pending_skills    ENABLE ROW LEVEL SECURITY;
