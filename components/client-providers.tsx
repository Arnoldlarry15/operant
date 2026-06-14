'use client'

import dynamic from 'next/dynamic'

const AuthProvider = dynamic(
  () => import('@/components/auth-provider').then((m) => m.AuthProvider),
  { ssr: false },
)

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}
