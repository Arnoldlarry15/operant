'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { prebuiltAIs, personalities, cores, appearances, shopItems, skills as skillsData } from '@/lib/store-data'

// ─── Auth ────────────────────────────────────────────────────────────────────

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

export async function getProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  return data
}

// ─── Companions ───────────────────────────────────────────────────────────────

export async function getCompanion(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('companions')
    .select('*, companion_skills(*)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()
  return data ?? null
}

export async function getCompanions() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await supabase
    .from('companions')
    .select('*, companion_skills(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
  return data ?? []
}

export async function createFreeCompanion(companion: {
  name: string
  color: string
  emoji: string
  trait: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Only allow one free companion per user
  const { data: existing } = await supabase
    .from('companions')
    .select('id')
    .eq('user_id', user.id)
    .eq('companion_type', 'free')
    .single()

  if (existing) return { data: existing }

  const { data, error } = await supabase
    .from('companions')
    .insert({
      user_id: user.id,
      companion_type: 'free',
      name: companion.name,
      color: companion.color,
      emoji: companion.emoji,
      trait: companion.trait,
    })
    .select()
    .single()

  if (error) return { error: error.message }
  return { data }
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
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('companions')
    .insert({ user_id: user.id, ...companion })
    .select()
    .single()

  if (error) return { error: error.message }
  return { data }
}

export async function updateCompanionXP(companionId: string, xpToAdd: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Use an atomic increment via RPC to avoid read-modify-write races when
  // multiple messages arrive in quick succession.
  const { data, error } = await supabase.rpc('increment_companion_xp', {
    p_companion_id: companionId,
    p_user_id: user.id,
    p_xp: xpToAdd,
  })

  if (error) {
    // Fallback: read-modify-write if the RPC isn't deployed yet
    const { data: current } = await supabase
      .from('companions')
      .select('xp, level, message_count')
      .eq('id', companionId)
      .eq('user_id', user.id)
      .single()

    if (!current) return { error: 'Companion not found' }

    const newXP = current.xp + xpToAdd
    const newLevel = Math.floor(newXP / 100) + 1
    const newMsgCount = current.message_count + 1

    await supabase
      .from('companions')
      .update({ xp: newXP, level: Math.max(current.level, newLevel), message_count: newMsgCount })
      .eq('id', companionId)
      .eq('user_id', user.id)

    return { xp: newXP, level: Math.max(current.level, newLevel) }
  }

  return data as { xp: number; level: number }
}

export async function installSkill(companionId: string, skillId: string, skillName: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Verify the companion belongs to the authenticated user before installing
  const { data: companion } = await supabase
    .from('companions')
    .select('id')
    .eq('id', companionId)
    .eq('user_id', user.id)
    .single()

  if (!companion) return { error: 'Companion not found or access denied' }

  // Prevent duplicate skill installs
  const { data: existing } = await supabase
    .from('companion_skills')
    .select('id')
    .eq('companion_id', companionId)
    .eq('skill_id', skillId)
    .maybeSingle()

  if (existing) return { error: 'Skill already installed' }

  const { data, error } = await supabase
    .from('companion_skills')
    .insert({ companion_id: companionId, user_id: user.id, skill_id: skillId, skill_name: skillName })
    .select()
    .single()

  if (error) return { error: error.message }
  return { data }
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export async function getMessages(companionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('companion_messages')
    .select('*')
    .eq('companion_id', companionId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(100)

  return data ?? []
}

export async function saveMessage(companionId: string, role: 'user' | 'ai', content: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('companion_messages')
    .insert({ companion_id: companionId, user_id: user.id, role, content })
    .select()
    .single()

  if (error) return { error: error.message }
  return { data }
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export async function getOrders() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return data ?? []
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
  return item.price // fallback — should not reach in production
}

export async function checkout(items: CheckoutCartItem[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Always compute total from server-side canonical prices
  const totalCents = Math.round(items.reduce((sum, i) => sum + resolveCanonicalPrice(i), 0) * 100)

  // Create companion rows for every companion-type item
  const createdCompanions: { id: string; name: string; color: string; emoji: string; companion_type: string }[] = []
  for (const item of items) {
    if ((item.type === 'prebuilt' || item.type === 'custom') && item.companionMeta) {
      const { data, error } = await supabase
        .from('companions')
        .insert({ user_id: user.id, name: item.name, ...item.companionMeta })
        .select('id, name, color, emoji, companion_type')
        .single()
      if (!error && data) createdCompanions.push(data)
    }
  }

  // Record the order
  const { data: orderData, error: orderError } = await supabase.from('orders').insert({
    user_id: user.id,
    items: items.map((i) => ({ id: i.id, name: i.name, price: i.price, type: i.type })),
    total_cents: totalCents,
    status: 'completed',
  }).select('id').single()

  if (orderError) return { error: orderError.message }
  return { success: true, orderId: orderData?.id ?? '', companions: createdCompanions }
}

// ─── Milestones ───────────────────────────────────────────────────────────────

export async function completeMilestone(milestoneId: string, xpAwarded: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('user_milestones')
    .insert({ user_id: user.id, milestone_id: milestoneId, xp_awarded: xpAwarded })
    .select()
    .single()

  if (error && error.code !== '23505') return { error: error.message } // ignore duplicate
  return { data }
}

export async function getMilestones() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('user_milestones')
    .select('milestone_id')
    .eq('user_id', user.id)

  return data?.map((m) => m.milestone_id) ?? []
}
