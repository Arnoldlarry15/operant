import 'server-only'
import { query, withTransaction } from './db'
import type {
  CompanionRow,
  ConversationRow,
  MessageRole,
  UserRow,
} from './types'
import type { CheckoutCartItem } from './checkout-types'

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

/**
 * Ensure an Aurora `users` row exists for the given external identity
 * (e.g. a Supabase auth user). Returns the Aurora user id.
 */
export async function ensureUser(email: string, name?: string | null): Promise<UserRow> {
  const { rows } = await query<UserRow>(
    `INSERT INTO users (email, name)
     VALUES ($1, $2)
     ON CONFLICT (email) DO UPDATE SET name = COALESCE(EXCLUDED.name, users.name)
     RETURNING id, email, name, created_at, updated_at`,
    [email, name ?? null],
  )
  return rows[0]
}

// ---------------------------------------------------------------------------
// Companions
// ---------------------------------------------------------------------------

export async function listCompanions(userId: string): Promise<CompanionRow[]> {
  const { rows } = await query<CompanionRow>(
    `SELECT * FROM companions
     WHERE user_id = $1
       AND companion_type IN ('prebuilt', 'custom')
     ORDER BY created_at DESC`,
    [userId],
  )
  return rows
}

/** Fetch a single paid agent, scoped to its owner. Returns null if not found. */
export async function getCompanion(
  userId: string,
  companionId: string,
): Promise<CompanionRow | null> {
  const { rows } = await query<CompanionRow>(
    `SELECT * FROM companions
     WHERE id = $1
       AND user_id = $2
       AND companion_type IN ('prebuilt', 'custom')`,
    [companionId, userId],
  )
  const companion = rows[0]
  if (!companion) return null

  const installedSkills = await getCompanionSkills(userId, companionId)
  const rowSkills = Array.isArray(companion.skills) ? companion.skills : []
  companion.skills = [...new Set([...rowSkills, ...installedSkills.map((skill) => skill.skill_name)])]
  return companion
}

export async function addCompanionXP(
  userId: string,
  companionId: string,
  amount: number,
): Promise<CompanionRow | null> {
  // level = 1 + floor(xp / 100)
  const { rows } = await query<CompanionRow>(
    `UPDATE companions
       SET xp = xp + $3,
           message_count = message_count + 1,
           level = GREATEST(level, FLOOR((xp + $3) / 100)::INT + 1)
     WHERE id = $1
       AND user_id = $2
       AND companion_type IN ('prebuilt', 'custom')
     RETURNING *`,
    [companionId, userId, amount],
  )
  return rows[0] ?? null
}

// ---------------------------------------------------------------------------
// Conversations
// ---------------------------------------------------------------------------

export async function getConversation(
  userId: string,
  companionId: string,
  limit = 100,
): Promise<ConversationRow[]> {
  const { rows } = await query<ConversationRow>(
    `SELECT conversations.*
     FROM conversations
     INNER JOIN companions ON companions.id = conversations.companion_id
     WHERE conversations.companion_id = $1
       AND conversations.user_id = $2
       AND companions.user_id = $2
       AND companions.companion_type IN ('prebuilt', 'custom')
     ORDER BY created_at ASC
     LIMIT $3`,
    [companionId, userId, limit],
  )
  return rows
}

export async function countUserMessagesSince(
  userId: string,
  companionId: string,
  since: Date,
): Promise<number> {
  const { rows } = await query<{ count: string }>(
    `SELECT COUNT(*)::TEXT AS count
     FROM conversations
     INNER JOIN companions ON companions.id = conversations.companion_id
     WHERE conversations.companion_id = $1
       AND conversations.user_id = $2
       AND conversations.role = 'user'
       AND conversations.created_at >= $3
       AND companions.user_id = $2
       AND companions.companion_type IN ('prebuilt', 'custom')`,
    [companionId, userId, since.toISOString()],
  )
  return Number(rows[0]?.count ?? 0)
}

export async function saveMessage(
  userId: string,
  companionId: string,
  role: MessageRole,
  content: string,
): Promise<ConversationRow> {
  const { rows } = await query<ConversationRow>(
    `INSERT INTO conversations (companion_id, user_id, role, content)
     SELECT $1, $2, $3, $4
     WHERE EXISTS (
       SELECT 1
       FROM companions
       WHERE id = $1
         AND user_id = $2
         AND companion_type IN ('prebuilt', 'custom')
     )
     RETURNING *`,
    [companionId, userId, role, content],
  )
  if (!rows[0]) {
    throw new Error('Agent not found or access denied')
  }
  return rows[0]
}

