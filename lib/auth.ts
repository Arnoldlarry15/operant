import { createClient } from './supabase/server'
import { ensureUser } from './queries'
import type { UserRow } from './types'

/**
 * Resolves the currently authenticated user (via Supabase Auth) and ensures a
 * matching row exists in the Aurora `users` table. Returns null if there is no
 * authenticated session.
 *
 * This is the single bridge between Supabase (auth) and Aurora (data). Every
 * Aurora query is scoped to the returned `id`.
 */
export async function getCurrentUser(): Promise<UserRow | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) return null

  const name =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    null

  return ensureUser(user.email, name)
}
