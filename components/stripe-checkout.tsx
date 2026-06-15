'use client'

import { useCallback, useState } from 'react'
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { Loader2, CheckCircle, ArrowRight, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { startCheckoutSession, fulfillOrder } from '@/lib/stripe-actions'
import { useAppState } from '@/lib/app-state'
import type { CheckoutCartItem } from '@/lib/actions'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

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
  const { clearCart } = useAppState()

  const fetchClientSecret = useCallback(
    () => startCheckoutSession(items),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(items)]
  )

  async function handleComplete(event: { complete: boolean; sessionId?: string }) {
    if (!event.complete || !event.sessionId) return
    setCompleting(true)
    try {
      const result = await fulfillOrder(event.sessionId)
      if ('error' in result) throw new Error(result.error)
      clearCart()
      onSuccess(result.companions ?? [])
    } catch {
      // fulfillOrder failed — still unblock UX; webhook will handle fulfillment
      clearCart()
      onSuccess([])
    } finally {
      setCompleting(false)
    }
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
          <p className="text-muted-foreground text-sm">Setting up your AI companion...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <EmbeddedCheckoutProvider
          stripe={stripePromise}
          options={{
            fetchClientSecret,
            onComplete: handleComplete as never,
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
              ? `${companions.length} companion${companions.length > 1 ? 's have' : ' has'} been added to your account.`
              : 'Your purchase has been recorded.'}
          </p>
        </div>

        {companions.length > 0 && (
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">Your New AI{companions.length > 1 ? 's' : ''}</p>
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
                  {c.emoji || '🤖'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-heading font-bold text-sm truncate" style={{ color: c.color }}>{c.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{c.companion_type} AI</p>
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
