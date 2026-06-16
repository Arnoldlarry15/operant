import { NextRequest } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { fulfillCheckoutSession } from '@/lib/fulfill-order'
import { updateOrderStatusByStripeSession } from '@/lib/queries'
import type Stripe from 'stripe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const preferredRegion = 'auto'

async function fulfillPaidCheckoutSession(session: Stripe.Checkout.Session): Promise<Response | null> {
  if (session.payment_status !== 'paid') {
    console.log(
      `[stripe-webhook] Checkout session ${session.id} is ${session.payment_status}; waiting for paid confirmation.`,
    )
    return null
  }

  console.log(`[stripe-webhook] Fulfilling session: ${session.id}`)
  const result = await fulfillCheckoutSession(session.id)

  if (!result.success) {
    if (result.error.startsWith('Payment not completed')) {
      console.log(`[stripe-webhook] Session ${session.id} is not paid yet; waiting for a later Stripe event.`)
      return null
    }

    console.error(`[stripe-webhook] Fulfillment failed for ${session.id}:`, result.error)
    return new Response(`Fulfillment failed: ${result.error}`, { status: 500 })
  }

  if (result.alreadyFulfilled) {
    console.log(`[stripe-webhook] Session ${session.id} was already fulfilled; skipping`)
  } else {
    console.log(
      `[stripe-webhook] Session ${session.id} fulfilled. ` +
      `Created ${result.companions.length} agent(s): ` +
      result.companions.map((agent) => agent.name).join(', '),
    )
  }

  return null
}

async function markRefundedOrderFromCharge(charge: Stripe.Charge): Promise<void> {
  const paymentIntent =
    typeof charge.payment_intent === 'string'
      ? charge.payment_intent
      : charge.payment_intent?.id

  if (!paymentIntent) {
    console.warn(`[stripe-webhook] Refunded charge ${charge.id} has no payment intent; order status not updated.`)
    return
  }

  const stripe = getStripe()
  const sessions = await stripe.checkout.sessions.list({
    payment_intent: paymentIntent,
    limit: 1,
  })
  const session = sessions.data[0]

  if (!session) {
    console.warn(`[stripe-webhook] No checkout session found for refunded payment intent: ${paymentIntent}`)
    return
  }

  await updateOrderStatusByStripeSession(session.id, 'refunded', { allowCompleted: true })
  console.warn(`[stripe-webhook] Marked checkout session ${session.id} refunded from charge ${charge.id}`)
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.error('[stripe-webhook] STRIPE_WEBHOOK_SECRET is not set')
    return new Response('Webhook secret not configured', { status: 500 })
  }

  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return new Response('Missing stripe-signature header', { status: 400 })
  }

  let event: Stripe.Event
  try {
    const stripe = getStripe()
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('[stripe-webhook] Signature verification failed:', err)
    return new Response(`Webhook signature verification failed: ${String(err)}`, { status: 400 })
  }

  console.log(`[stripe-webhook] Received event: ${event.type} (${event.id})`)

  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded': {
      const response = await fulfillPaidCheckoutSession(event.data.object as Stripe.Checkout.Session)
      if (response) return response
      break
    }

    case 'checkout.session.async_payment_failed': {
      const session = event.data.object as Stripe.Checkout.Session
      await updateOrderStatusByStripeSession(session.id, 'failed')
      console.warn(`[stripe-webhook] Async payment failed for checkout session: ${session.id}`)
      break
    }

    case 'checkout.session.expired': {
      const session = event.data.object as Stripe.Checkout.Session
      await updateOrderStatusByStripeSession(session.id, 'failed')
      console.warn(`[stripe-webhook] Checkout session expired: ${session.id}`)
      break
    }

    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      console.warn(
        `[stripe-webhook] Payment failed: ${paymentIntent.id} - ` +
        `${paymentIntent.last_payment_error?.message ?? 'unknown reason'}`,
      )
      break
    }

    case 'charge.refunded': {
      await markRefundedOrderFromCharge(event.data.object as Stripe.Charge)
      break
    }

    case 'charge.dispute.created': {
      const dispute = event.data.object as Stripe.Dispute
      console.warn(`[stripe-webhook] Dispute created: ${dispute.id} on charge ${dispute.charge}`)
      break
    }

    default:
      console.log(`[stripe-webhook] Unhandled event type: ${event.type}`)
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
