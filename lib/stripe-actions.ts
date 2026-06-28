'use server'

import { getStripe } from '@/lib/stripe'
import { getCurrentUser } from '@/lib/auth'
import { query } from '@/lib/db'
import type { CanonicalCheckoutCartItem, CheckoutCartItem } from '@/lib/checkout-types'
import { prebuiltAIs, personalities, cores, appearances, skills, shopItems } from '@/lib/store-data'
import { DEFAULT_AGENT_MODEL } from '@/lib/agent-models'
import { captureServerError, captureServerEvent } from '@/lib/posthog'
import { z } from 'zod'

export type CheckoutSessionPayload = {
  clientSecret: string
  sessionId: string
}

const checkoutItemSchema = z.object({
  id: z.string().trim().min(1).max(120),
  name: z.string().trim().min(1).max(160),
  price: z.number().finite().nonnegative().max(100_000),
  type: z.enum(['prebuilt', 'custom', 'shop']),
  companionMeta: z.object({
    companion_type: z.enum(['prebuilt', 'custom']),
    personality_id: z.string().trim().max(120).optional(),
    core_id: z.string().trim().max(120).optional(),
    appearance_id: z.string().trim().max(120).optional(),
    prebuilt_id: z.string().trim().max(120).optional(),
    skill_ids: z.array(z.string().trim().max(120)).max(25).optional(),
    color: z.string().trim().max(32).optional(),
    emoji: z.string().trim().max(16).optional(),
    trait: z.string().trim().max(500).optional(),
  }).strict().optional(),
}).strict()

const checkoutCartSchema = z.array(checkoutItemSchema).min(1).max(25)

function canonicalizeCartItem(item: CheckoutCartItem): CanonicalCheckoutCartItem | null {
  if (item.type === 'prebuilt') {
    const prebuiltId = item.companionMeta?.prebuilt_id ?? item.id.replace(/^prebuilt-/, '')
    const prebuilt = prebuiltAIs.find((ai) => ai.id === prebuiltId)
    if (!prebuilt) return null

    return {
      id: prebuilt.id,
      name: prebuilt.name,
      price: prebuilt.price,
      type: 'prebuilt',
      companionMeta: {
        companion_type: 'prebuilt',
        prebuilt_id: prebuilt.id,
        color: prebuilt.color,
        emoji: 'AI',
        trait: prebuilt.tagline,
        model: DEFAULT_AGENT_MODEL,
      },
    }
  }

  if (item.type === 'custom' && item.companionMeta?.companion_type === 'custom') {
    const meta = item.companionMeta
    const personality = personalities.find((personality) => personality.id === meta.personality_id)
    const core = cores.find((core) => core.id === meta.core_id)
    const appearance = appearances.find((appearance) => appearance.id === meta.appearance_id)
    if (!personality || !core || !appearance) return null

    const uniqueSkillIds = [...new Set(meta.skill_ids ?? [])]
    const selectedSkills = uniqueSkillIds.map((id) => skills.find((skill) => skill.id === id))
    if (selectedSkills.some((skill) => !skill)) return null

    const skillPrice = selectedSkills.reduce((sum, skill) => sum + (skill?.price ?? 0), 0)

    return {
      id: item.id.startsWith('custom-') ? item.id : `custom-${Date.now()}`,
      name: item.name?.trim() || 'Custom AI Agent',
      price: personality.price + core.price + appearance.price + skillPrice,
      type: 'custom',
      companionMeta: {
        companion_type: 'custom',
        personality_id: personality.id,
        core_id: core.id,
        appearance_id: appearance.id,
        skill_ids: uniqueSkillIds,
        color: meta.color ?? personality.color ?? appearance.color,
        emoji: meta.emoji ?? 'AI',
        trait: meta.trait ?? personality.traits.join(', '),
        model: DEFAULT_AGENT_MODEL,
      },
    }
  }

  if (item.type === 'shop') {
    const shopId = item.id.startsWith('shop-') ? item.id.slice(5) : item.id
    const shopItem = shopItems.find((shopItem) => shopItem.id === shopId)
    if (shopItem) {
      return {
        id: `shop-${shopItem.id}`,
        name: shopItem.name,
        price: shopItem.isSale && shopItem.salePrice ? shopItem.salePrice : shopItem.price,
        type: 'shop',
      }
    }

    const skillItem = skills.find((skill) => skill.id === shopId)
    if (skillItem) {
      return {
        id: `shop-${skillItem.id}`,
        name: skillItem.name,
        price: skillItem.price,
        type: 'shop',
      }
    }
  }

  return null
}

