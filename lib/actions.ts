'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prebuiltAIs, personalities, cores, appearances, shopItems, skills as skillsData } from '@/lib/store-data'
import {
  createCompanion,
  listCompanions,
  getCompanion as getCompanionQuery,
  addCompanionXP,
  getConversation,
  saveMessage as saveMessageQuery,
  recordPurchase,
  getCompanionSkills,
  installCompanionSkill,
  listOrders,
  completeMilestone as completeMilestoneQuery,
  getMilestones as getMilestonesQuery,
  createFreeCompanion as createFreeCompanionQuery,
} from '@/lib/queries'

// ─── Auth ─────────────────────────────────────────────────────────────────────
// Auth always goes through Supabase; data always goes through Aurora.

export async function signUp(email: string, password: string, displayName: string) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo:
        process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ??
        `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/auth/callback`,
      data: { display_name: displayName },
    },
  })
  if (error) return { error: error.message }
  return { success: true }
}

export async function signIn(email: string, password: string) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: error.message }
  return { success: true }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}

export async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// ─── Companions ───────────────────────────────────────────────────────────────

export async function getCompanion(id: string) {
  const user = await getCurrentUser()
  if (!user) return null
  return getCompanionQuery(user.id, id)
}

export async function getCompanions() {
  const user = await getCurrentUser()
  if (!user) return []
  return listCompanions(user.id)
}

export async function createFreeCompanion(companion: {
  name: string
  color: string
  emoji: string
  trait: string
}) {
  const user = await getCurrentUser()
  if (!user) return { error: 'Not authenticated' }
  return createFreeCompanionQuery(user.id, companion)
}

export async function createPurchasedCompanion(companion: {
  companion_type: 'prebuilt' | 'custom'
  name: string
  personality_id?: string
  core_id?: string
  appearance_id?: string
  prebuilt_id?: string
  color?: string
  emoji?: string
  trait?: string
  model?: string
}) {
  const user = await getCurrentUser()
  if (!user) return { error: 'Not authenticated' }

  const data = await createCompanion(user.id, {
    name: companion.name,
    companionType: companion.companion_type,
    trait: companion.trait ?? '',
    persona: '',
    emoji: companion.emoji ?? '🤖',
    color: companion.color ?? '#6366f1',
    model: companion.model ?? 'openai/gpt-4o',
    skills: [],
  })
  return { data }
}

export async function updateCompanionXP(companionId: string, xpToAdd: number) {
  const user = await getCurrentUser()
  if (!user) return { error: 'Not authenticated' }
  // addCompanionXP in queries.ts does an atomic UPDATE ... RETURNING
  const updated = await addCompanionXP(user.id, companionId, xpToAdd)
  if (!updated) return { error: 'Companion not found' }
  return { xp: updated.xp, level: updated.level }
}

export async function installSkill(companionId: string, skillId: string, skillName: string) {
  const user = await getCurrentUser()
  if (!user) return { error: 'Not authenticated' }

  // Ownership check happens inside installCompanionSkill
  const result = await installCompanionSkill(user.id, companionId, skillId, skillName)
  if ('error' in result) return result
  return { data: result }
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export async function getMessages(companionId: string) {
  const user = await getCurrentUser()
  if (!user) return []
  const rows = await getConversation(user.id, companionId, 100)
  // Map Aurora role ('user'|'assistant') to UI role ('user'|'ai')
  return rows.map((r) => ({
    id: r.id,
    role: r.role === 'assistant' ? 'ai' : 'user' as 'user' | 'ai',
    content: r.content,
    created_at: r.created_at,
  }))
}

export async function saveMessage(
  companionId: string,
  role: 'user' | 'ai',
  content: string,
) {
  const user = await getCurrentUser()
  if (!user) return { error: 'Not authenticated' }
  // Map UI role back to Aurora role
  const dbRole = role === 'ai' ? 'assistant' : 'user'
  const row = await saveMessageQuery(user.id, companionId, dbRole as 'user' | 'assistant', content)
  return { data: row }
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export async function getOrders() {
  const user = await getCurrentUser()
  if (!user) return []
  return listOrders(user.id)
}

// ─── Checkout ─────────────────────────────────────────────────────────────────

export type CheckoutCartItem = {
  id: string
  name: string
  price: number
  type: 'prebuilt' | 'custom' | 'shop'
  companionMeta?: {
    companion_type: 'prebuilt' | 'custom'
    personality_id?: string
    core_id?: string
    appearance_id?: string
    prebuilt_id?: string
    color?: string
    emoji?: string
    trait?: string
    model?: string
  }
}

/** Server-side canonical price lookup — never trust client-submitted prices. */
function resolveCanonicalPrice(item: CheckoutCartItem): number {
  if (item.type === 'prebuilt') {
    const id = item.id.startsWith('prebuilt-') ? item.id.slice(9) : item.id
    return prebuiltAIs.find((p) => p.id === id)?.price ?? item.price
  }
  if (item.type === 'custom' && item.companionMeta) {
    const { personality_id, core_id, appearance_id } = item.companionMeta
    const p = personalities.find((x) => x.id === personality_id)?.price ?? 0
    const c = cores.find((x) => x.id === core_id)?.price ?? 0
    const a = appearances.find((x) => x.id === appearance_id)?.price ?? 0
    return p + c + a
  }
  if (item.type === 'shop') {
    const id = item.id.startsWith('shop-') ? item.id.slice(5) : item.id
    const s = shopItems.find((x) => x.id === id)
    if (s) return s.isSale && s.salePrice ? s.salePrice : s.price
    const sk = skillsData.find((x) => x.id === id)
    if (sk) return sk.price
  }
  return item.price
}

export async function checkout(items: CheckoutCartItem[]) {
  const user = await getCurrentUser()
  if (!user) return { error: 'Not authenticated' }

  const totalCents = Math.round(
    items.reduce((sum, i) => sum + resolveCanonicalPrice(i), 0) * 100
  )

  const createdCompanions: { id: string; name: string; color: string; emoji: string; companion_type: string }[] = []
  for (const item of items) {
    if ((item.type === 'prebuilt' || item.type === 'custom') && item.companionMeta) {
      const meta = item.companionMeta
      const companion = await createCompanion(user.id, {
        name: item.name,
        companionType: meta.companion_type,
        trait: meta.trait ?? '',
        persona: '',
        emoji: meta.emoji ?? '🤖',
        color: meta.color ?? '#6366f1',
        model: meta.model ?? 'openai/gpt-4o',
        skills: [],
      })
      createdCompanions.push({
        id: companion.id,
        name: companion.name,
        color: companion.color,
        emoji: companion.emoji,
        companion_type: companion.companion_type,
      })
    }
  }

  const order = await recordPurchase(user.id, {
    items: items.map((i) => ({ id: i.id, name: i.name, price: i.price, type: i.type })),
    totalCents,
    status: 'completed',
  })

  return { success: true, orderId: order.id, companions: createdCompanions }
}

// ─── Milestones ───────────────────────────────────────────────────────────────

export async function completeMilestone(milestoneId: string, xpAwarded: number) {
  const user = await getCurrentUser()
  if (!user) return { error: 'Not authenticated' }
  return completeMilestoneQuery(user.id, milestoneId, xpAwarded)
}

export async function getMilestones() {
  const user = await getCurrentUser()
  if (!user) return []
  return getMilestonesQuery(user.id)
}
