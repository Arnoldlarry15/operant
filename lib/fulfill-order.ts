import 'server-only'
import { getStripe } from '@/lib/stripe'
import { ensureUser } from '@/lib/queries'
import { query, withTransaction } from '@/lib/db'
import type { PoolClient } from 'pg'
import type { CanonicalCheckoutCartItem } from '@/lib/checkout-types'
import type { CompanionRow } from '@/lib/types'
import { appearances, cores, personalities, prebuiltAIs, shopItems, skills as skillCatalog } from '@/lib/store-data'
import { DEFAULT_AGENT_MODEL } from '@/lib/agent-models'

export type FulfilledCompanion = {
  id: string
  name: string
  color: string
  emoji: string
  companion_type: string
}

export type FulfillResult =
  | { success: true; companions: FulfilledCompanion[]; alreadyFulfilled: boolean }
  | { success: false; error: string }

type FulfillOptions = {
  expectedUserId?: string
}

type AgentInput = {
  name: string
  companionType: 'prebuilt' | 'custom'
  trait: string
  persona: string
  emoji: string
  color: string
  model: string
  skills: string[]
}

type FulfillmentOrder = {
  id: string
  user_id: string
  items: CanonicalCheckoutCartItem[]
  total_cents: number
  status: string
  stripe_session_id: string | null
}

