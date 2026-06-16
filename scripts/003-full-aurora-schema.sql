-- ============================================================
-- Migration 003: Production Aurora schema hardening
-- Supabase handles auth only. Application data lives in Aurora.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Existing deployments may have historical no-cost bot rows. The product no
-- longer exposes or services those rows, so preserve them in an archive table
-- before enforcing paid-agent types on the active table.
CREATE TABLE IF NOT EXISTS archived_free_agents (
  id           UUID PRIMARY KEY,
  user_id      UUID NOT NULL,
  payload      JSONB NOT NULL,
  archived_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO archived_free_agents (id, user_id, payload)
SELECT id, user_id, to_jsonb(companions)
FROM companions
WHERE companion_type = 'free'
ON CONFLICT (id) DO NOTHING;

DELETE FROM companions
WHERE companion_type = 'free';

ALTER TABLE companions
  ALTER COLUMN model SET DEFAULT 'openai/gpt-5.4';

UPDATE companions
SET model = 'openai/gpt-5.4'
WHERE model IN ('openai/gpt-4o', 'openai/gpt-4o-mini', 'openai/gpt-5.5');

ALTER TABLE companions
  ADD COLUMN IF NOT EXISTS message_count INT NOT NULL DEFAULT 0 CHECK (message_count >= 0);

ALTER TABLE companions
  DROP CONSTRAINT IF EXISTS companions_companion_type_check;

ALTER TABLE companions
  ADD CONSTRAINT companions_companion_type_check
  CHECK (companion_type IN ('prebuilt', 'custom'));

CREATE TABLE IF NOT EXISTS companion_skills (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  companion_id  UUID NOT NULL REFERENCES companions(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_id      VARCHAR(120) NOT NULL,
  skill_name    VARCHAR(120) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (companion_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_companion_skills_companion ON companion_skills(companion_id);
CREATE INDEX IF NOT EXISTS idx_companion_skills_user ON companion_skills(user_id);

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

ALTER TABLE orders
  ALTER COLUMN status SET DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_stripe_sid ON orders(stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;

ALTER TABLE companions
  ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_companions_order_id ON companions(order_id)
  WHERE order_id IS NOT NULL;

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

CREATE TABLE IF NOT EXISTS user_milestones (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  milestone_id  VARCHAR(120) NOT NULL,
  xp_awarded    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, milestone_id)
);

CREATE INDEX IF NOT EXISTS idx_user_milestones_user ON user_milestones(user_id);

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
    xp = xp + p_xp,
    message_count = message_count + 1,
    level = GREATEST(level, FLOOR((xp + p_xp) / 100)::INT + 1)
  WHERE id = p_companion_id
    AND user_id = p_user_id
    AND companion_type IN ('prebuilt', 'custom')
  RETURNING xp, level
  INTO v_new_xp, v_new_level;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Agent % not found for user %', p_companion_id, p_user_id;
  END IF;

  RETURN json_build_object('xp', v_new_xp, 'level', v_new_level);
END;
$$;
