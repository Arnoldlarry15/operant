import 'server-only'
import { stripe } from '@/lib/stripe'
import { ensureUser, createCompanion, findOrderByStripeSession, insertOrder, insertPendingSkill } from '@/lib/queries'
import type { CheckoutCartItem } from '@/lib/actions'

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

/**
 * Core fulfillment logic — runs in webhook context (no user session cookie).
 * Uses the Aurora DB directly via lib/queries.ts.
 * Fully idempotent: safe to call multiple times for the same session.
 */
export async function fulfillCheckoutSession(sessionId: string): Promise<FulfillResult> {
  // 1. Retrieve and validate the Stripe session
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
  const userId = session.metadata?.user_id

  if (!userId || !userEmail) {
    return { success: false, error: 'Missing user_id or user_email in session metadata' }
  }

  // 2. Idempotency check — if already fulfilled, return early
  const existingOrder = await findOrderByStripeSession(sessionId)
  if (existingOrder) {
    return { success: true, alreadyFulfilled: true, companions: [] }
  }

  // 3. Ensure the Aurora user row exists (bridge from Supabase auth)
  let auroraUser: { id: string }
  try {
    auroraUser = await ensureUser(userEmail)
  } catch (err) {
    return { success: false, error: `Failed to resolve Aurora user: ${String(err)}` }
  }

  // Use the Aurora user id for all DB writes
  const dbUserId = auroraUser.id

  // 4. Parse cart from session metadata
  let items: CheckoutCartItem[] = []
  try {
    items = JSON.parse(session.metadata?.cart ?? '[]')
  } catch {
    return { success: false, error: 'Could not parse cart from session metadata' }
  }

  const totalCents = session.amount_total ?? 0

  // 5. Create companion rows for every companion-type item
  const createdCompanions: FulfilledCompanion[] = []
  for (const item of items) {
    if ((item.type === 'prebuilt' || item.type === 'custom') && item.companionMeta) {
      const meta = item.companionMeta
      try {
        const companion = await createCompanion(dbUserId, {
          name: item.name,
          companionType: meta.companion_type,
          trait: meta.trait ?? '',
          persona: '',
          emoji: meta.emoji ?? '🤖',
          color: meta.color ?? '#6366f1',
          model: 'openai/gpt-4o',
          skills: [],
        })
        createdCompanions.push({
          id: companion.id,
          name: companion.name,
          color: companion.color,
          emoji: companion.emoji,
          companion_type: companion.companion_type,
        })
      } catch (err) {
        console.error('[fulfillCheckoutSession] companion insert error:', err)
      }
    }
  }

  // 6. Store unassigned shop skill upgrades as pending
  for (const item of items) {
    if (item.type === 'shop') {
      try {
        await insertPendingSkill(dbUserId, item.id, item.name, sessionId)
      } catch (err) {
        console.error('[fulfillCheckoutSession] pending skill insert error:', err)
      }
    }
  }

  // 7. Record the order — this is the idempotency lock
  try {
    await insertOrder(dbUserId, {
      items: items.map((i) => ({ id: i.id, name: i.name, price: i.price, type: i.type })),
      totalCents,
      status: 'completed',
      stripeSessionId: sessionId,
    })
  } catch (err: unknown) {
    // Unique constraint violation = another process beat us to it (webhook + client race)
    const pgErr = err as { code?: string }
    if (pgErr?.code === '23505') {
      return { success: true, alreadyFulfilled: true, companions: createdCompanions }
    }
    return { success: false, error: `Order insert failed: ${String(err)}` }
  }

  return { success: true, alreadyFulfilled: false, companions: createdCompanions }
}