function skillIdForName(skillName: string): string {
  return skillCatalog.find((skill) => skill.name === skillName)?.id ??
    skillName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function agentInputForItem(item: CanonicalCheckoutCartItem): AgentInput | null {
  if (item.type === 'prebuilt') {
    const prebuiltId = item.companionMeta?.prebuilt_id ?? item.id.replace(/^prebuilt-/, '')
    const prebuilt = prebuiltAIs.find((ai) => ai.id === prebuiltId)
    if (!prebuilt) return null

    return {
      name: prebuilt.name,
      companionType: 'prebuilt',
      trait: prebuilt.tagline,
      persona: prebuilt.description,
      emoji: item.companionMeta?.emoji ?? 'AI',
      color: prebuilt.color,
      model: DEFAULT_AGENT_MODEL,
      skills: prebuilt.skills,
    }
  }

  if (item.type === 'custom' && item.companionMeta) {
    const meta = item.companionMeta
    const personality = personalities.find((p) => p.id === meta.personality_id)
    const core = cores.find((c) => c.id === meta.core_id)
    const appearance = appearances.find((a) => a.id === meta.appearance_id)
    if (!personality || !core || !appearance) return null

    const uniqueSkillIds = [...new Set(meta.skill_ids ?? [])]
    const selectedSkills = uniqueSkillIds.map((id) => skillCatalog.find((skill) => skill.id === id))
    if (selectedSkills.some((skill) => !skill)) return null

    return {
      name: item.name,
      companionType: 'custom',
      trait: meta.trait ?? personality.traits.join(', '),
      persona: [
        personality.description,
        `Core: ${core.name} (${core.label}) - ${core.description}`,
        `Appearance: ${appearance.label} - ${appearance.description}`,
      ].filter(Boolean).join('\n'),
      emoji: meta.emoji ?? 'AI',
      color: meta.color ?? personality.color ?? appearance.color,
      model: DEFAULT_AGENT_MODEL,
      skills: selectedSkills.map((skill) => skill?.name).filter((name): name is string => Boolean(name)),
    }
  }

  return null
}

function pendingSkillForItem(item: CanonicalCheckoutCartItem): { id: string; name: string } | null {
  if (item.type !== 'shop') return null

  const itemId = item.id.startsWith('shop-') ? item.id.slice(5) : item.id
  const shopItem = shopItems.find((shopItem) => shopItem.id === itemId)
  if (shopItem) return { id: shopItem.id, name: shopItem.name }

  const skill = skillCatalog.find((skill) => skill.id === itemId)
  if (skill) return { id: skill.id, name: skill.name }

  return null
}

async function listFulfilledAgentsForOrder(
  client: PoolClient,
  userId: string,
  orderId: string,
): Promise<FulfilledCompanion[]> {
  const { rows } = await client.query<CompanionRow>(
    `SELECT *
     FROM companions
     WHERE user_id = $1
       AND order_id = $2
       AND companion_type IN ('prebuilt', 'custom')
     ORDER BY created_at ASC`,
    [userId, orderId],
  )

  return rows.map((agent) => ({
    id: agent.id,
    name: agent.name,
    color: agent.color,
    emoji: agent.emoji,
    companion_type: agent.companion_type,
  }))
}

async function listFulfilledAgentsForStripeSession(
  userId: string,
  stripeSessionId: string,
): Promise<FulfilledCompanion[]> {
  const { rows } = await query<CompanionRow>(
    `SELECT companions.*
     FROM companions
     INNER JOIN orders ON orders.id = companions.order_id
     WHERE companions.user_id = $1
       AND orders.user_id = $1
       AND orders.stripe_session_id = $2
       AND orders.status = 'completed'
       AND companions.companion_type IN ('prebuilt', 'custom')
     ORDER BY companions.created_at ASC`,
    [userId, stripeSessionId],
  )

  return rows.map((agent) => ({
    id: agent.id,
    name: agent.name,
    color: agent.color,
    emoji: agent.emoji,
    companion_type: agent.companion_type,
  }))
}

async function writeFulfillmentTransaction(
  userId: string,
  fallbackItems: CanonicalCheckoutCartItem[],
  totalCents: number,
  stripeSessionId: string,
): Promise<{ companions: FulfilledCompanion[]; alreadyFulfilled: boolean }> {
  return withTransaction(async (client) => {
    const orderResult = await client.query<FulfillmentOrder>(
      `SELECT *
       FROM orders
       WHERE stripe_session_id = $1
       FOR UPDATE`,
      [stripeSessionId],
    )

    let order = orderResult.rows[0]
    if (order) {
      if (order.user_id !== userId) {
        throw new Error('Stripe session user does not match pending order')
      }
      if (order.status === 'completed') {
        const fulfilledAgents = await listFulfilledAgentsForOrder(client, userId, order.id)
        return { companions: fulfilledAgents, alreadyFulfilled: true }
      }
      if (order.status !== 'pending') {
        throw new Error(`Order cannot be fulfilled from status: ${order.status}`)
      }
      if (order.total_cents !== totalCents) {
        throw new Error('Paid amount does not match pending order total')
      }

      await client.query(
        `UPDATE orders
         SET status = 'completed',
             total_cents = $2
         WHERE id = $1`,
        [order.id, totalCents],
      )
    } else {
      if (!fallbackItems.length) {
        throw new Error('No pending Aurora order found for Stripe session')
      }
      const inserted = await client.query<FulfillmentOrder>(
        `INSERT INTO orders (user_id, items, total_cents, status, stripe_session_id)
         VALUES ($1, $2::jsonb, $3, 'completed', $4)
         RETURNING *`,
        [userId, JSON.stringify(fallbackItems), totalCents, stripeSessionId],
      )
      order = inserted.rows[0]
    }

    const items = order.items?.length ? order.items : fallbackItems

    const createdAgents: FulfilledCompanion[] = []

    for (const item of items) {
      if (item.type !== 'prebuilt' && item.type !== 'custom') continue
      const input = agentInputForItem(item)
      if (!input) {
        throw new Error(`Paid agent item could not be resolved from catalog: ${item.id}`)
      }

      const { rows } = await client.query<CompanionRow>(
        `INSERT INTO companions
           (user_id, order_id, name, companion_type, trait, persona, emoji, color, model, skills)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
         RETURNING *`,
        [
          userId,
          order.id,
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

      const agent = rows[0]
      for (const skillName of [...new Set(input.skills.map((skill) => skill.trim()).filter(Boolean))]) {
        await client.query(
          `INSERT INTO companion_skills (companion_id, user_id, skill_id, skill_name)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (companion_id, skill_id) DO NOTHING`,
          [agent.id, userId, skillIdForName(skillName), skillName],
        )
      }

      createdAgents.push({
        id: agent.id,
        name: agent.name,
        color: agent.color,
        emoji: agent.emoji,
        companion_type: agent.companion_type,
      })
    }

    for (const item of items) {
      if (item.type !== 'shop') continue
      const pendingSkill = pendingSkillForItem(item)
      if (!pendingSkill) {
        throw new Error(`Paid upgrade item could not be resolved from catalog: ${item.id}`)
      }

      await client.query(
        `INSERT INTO pending_skills (user_id, skill_id, skill_name, stripe_session_id)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT DO NOTHING`,
        [userId, pendingSkill.id, pendingSkill.name, stripeSessionId],
      )
    }

    return { companions: createdAgents, alreadyFulfilled: false }
  })
}

export async function fulfillCheckoutSession(
  sessionId: string,
  options: FulfillOptions = {},
): Promise<FulfillResult> {
  if (!process.env.STRIPE_SECRET_KEY) {
    return { success: false, error: 'STRIPE_SECRET_KEY is not configured' }
  }

  const stripe = getStripe()
  let session: Awaited<ReturnType<typeof stripe.checkout.sessions.retrieve>>
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['customer_details'],
    })
  } catch (err) {
    return { success: false, error: `Stripe retrieve failed: ${String(err)}` }
  }

  if (session.payment_status !== 'paid') {
    return { success: false, error: `Payment not completed (status: ${session.payment_status})` }
  }

  const userEmail = session.customer_details?.email ?? session.metadata?.user_email
  if (!session.metadata?.user_id || !userEmail) {
    return { success: false, error: 'Missing user_id or user_email in session metadata' }
  }

  let auroraUser: { id: string }
  try {
    auroraUser = await ensureUser(userEmail)
  } catch (err) {
    return { success: false, error: `Failed to resolve Aurora user: ${String(err)}` }
  }

  if (session.metadata.user_id !== auroraUser.id) {
    return { success: false, error: 'Stripe session metadata does not match Aurora user' }
  }

  if (options.expectedUserId && options.expectedUserId !== auroraUser.id) {
    return { success: false, error: 'Checkout session does not belong to the current user' }
  }

  let fallbackItems: CanonicalCheckoutCartItem[] = []
  try {
    fallbackItems = JSON.parse(session.metadata?.cart ?? '[]')
  } catch {
    fallbackItems = []
  }

  try {
    const result = await writeFulfillmentTransaction(
      auroraUser.id,
      fallbackItems,
      session.amount_total ?? 0,
      sessionId,
    )
    return { success: true, alreadyFulfilled: result.alreadyFulfilled, companions: result.companions }
  } catch (err) {
    const pgErr = err as { code?: string }
    if (pgErr?.code === '23505') {
      const companions = await listFulfilledAgentsForStripeSession(auroraUser.id, sessionId)
      return { success: true, alreadyFulfilled: true, companions }
    }
    return { success: false, error: `Fulfillment transaction failed: ${String(err)}` }
  }
}
