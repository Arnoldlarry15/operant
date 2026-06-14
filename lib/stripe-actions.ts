'use server'

import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import type { CheckoutCartItem } from '@/lib/actions'
import { prebuiltAIs, personalities, cores, appearances, skills, shopItems } from '@/lib/store-data'

/**
 * Look up the canonical server-side price for a cart item by its id.
 * Returns null if the item id is unrecognised (should block checkout).
 */
function getCanonicalPrice(item: CheckoutCartItem): number | null {
  // Prebuilt companions — id matches prebuiltAIs[n].id
  const prebuilt = prebuiltAIs.find((p) => p.id === item.id || `prebuilt-${p.id}` === item.id)
  if (prebuilt) return prebuilt.price

  // Custom AI — id is `custom-<timestamp>`, price is sum of components
  if (item.type === 'custom' && item.companionMeta) {
    const meta = item.companionMeta
    const personalityPrice = personalities.find((p) => p.id === meta.personality_id)?.price ?? 0
    const corePrice = cores.find((c) => c.id === meta.core_id)?.price ?? 0
    const appearancePrice = appearances.find((a) => a.id === meta.appearance_id)?.price ?? 0
    return personalityPrice + corePrice + appearancePrice
  }

  // Shop items — id is `shop-<originalId>`
  const shopId = item.id.startsWith('shop-') ? item.id.slice(5) : item.id
  const shopItem = shopItems.find((s) => s.id === shopId)
  if (shopItem) return shopItem.isSale && shopItem.salePrice ? shopItem.salePrice : shopItem.price

  // Skill items from builder — id matches skills[n].id or `shop-<skillId>`
  const skillItem = skills.find((s) => s.id === shopId || s.id === item.id)
  if (skillItem) return skillItem.price

  return null
}

/**
 * Creates a Stripe Embedded Checkout session for the given cart.
 * Returns the client_secret needed by <EmbeddedCheckoutProvider>.
 * Prices are always validated server-side — never trusted from the client.
 */
export async function startCheckoutSession(items: CheckoutCartItem[]): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  if (!items.length) throw new Error('Cart is empty')

  const line_items: import('stripe').Stripe.Checkout.SessionCreateParams.LineItem[] = items.map((item) => {
    const canonicalPrice = getCanonicalPrice(item)
    if (canonicalPrice === null) {
      throw new Error(`Unknown item in cart: ${item.id}`)
    }
    return {
      quantity: 1,
      price_data: {
        currency: 'usd',
        unit_amount: Math.round(canonicalPrice * 100), // cents — always from server
        product_data: {
          name: item.name,
          description:
            item.type === 'prebuilt'
              ? 'Pre-built AI Companion'
              : item.type === 'custom'
              ? 'Custom AI Companion'
              : 'Operant Shop Upgrade',
        },
      },
    }
  })

  const session = await stripe.checkout.sessions.create({
    ui_mode: 'embedded',
    redirect_on_completion: 'never',
    mode: 'payment',
    line_items,
    metadata: {
      user_id: user.id,
      // Serialize cart so the webhook / completion handler can recreate companions
      cart: JSON.stringify(
        items.map((i) => ({
          id: i.id,
          name: i.name,
          price: i.price,
          type: i.type,
          companionMeta: i.companionMeta ?? null,
        }))
      ),
    },
  })

  if (!session.client_secret) throw new Error('Failed to create checkout session')
  return session.client_secret
}

/**
 * Called after Stripe confirms payment_intent.succeeded.
 * Creates companion rows and records the order in Supabase.
 */
export async function fulfillOrder(sessionId: string) {
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['payment_intent'],
  })

  if (session.payment_status !== 'paid') {
    return { error: 'Payment not completed' }
  }

  const supabase = await createClient()
  const userId = session.metadata?.user_id
  if (!userId) return { error: 'Missing user_id in session metadata' }

  // Idempotency guard — if this session was already fulfilled, return the
  // companions that were created on the first call instead of duplicating.
  const { data: existingOrder } = await supabase
    .from('orders')
    .select('id, companions:companions(id, name, color, emoji, companion_type)')
    .eq('stripe_session_id', sessionId)
    .maybeSingle()

  if (existingOrder) {
    const companions = (existingOrder.companions as { id: string; name: string; color: string; emoji: string; companion_type: string }[] | null) ?? []
    return { success: true, companions }
  }

  const items: CheckoutCartItem[] = JSON.parse(session.metadata?.cart ?? '[]')
  const totalCents = session.amount_total ?? 0

  // Create companion rows for companion-type purchases
  const createdCompanions: { id: string; name: string; color: string; emoji: string; companion_type: string }[] = []
  for (const item of items) {
    if ((item.type === 'prebuilt' || item.type === 'custom') && item.companionMeta) {
      const { data, error } = await supabase
        .from('companions')
        .insert({ user_id: userId, name: item.name, ...item.companionMeta })
        .select('id, name, color, emoji, companion_type')
        .single()
      if (!error && data) createdCompanions.push(data)
    }
  }

  // Record order as paid
  await supabase.from('orders').insert({
    user_id: userId,
    items: items.map((i) => ({ id: i.id, name: i.name, price: i.price, type: i.type })),
    total_cents: totalCents,
    status: 'completed',
    stripe_session_id: sessionId,
  })

  return { success: true, companions: createdCompanions }
}
