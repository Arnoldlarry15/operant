import { NextRequest } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { fulfillCheckoutSession } from '@/lib/fulfill-order'
import { updateOrderStatusByStripeSession } from '@/lib/queries'
import { captureServerEvent } from '@/lib/posthog'
import type Stripe from 'stripe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const preferredRegion = 'auto'

async function fulfillPaidCheckoutSession(session: Stripe.Checkout.Session): Promise<Response | null> {
  if (session.payment_status !== 'paid') {
    return null
  }

  const result = await fulfillCheckoutSession(session.id)

  if (!result.success) {
    if (result.error.startsWith('Payment not completed')) {
      return null
    }

    console.error(`[stripe-webhook] Fulfillment failed for ${session.id}:`, result.error)
    return new Response(`Fulfillment failed: ${result.error}`, { status: 500 })
  }

  return null
}

async function markRefundedOrderFromCharge(charge: Stripe.Charge): Promise<void> {
  const paymentIntent =
    typeof charge.payment_intent === 'string'
      ? charge.payment_intent
      : charge.payment_intent?.id

  if (!paymentIntent) {
    return
  }

  const stripe = getStripe()
  const sessions = await stripe.checkout.sessions.list({
    payment_intent: paymentIntent,
    limit: 1,
  })
  const session = sessions.data[0]

  if (!session) {
    return
  }

  await updateOrderStatusByStripeSession(session.id, 'refunded', { allowCompleted: true })
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

  captureServerEvent('stripe-webhook', 'stripe_webhook_received', { type: event.type })

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
      break
    }

    case 'checkout.session.expired': {
      const session = event.data.object as Stripe.Checkout.Session
      await updateOrderStatusByStripeSession(session.id, 'failed')
      break
    }

    case 'payment_intent.payment_failed': {
      break
    }

    case 'charge.refunded': {
      await markRefundedOrderFromCharge(event.data.object as Stripe.Charge)
      break
    }

    case 'charge.dispute.created': {
      break
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
