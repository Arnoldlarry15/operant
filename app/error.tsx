"use client"

import { useEffect } from 'react'
import { AlertTriangle, RotateCcw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[PageError]', error)
  }, [error])

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-8">
      <div className="max-w-sm w-full text-center flex flex-col items-center gap-5">
        <div className="size-12 rounded-2xl flex items-center justify-center"
          style={{ background: 'oklch(0.55 0.2 25 / 12%)', border: '1px solid oklch(0.55 0.2 25 / 25%)' }}>
          <AlertTriangle className="size-5" style={{ color: 'oklch(0.7 0.2 25)' }} />
        </div>

        <div>
          <h2 className="text-lg font-bold mb-1">Page failed to load</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Something went wrong on this page. Your agents and data are safe.
          </p>
        </div>

        {error.digest && (
          <code className="text-[10px] text-muted-foreground/50 bg-white/5 px-2 py-1 rounded">
            {error.digest}
          </code>
        )}

        <div className="flex gap-2">
          <Button
            onClick={reset}
            size="sm"
            className="gap-1.5 font-semibold"
            style={{ background: 'oklch(0.75 0.18 195)', color: '#000' }}
          >
            <RotateCcw className="size-3.5" />
            Retry
          </Button>
            <Link href="/">
              <Button variant="outline" size="sm">
                <Home className="size-3.5" />
                Home
              </Button>
            </Link>
        </div>
      </div>
    </div>
  )
}

