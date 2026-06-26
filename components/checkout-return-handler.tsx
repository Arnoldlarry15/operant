'use client'

import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { fulfillOrder } from '@/lib/stripe-actions'

export function CheckoutReturnHandler() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const sessionId = searchParams.get('checkout_session_id')

  useEffect(() => {
    if (!sessionId) return

    async function handleReturn() {
      try {
        await fulfillOrder(sessionId as string)
      } catch (err) {
        console.error('Checkout return fulfillment failed:', err)
      }

      router.replace('/')
    }

    handleReturn()
  }, [sessionId, router])

  return null
}
