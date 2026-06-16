'use client'

import { useCallback, useRef, useState } from 'react'
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { AlertCircle, Loader2, CheckCircle, ArrowRight, Download, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { startCheckoutSession, fulfillOrder } from '@/lib/stripe-actions'
import { useAppState } from '@/lib/app-state'
import type { CheckoutCartItem } from '@/lib/checkout-types'

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null

type PurchasedCompanion = {
  id: string
  name: string
  color: string
  emoji: string
  companion_type: string
}

type Props = {
  items: CheckoutCartItem[]
  onSuccess: (companions: PurchasedCompanion[]) => void
  onCancel: () => void
}

export function StripeCheckout({ items, onSuccess, onCancel }: Props) {
  const [completing, setCompleting] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [fulfillmentError, setFulfillmentError] = useState<string | null>(null)
  const [checkoutAttempt, setCheckoutAttempt] = useState(0)
  const sessionIdRef = useRef<string | null>(null)
  const { clearCart } = useAppState()

  const fetchClientSecret = useCallback(
    async () => {
      setCheckoutError(null)
      try {
        const session = await startCheckoutSession(items)
        setSessionId(session.sessionId)
        sessionIdRef.current = session.sessionId
        return session.clientSecret
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Checkout could not be started.'
        setCheckoutError(message)
        throw err
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(items), checkoutAttempt]
  )

  const handleComplete = useCallback(async () => {
    setCompleting(true)
    setFulfillmentError(null)
    try {
      const completedSessionId = sessionIdRef.current ?? sessionId
      if (!completedSessionId) {
        throw new Error('Missing checkout session id. Please retry finalizing from this screen.')
      }

      const result = await fulfillOrder(completedSessionId)
      if (!result?.success) {
        throw new Error(result?.error ?? 'Payment succeeded, but agent provisioning did not finish.')
      }

      const companions = result?.success ? result.companions : []
      clearCart()
      onSuccess(companions)
    } catch (err) {
      setFulfillmentError(err instanceof Error ? err.message : 'Payment succeeded, but fulfillment failed.')
    } finally {
      setCompleting(false)
    }
  }, [clearCart, onSuccess, sessionId])

  if (!stripePublishableKey) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-4 py-12">
        <div className="flex flex-col gap-1">
          <p className="font-heading font-bold text-xl">Checkout is not configured</p>
          <p className="text-muted-foreground text-sm">
            Add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY before accepting payments.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Back to cart
        </Button>
      </div>
    )
  }

  if (completing) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center px-4 py-12">
        <div
          className="size-20 rounded-full flex items-center justify-center"
          style={{ background: 'oklch(0.75 0.18 195 / 15%)', border: '2px solid oklch(0.75 0.18 195 / 30%)' }}
        >
          <Loader2 className="size-9 animate-spin" style={{ color: 'oklch(0.75 0.18 195)' }} />
        </div>
        <div className="flex flex-col gap-1">
          <p className="font-heading font-bold text-xl">Finalizing your order</p>
          <p className="text-muted-foreground text-sm">Setting up your AI agent...</p>
        </div>
      </div>
    )
  }

  if (fulfillmentError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center px-4 py-12">
        <div
          className="size-20 rounded-full flex items-center justify-center"
          style={{ background: 'oklch(0.72 0.18 35 / 15%)', border: '2px solid oklch(0.72 0.18 35 / 30%)' }}
        >
          <AlertCircle className="size-9" style={{ color: 'oklch(0.72 0.18 35)' }} />
        </div>
        <div className="flex flex-col gap-2 max-w-sm">
          <p className="font-heading font-bold text-xl">Payment received, setup needs a retry</p>
          <p className="text-muted-foreground text-sm">{fulfillmentError}</p>
        </div>
        <div className="flex flex-col gap-2 w-full max-w-xs">
          <Button className="w-full font-semibold" onClick={handleComplete}>
            <RefreshCw className="size-4" data-icon="inline-start" />
            Retry setup
          </Button>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Back to cart
          </Button>
        </div>
      </div>
    )
  }

  if (checkoutError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center px-4 py-12">
        <div
          className="size-20 rounded-full flex items-center justify-center"
          style={{ background: 'oklch(0.72 0.18 35 / 15%)', border: '2px solid oklch(0.72 0.18 35 / 30%)' }}
        >
          <AlertCircle className="size-9" style={{ color: 'oklch(0.72 0.18 35)' }} />
        </div>
        <div className="flex flex-col gap-2 max-w-sm">
          <p className="font-heading font-bold text-xl">Checkout is unavailable</p>
          <p className="text-muted-foreground text-sm">{checkoutError}</p>
        </div>
        <div className="flex flex-col gap-2 w-full max-w-xs">
          <Button
            className="w-full font-semibold"
            onClick={() => {
              setCheckoutError(null)
              setCheckoutAttempt((attempt) => attempt + 1)
            }}
          >
            <RefreshCw className="size-4" data-icon="inline-start" />
            Retry checkout
          </Button>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Back to cart
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <EmbeddedCheckoutProvider
          key={checkoutAttempt}
          stripe={stripePromise}
          options={{
            fetchClientSecret,
            onComplete: handleComplete,
          }}
        >
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      </div>
      <div className="pt-3 border-t border-border">
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-muted-foreground text-xs"
          onClick={onCancel}
        >
          Back to cart
        </Button>
      </div>
    </div>
  )
}

