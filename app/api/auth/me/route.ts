import { NextResponse } from 'next/server'
import { getCognitoUserFromAccessToken, getCognitoUserFromCookies, refreshCognitoSession, setAuthCookies } from '@/lib/cognito'
import { ensureUser } from '@/lib/queries'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  let user = await getCognitoUserFromCookies()

  let refreshedAuth = null

  if (!user) {
    try {
      refreshedAuth = await refreshCognitoSession()
    } catch (err) {
      console.error('[auth/me] refresh error:', err)
    }
    if (refreshedAuth?.AccessToken) {
      user = await getCognitoUserFromAccessToken(refreshedAuth.AccessToken)
    }
  }

  if (!user) {
    return NextResponse.json({ user: null, profile: null }, { status: 401 })
  }

  try {
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
  } catch (err) {
    console.error('[auth/me] ensureUser failed:', err)
    return NextResponse.json(
      {
        error: String(err),
      },
      { status: 500 }
    )
  }
}
