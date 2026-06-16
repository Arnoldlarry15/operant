import 'server-only'
import Stripe from 'stripe'

let stripeClient: Stripe | null = null

export function getStripe(): Stripe {
  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }

  stripeClient ??= new Stripe(stripeKey, {
    apiVersion: '2026-05-27.dahlia',
  })

  return stripeClient
}