type SuccessProps = {
  companions: PurchasedCompanion[]
  onGoToDashboard: () => void
  onKeepShopping: () => void
  onGoToCompanion: (id: string) => void
}

export function CheckoutSuccess({ companions, onGoToDashboard, onKeepShopping, onGoToCompanion }: SuccessProps) {
  return (
    <>
      <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-4">
        <div
          className="p-4 rounded-2xl flex flex-col gap-1 text-center"
          style={{ background: 'oklch(0.75 0.18 195 / 10%)', border: '1px solid oklch(0.75 0.18 195 / 25%)' }}
        >
          <CheckCircle className="size-8 mx-auto mb-1" style={{ color: 'oklch(0.75 0.18 195)' }} />
          <p className="font-heading font-bold text-base" style={{ color: 'oklch(0.82 0.2 195)' }}>
            Payment confirmed!
          </p>
          <p className="text-xs text-muted-foreground">
            {companions.length > 0
              ? `${companions.length} agent${companions.length > 1 ? 's have' : ' has'} been added to your account.`
              : 'Your purchase is recorded. Open your dashboard to see fulfilled agents and upgrades.'}
          </p>
        </div>

        {companions.length > 0 && (
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">Your New Agent{companions.length > 1 ? 's' : ''}</p>
            {companions.map((c) => (
              <div
                key={c.id}
                className="p-4 rounded-2xl flex items-center gap-3 card-glass"
                style={{ border: `1px solid ${c.color}25` }}
              >
                <div
                  className="size-12 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
                  style={{ background: `${c.color}15`, border: `1px solid ${c.color}30` }}
                >
                  {c.emoji || 'AI'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-heading font-bold text-sm truncate" style={{ color: c.color }}>{c.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{c.companion_type} agent</p>
                </div>
                <Button
                  size="sm"
                  className="flex-shrink-0 font-semibold text-xs"
                  style={{ background: c.color, color: '#000' }}
                  onClick={() => onGoToCompanion(c.id)}
                >
                  <Download className="size-3.5" data-icon="inline-start" />
                  Open
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pt-4 flex flex-col gap-2 border-t border-border">
        <Button
          className="w-full font-semibold"
          style={{ background: 'oklch(0.75 0.18 195)', color: '#000' }}
          onClick={onGoToDashboard}
        >
          <ArrowRight className="size-4" data-icon="inline-start" />
          Go to My Dashboard
        </Button>
        <Button variant="ghost" size="sm" className="w-full text-muted-foreground text-xs" onClick={onKeepShopping}>
          Keep Shopping
        </Button>
      </div>
    </>
  )
}

