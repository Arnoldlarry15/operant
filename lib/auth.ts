import { getCognitoUserFromCookies } from './cognito'
import { ensureUser } from './queries'
import type { UserRow } from './types'

console.log('COGNITO POOL ID:', process.env.COGNITO_USER_POOL_ID)
console.log('COGNITO CLIENT ID:', process.env.COGNITO_USER_POOL_CLIENT_ID)
/**
 * Resolves the currently authenticated user (via AWS Cognito) and ensures a
 * matching row exists in the Aurora `users` table. Returns null if there is no
 * authenticated session.
 *
 * This is the single bridge between Cognito (auth) and Aurora (data). Every
 * Aurora query is scoped to the returned `id`.
 */
export async function getCurrentUser(): Promise<UserRow | null> {
  const user = await getCognitoUserFromCookies()

  if (!user?.email) return null

  return ensureUser(user.email, user.name)
}
