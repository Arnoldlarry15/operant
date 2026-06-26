import { NextResponse } from 'next/server'
import { getCognitoUserFromAccessToken, getCognitoUserFromCookies, refreshCognitoSession, setAuthCookies } from '@/lib/cognito'
import { ensureUser } from '@/lib/queries'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll().map(c => c.name)
  console.log('[auth/me] cookies present:', allCookies)

  let user = await getCognitoUserFromCookies()
  console.log('[auth/me] user from cookies:', user ? user.email : 'null')

  let refreshedAuth = null

  if (!user) {
    console.log('[auth/me] no user from cookies, attempting refresh...')
    try {
      refreshedAuth = await refreshCognitoSession()
      console.log('[auth/me] refresh result:', refreshedAuth ? 'got tokens' : 'null')
    } catch (err) {
      console.error('[auth/me] refresh error:', err)
    }
    if (refreshedAuth?.AccessToken) {
      user = await getCognitoUserFromAccessToken(refreshedAuth.AccessToken)
      console.log('[auth/me] user from refresh:', user ? user.email : 'null')
    }
  }

  if (!user) {
    console.log('[auth/me] returning 401 - no user found')
    return NextResponse.json({ user: null, profile: null }, { status: 401 })
  }

  const profile = await ensureUser(user.email, user.name)
  const response = NextResponse.json({
    user,
    profile: {
      id: profile.id,
      display_name: profile.name,
    },
  })
  if (refreshedAuth) setAuthCookies(response, refreshedAuth)
  return response
}