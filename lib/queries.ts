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