/**
 * Creates a Stripe Embedded Checkout session for the given cart.
 * Returns the client_secret needed by <EmbeddedCheckoutProvider>.
 * Prices, names, item types, and agent metadata are rebuilt server-side.
 */
export async function startCheckoutSession(input: unknown): Promise<CheckoutSessionPayload> {
  try {
    const user = await getCurrentUser()
    if (!user) throw new Error('Not authenticated')

    const parsed = checkoutCartSchema.safeParse(input)
    if (!parsed.success) throw new Error('Invalid checkout cart')

    const items = parsed.data as CheckoutCartItem[]

    if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not configured')

    const stripe = getStripe()

    // Include both auth user id and email so the webhook can resolve the Aurora user row without a session cookie.
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL)?.replace(/\/$/, '')
    if (!appUrl) throw new Error('NEXT_PUBLIC_APP_URL is not configured')

    const orderItems: CanonicalCheckoutCartItem[] = []
    const line_items: import('stripe').Stripe.Checkout.SessionCreateParams.LineItem[] = items.map((item) => {
      const canonicalItem = canonicalizeCartItem(item)
      if (!canonicalItem) {
        throw new Error(`Unknown item in cart: ${item.id}`)
      }

      orderItems.push(canonicalItem)

      return {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(canonicalItem.price * 100),
          product_data: {
            name: canonicalItem.name,
            description:
              canonicalItem.type === 'prebuilt'
                ? 'Prebuilt AI Agent'
                : canonicalItem.type === 'custom'
                ? 'Custom AI Agent'
                : 'Operant Shop Upgrade',
          },
        },
      }
    })
    const totalCents = orderItems.reduce((sum, item) => sum + Math.round(item.price * 100), 0)

    const cartMetadata = JSON.stringify(orderItems).slice(0, 500)

    const session = await stripe.checkout.sessions.create({
      ui_mode: 'embedded_page',
      redirect_on_completion: 'if_required',
      return_url: `${appUrl}/?checkout_session_id={CHECKOUT_SESSION_ID}`,
      mode: 'payment',
      customer_email: user.email ?? undefined,
      line_items,
      metadata: {
        user_id: user.id,
        user_email: user.email ?? '',
        order_source: 'operant_embedded_checkout',
        cart: cartMetadata,
      },
    })

    if (!session.client_secret) throw new Error('Failed to create checkout session')

    try {
      await query(
        `INSERT INTO orders (user_id, items, total_cents, status, stripe_session_id)
         VALUES ($1, $2::jsonb, $3, 'pending', $4)
         ON CONFLICT (stripe_session_id) DO NOTHING`,
        [user.id, JSON.stringify(orderItems), totalCents, session.id],
      )
    } catch (err) {
      captureServerError(user.id, err, { action: 'start_checkout_session' })
      try {
        await stripe.checkout.sessions.expire(session.id)
      } catch (expireErr) {
        console.error('[stripe-checkout] Failed to expire orphaned checkout session', {
          sessionId: session.id,
          error: expireErr,
        })
      }
      throw new Error(`Failed to create pending Aurora order: ${String(err)}`)
    }

    captureServerEvent(user.id, 'checkout_session_created', {
      itemCount: orderItems.length,
      totalCents,
    })

    return { clientSecret: session.client_secret, sessionId: session.id }
  } catch (err) {
    console.error('[checkout] FAILED:', err)
    throw err
  }
}

/**
 * Client-side fallback called after embedded checkout completion.
 * The webhook is the primary fulfillment path; this is an idempotent safety net.
 */
export async function fulfillOrder(sessionId: string) {
  const user = await getCurrentUser()
  if (!user) return { error: 'Not authenticated' }

  const { fulfillCheckoutSession } = await import('@/lib/fulfill-order')
  const result = await fulfillCheckoutSession(sessionId, { expectedUserId: user.id })
  if (!result.success) return { error: result.error }
  captureServerEvent(user.id, 'checkout_fulfillment_confirmed', {
    companionCount: result.companions.length,
    upgradeCount: result.upgrades.length,
  })
  return { success: true, companions: result.companions, upgrades: result.upgrades }
}
