-- ============================================================
-- Operant — Aurora PostgreSQL schema
-- Models: User, Companion, Conversation (messages), Purchase
-- ============================================================

-- Required for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------- Users ----------
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       VARCHAR(255) NOT NULL UNIQUE,
  name        VARCHAR(120),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Companions ----------
-- companion_type: 'free' is the bundled companion; others are paid tiers.
CREATE TABLE IF NOT EXISTS companions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name            VARCHAR(120) NOT NULL,
  companion_type  VARCHAR(20) NOT NULL DEFAULT 'custom'
                   CHECK (companion_type IN ('free', 'prebuilt', 'custom')),
  trait           TEXT NOT NULL DEFAULT '',
  persona         TEXT NOT NULL DEFAULT '',
  emoji           VARCHAR(16) NOT NULL DEFAULT '🤖',
  color           VARCHAR(16) NOT NULL DEFAULT '#6366f1',
  model           VARCHAR(60) NOT NULL DEFAULT 'openai/gpt-5.5',
  level           INT NOT NULL DEFAULT 1 CHECK (level >= 1),
  xp              INT NOT NULL DEFAULT 0 CHECK (xp >= 0),
  skills          JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_companions_user_id ON companions(user_id);
CREATE INDEX IF NOT EXISTS idx_companions_user_created ON companions(user_id, created_at DESC);

-- ---------- Conversations (message history) ----------
-- One row per message; grouped by companion_id (+ user_id for fast scoping).
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

-- ---------- Purchases ----------
CREATE TABLE IF NOT EXISTS purchases (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  companion_id  UUID REFERENCES companions(id) ON DELETE SET NULL,
  items         JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_cents   INT NOT NULL DEFAULT 0 CHECK (total_cents >= 0),
  status        VARCHAR(20) NOT NULL DEFAULT 'completed'
                 CHECK (status IN ('pending', 'completed', 'refunded', 'failed')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_purchases_user ON purchases(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchases_companion ON purchases(companion_id);

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
