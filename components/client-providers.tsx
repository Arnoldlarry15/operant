'use client'

import { AuthProvider } from '@/components/auth-provider'
import { PostHogProvider } from '@/components/posthog-provider'

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <PostHogProvider>{children}</PostHogProvider>
    </AuthProvider>
  )
}
