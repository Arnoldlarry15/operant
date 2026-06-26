"use client"

export const dynamic = 'force-dynamic'

import { useState, Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { OperantLogo } from '@/components/operant-logo'
import { toast } from 'sonner'

function ConfirmForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email') ?? ''
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const response = await fetch('/api/auth/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    })

    setLoading(false)
    if (!response.ok) {
      const data = await response.json().catch(() => null)
      setError(data?.error ?? 'Could not confirm account. Check your code and try again.')
      return
    }

    toast.success('Email confirmed! You can now sign in.')
    router.push('/auth/login?confirmed=true')
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <OperantLogo size={40} className="shadow-lg shadow-primary/30" />
            <span className="text-2xl font-bold font-sans tracking-tight text-foreground">Operant</span>
          </Link>
          <p className="text-muted-foreground mt-2 text-sm">Your AI agent platform</p>
        </div>

        <Card className="border-border/50 bg-card shadow-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold">Confirm your email</CardTitle>
            <CardDescription>
              We sent a 6-digit code to {email || 'your email'}. Enter it below to activate your account.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleConfirm}>
            <CardContent className="flex flex-col gap-4">
              {error && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              <div className="flex flex-col gap-2">
                <Label htmlFor="code">Confirmation code</Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  maxLength={6}
                  autoComplete="one-time-code"
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3 pt-2">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Confirming...' : 'Confirm Account'}
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                Didn't get the code?{' '}
                <Link href="/auth/sign-up" className="text-primary font-medium hover:underline">
                  Try signing up again
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}

export default function ConfirmPage() {
  return (
    <Suspense>
      <ConfirmForm />
    </Suspense>
  )
}
