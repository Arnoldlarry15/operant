import { query, withTransaction } from './db'
import type {
  CompanionRow,
  ConversationRow,
  CreateCompanionInput,
  MessageRole,
  PurchaseRow,
  UserRow,
} from './types'

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

export async function createCompanion(
  userId: string,
  input: CreateCompanionInput,
): Promise<CompanionRow> {
  const { rows } = await query<CompanionRow>(
    `INSERT INTO companions
       (user_id, name, companion_type, trait, persona, emoji, color, model, skills)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
     RETURNING *`,
    [
      userId,
      input.name,
      input.companionType,
      input.trait,
      input.persona,
      input.emoji,
      input.color,
      input.model,
      JSON.stringify(input.skills),
    ],
  )
  return rows[0]
}

export async function listCompanions(userId: string): Promise<CompanionRow[]> {
  const { rows } = await query<CompanionRow>(
    `SELECT * FROM companions WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId],
  )
  return rows
}

/** Fetch a single companion, scoped to its owner. Returns null if not found. */
export async function getCompanion(
  userId: string,
  companionId: string,
): Promise<CompanionRow | null> {
  const { rows } = await query<CompanionRow>(
    `SELECT * FROM companions WHERE id = $1 AND user_id = $2`,
    [companionId, userId],
  )
  return rows[0] ?? null
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
           level = 1 + ((xp + $3) / 100)
     WHERE id = $1 AND user_id = $2
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
    `SELECT * FROM conversations
     WHERE companion_id = $1 AND user_id = $2
     ORDER BY created_at ASC
     LIMIT $3`,
    [companionId, userId, limit],
  )
  return rows
}

export async function saveMessage(
  userId: string,
  companionId: string,
  role: MessageRole,
  content: string,
): Promise<ConversationRow> {
  const { rows } = await query<ConversationRow>(
    `INSERT INTO conversations (companion_id, user_id, role, content)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [companionId, userId, role, content],
  )
  return rows[0]
}

// ---------------------------------------------------------------------------
// Purchases
// ---------------------------------------------------------------------------

export async function recordPurchase(
  userId: string,
  args: {
    companionId?: string | null
    items: PurchaseRow['items']
    totalCents: number
    status?: PurchaseRow['status']
  },
): Promise<PurchaseRow> {
  return withTransaction(async (client) => {
    const res = await client.query(
      `INSERT INTO purchases (user_id, companion_id, items, total_cents, status)
       VALUES ($1, $2, $3::jsonb, $4, $5)
       RETURNING *`,
      [
        userId,
        args.companionId ?? null,
        JSON.stringify(args.items),
        args.totalCents,
        args.status ?? 'completed',
      ],
    )
    return res.rows[0] as PurchaseRow
  })
}

// ---------------------------------------------------------------------------
// Free companion (one per user)
// ---------------------------------------------------------------------------

export async function createFreeCompanion(
  userId: string,
  input: { name: string; color: string; emoji: string; trait: string },
): Promise<{ data?: CompanionRow; error?: string }> {
  // One free companion per user
  const existing = await query<CompanionRow>(
    `SELECT id FROM companions WHERE user_id = $1 AND companion_type = 'free' LIMIT 1`,
    [userId],
  )
  if (existing.rows.length > 0) return { data: existing.rows[0] }

  const { rows } = await query<CompanionRow>(
    `INSERT INTO companions (user_id, name, companion_type, trait, emoji, color, model)
     VALUES ($1, $2, 'free', $3, $4, $5, 'openai/gpt-4o-mini')
     RETURNING *`,
    [userId, input.name, input.trait, input.emoji, input.color],
  )
  return { data: rows[0] }
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
     WHERE companion_id = $1 AND user_id = $2
     ORDER BY created_at ASC`,
    [companionId, userId],
  )
  return rows
}

export async function installCompanionSkill(
  userId: string,
  companionId: string,
  skillId: string,
  skillName: string,
): Promise<{ skill_id: string; skill_name: string } | { error: string }> {
  // Ownership check
  const own = await query(
    `SELECT id FROM companions WHERE id = $1 AND user_id = $2`,
    [companionId, userId],
  )
  if (own.rows.length === 0) return { error: 'Companion not found or access denied' }

  // Duplicate check
  const dup = await query(
    `SELECT skill_id FROM companion_skills WHERE companion_id = $1 AND skill_id = $2`,
    [companionId, skillId],
  )
  if (dup.rows.length > 0) return { error: 'Skill already installed' }

  const { rows } = await query<{ skill_id: string; skill_name: string }>(
    `INSERT INTO companion_skills (companion_id, user_id, skill_id, skill_name)
     VALUES ($1, $2, $3, $4)
     RETURNING skill_id, skill_name`,
    [companionId, userId, skillId, skillName],
  )
  return rows[0]
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export type OrderRow = {
  id: string
  user_id: string
  items: { id: string; name: string; price: number; type: string }[]
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

export async function findOrderByStripeSession(sessionId: string): Promise<OrderRow | null> {
  const { rows } = await query<OrderRow>(
    `SELECT * FROM orders WHERE stripe_session_id = $1 LIMIT 1`,
    [sessionId],
  )
  return rows[0] ?? null
}

export async function insertOrder(
  userId: string,
  args: {
    items: { id: string; name: string; price: number; type: string }[]
    totalCents: number
    status: string
    stripeSessionId?: string | null
  },
): Promise<OrderRow> {
  const { rows } = await query<OrderRow>(
    `INSERT INTO orders (user_id, items, total_cents, status, stripe_session_id)
     VALUES ($1, $2::jsonb, $3, $4, $5)
     RETURNING *`,
    [
      userId,
      JSON.stringify(args.items),
      args.totalCents,
      args.status,
      args.stripeSessionId ?? null,
    ],
  )
  return rows[0]
}

// ---------------------------------------------------------------------------
// Milestones
// ---------------------------------------------------------------------------

export async function completeMilestone(
  userId: string,
  milestoneId: string,
  xpAwarded: number,
): Promise<{ data?: { milestone_id: string }; error?: string }> {
  try {
    const { rows } = await query<{ milestone_id: string }>(
      `INSERT INTO user_milestones (user_id, milestone_id, xp_awarded)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, milestone_id) DO NOTHING
       RETURNING milestone_id`,
      [userId, milestoneId, xpAwarded],
    )
    return { data: rows[0] ?? { milestone_id: milestoneId } }
  } catch (err) {
    return { error: String(err) }
  }
}

export async function getMilestones(userId: string): Promise<string[]> {
  const { rows } = await query<{ milestone_id: string }>(
    `SELECT milestone_id FROM user_milestones WHERE user_id = $1`,
    [userId],
  )
  return rows.map((r) => r.milestone_id)
}

// ---------------------------------------------------------------------------
// Pending skills (shop upgrades not yet assigned to a companion)
// ---------------------------------------------------------------------------

export async function insertPendingSkill(
  userId: string,
  skillId: string,
  skillName: string,
  stripeSessionId: string,
): Promise<void> {
  await query(
    `INSERT INTO pending_skills (user_id, skill_id, skill_name, stripe_session_id)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT DO NOTHING`,
    [userId, skillId, skillName, stripeSessionId],
  )
}

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