// ---------------------------------------------------------------------------
// Companion skills
// ---------------------------------------------------------------------------

export async function getCompanionSkills(
  userId: string,
  companionId: string,
): Promise<{ skill_id: string; skill_name: string; created_at: string }[]> {
  const { rows } = await query<{ skill_id: string; skill_name: string; created_at: string }>(
    `SELECT skill_id, skill_name, created_at
     FROM companion_skills
     INNER JOIN companions ON companions.id = companion_skills.companion_id
     WHERE companion_skills.companion_id = $1
       AND companion_skills.user_id = $2
       AND companions.user_id = $2
       AND companions.companion_type IN ('prebuilt', 'custom')
     ORDER BY created_at ASC`,
    [companionId, userId],
  )
  return rows
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export type OrderRow = {
  id: string
  user_id: string
  items: CheckoutCartItem[]
  total_cents: number
  status: string
  stripe_session_id: string | null
  created_at: string
}

export async function listOrders(userId: string): Promise<OrderRow[]> {
  const { rows } = await query<OrderRow>(
    `SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId],
  )
  return rows
}

export async function updateOrderStatusByStripeSession(
  sessionId: string,
  status: 'pending' | 'completed' | 'refunded' | 'failed',
  options: { allowCompleted?: boolean } = {},
): Promise<OrderRow | null> {
  const { rows } = await query<OrderRow>(
    `UPDATE orders
        SET status = $2
      WHERE stripe_session_id = $1
        AND ($3::boolean OR status <> 'completed')
      RETURNING *`,
    [sessionId, status, Boolean(options.allowCompleted)],
  )
  return rows[0] ?? null
}

// ---------------------------------------------------------------------------
// Pending skills (shop upgrades not yet assigned to a companion)
// ---------------------------------------------------------------------------

export async function listPendingSkills(
  userId: string,
): Promise<{ id: string; skill_id: string; skill_name: string; created_at: string }[]> {
  const { rows } = await query<{ id: string; skill_id: string; skill_name: string; created_at: string }>(
    `SELECT id, skill_id, skill_name, created_at
     FROM pending_skills
     WHERE user_id = $1
     ORDER BY created_at ASC`,
    [userId],
  )
  return rows
}

export async function assignPendingSkillToCompanion(
  userId: string,
  pendingSkillId: string,
  companionId: string,
  expectedSkillId: string,
): Promise<{ skill_id: string; skill_name: string } | { error: string }> {
  return withTransaction(async (client) => {
    const pending = await client.query<{ skill_id: string; skill_name: string }>(
      `SELECT skill_id, skill_name
       FROM pending_skills
       WHERE id = $1
         AND user_id = $2
       FOR UPDATE`,
      [pendingSkillId, userId],
    )

    const pendingSkill = pending.rows[0]
    if (!pendingSkill) return { error: 'Pending upgrade not found' }
    if (pendingSkill.skill_id !== expectedSkillId) return { error: 'Pending upgrade mismatch' }

    const own = await client.query(
      `SELECT id
       FROM companions
       WHERE id = $1
         AND user_id = $2
         AND companion_type IN ('prebuilt', 'custom')`,
      [companionId, userId],
    )
    if (own.rows.length === 0) return { error: 'Agent not found or access denied' }

    const inserted = await client.query<{ skill_id: string; skill_name: string }>(
      `INSERT INTO companion_skills (companion_id, user_id, skill_id, skill_name)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (companion_id, skill_id) DO UPDATE
       SET skill_name = EXCLUDED.skill_name
       RETURNING skill_id, skill_name`,
      [companionId, userId, pendingSkill.skill_id, pendingSkill.skill_name],
    )

    await client.query(
      `UPDATE companions
         SET skills = (
           SELECT jsonb_agg(DISTINCT skill)
           FROM jsonb_array_elements_text(skills || $3::jsonb) AS skill
         )
       WHERE id = $1
         AND user_id = $2
         AND companion_type IN ('prebuilt', 'custom')`,
      [companionId, userId, JSON.stringify([pendingSkill.skill_name])],
    )

    await client.query(
      `DELETE FROM pending_skills
       WHERE id = $1
         AND user_id = $2`,
      [pendingSkillId, userId],
    )

    return inserted.rows[0]
  })
}
