import { NextRequest } from 'next/server'
import { stripe } from '@/lib/stripe'
import { fulfillCheckoutSession } from '@/lib/fulfill-order'
import type Stripe from 'stripe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Stripe requires the raw body — Next.js must NOT parse it
export const preferredRegion = 'auto'

/**
 * POST /api/webhooks/stripe
 *
 * Handles Stripe webhook events. Register this URL in your Stripe dashboard:
 *   https://dashboard.stripe.com/webhooks
 *   → Add endpoint → https://yourdomain.com/api/webhooks/stripe
 *   → Select events: checkout.session.completed, payment_intent.payment_failed
 *
 * Set STRIPE_WEBHOOK_SECRET in your Vercel environment variables.
 * Get the secret from: Stripe Dashboard → Webhooks → your endpoint → Signing secret
 */
export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.error('[stripe-webhook] STRIPE_WEBHOOK_SECRET is not set')
    return new Response('Webhook secret not configured', { status: 500 })
  }

  // Read raw body — required for signature verification
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return new Response('Missing stripe-signature header', { status: 400 })
  }

  // Verify the event came from Stripe, not an attacker
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('[stripe-webhook] Signature verification failed:', err)
    return new Response(`Webhook signature verification failed: ${String(err)}`, { status: 400 })
  }

  console.log(`[stripe-webhook] Received event: ${event.type} (${event.id})`)

  // ── Handle events ──────────────────────────────────────────────────────────

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session

      // Only fulfill embedded checkout sessions (not payment links, subscriptions, etc.)
      if (session.ui_mode !== 'embedded') break

      console.log(`[stripe-webhook] Fulfilling session: ${session.id}`)
      const result = await fulfillCheckoutSession(session.id)

      if (!result.success) {
        console.error(`[stripe-webhook] Fulfillment failed for ${session.id}:`, result.error)
        // Return 500 so Stripe retries the webhook
        return new Response(`Fulfillment failed: ${result.error}`, { status: 500 })
      }

      if (result.alreadyFulfilled) {
        console.log(`[stripe-webhook] Session ${session.id} was already fulfilled — skipping`)
      } else {
        console.log(
          `[stripe-webhook] Session ${session.id} fulfilled. ` +
          `Created ${result.companions.length} companion(s): ` +
          result.companions.map((c) => c.name).join(', ')
        )
      }

      break
    }

    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      // Log failed payments for monitoring — nothing to undo since we only
      // create companions after payment succeeds
      console.warn(
        `[stripe-webhook] Payment failed: ${paymentIntent.id} — ` +
        `${paymentIntent.last_payment_error?.message ?? 'unknown reason'}`
      )
      break
    }

    case 'charge.dispute.created': {
      // A user has disputed a charge — flag the order for review
      const dispute = event.data.object as Stripe.Dispute
      console.warn(`[stripe-webhook] Dispute created: ${dispute.id} on charge ${dispute.charge}`)
      // TODO: notify your team via email/Slack and suspend the companion if needed
      break
    }

    default:
      // Ignore unhandled event types — return 200 so Stripe doesn't retry
      console.log(`[stripe-webhook] Unhandled event type: ${event.type}`)
  }

  // Always return 200 for handled events — anything else triggers Stripe retries
  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
