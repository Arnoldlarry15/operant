"use client"

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type FreeAIPersonality = {
  name: string
  color: string
  emoji: string
  trait: string
}

export const freeAIPersonalities: FreeAIPersonality[] = [
  { name: 'Sparky', color: '#22d3ee', emoji: '⚡', trait: 'Curious and playful' },
  { name: 'Byte', color: '#4ade80', emoji: '🌱', trait: 'Calm and helpful' },
  { name: 'Pip', color: '#f472b6', emoji: '✨', trait: 'Cheerful and warm' },
  { name: 'Glitch', color: '#a855f7', emoji: '🔮', trait: 'Quirky and creative' },
  { name: 'Dash', color: '#fb923c', emoji: '🔥', trait: 'Energetic and fast' },
  { name: 'Clio', color: '#fbbf24', emoji: '📚', trait: 'Wise and thoughtful' },
]

export function generateFreeAI(): FreeAIPersonality {
  return freeAIPersonalities[Math.floor(Math.random() * freeAIPersonalities.length)]
}

type BuilderState = {
  selectedPersonality: string | null
  selectedCore: string | null
  selectedAppearance: string | null
  selectedSkills: string[]
}

export type CartItemCompanionMeta = {
  companion_type: 'prebuilt' | 'custom'
  personality_id?: string
  core_id?: string
  appearance_id?: string
  prebuilt_id?: string
  color?: string
  emoji?: string
  trait?: string
}

export type CartItem = {
  id: string
  name: string
  price: number
  type: 'prebuilt' | 'custom' | 'shop'
  companionMeta?: CartItemCompanionMeta
}

type AppState = {
  // Navigation
  currentPage: 'home' | 'builder' | 'prebuilt' | 'shop' | 'dashboard'
  setPage: (page: AppState['currentPage']) => void

  // Builder
  builder: BuilderState
  setPersonality: (id: string) => void
  setCore: (id: string) => void
  setAppearance: (id: string) => void
  toggleSkill: (id: string) => void
  resetBuilder: () => void

  // Cart
  cart: CartItem[]
  addToCart: (item: CartItem) => void
  removeFromCart: (id: string) => void
  clearCart: () => void
  cartOpen: boolean
  setCartOpen: (open: boolean) => void

  // Free AI
  freeAI: FreeAIPersonality | null
  initFreeAI: () => void
  freeAILevel: number
  freeAIXP: number
  addXP: (xp: number) => void
  freeAIMessages: number
  incrementMessages: () => void

  // User
  userMilestones: string[]
  completeMilestone: (id: string) => void

  // Toast notifications
  notifications: { id: string; message: string; type: 'success' | 'info' | 'warning' }[]
  addNotification: (msg: string, type?: 'success' | 'info' | 'warning') => void
  removeNotification: (id: string) => void
}

export const useAppState = create<AppState>()(
  persist(
    (set, get) => ({
      currentPage: 'home',
      setPage: (page) => set({ currentPage: page }),

      builder: {
        selectedPersonality: null,
        selectedCore: null,
        selectedAppearance: null,
        selectedSkills: [],
      },
      setPersonality: (id) => set((s) => ({ builder: { ...s.builder, selectedPersonality: id } })),
      setCore: (id) => set((s) => ({ builder: { ...s.builder, selectedCore: id } })),
      setAppearance: (id) => set((s) => ({ builder: { ...s.builder, selectedAppearance: id } })),
      toggleSkill: (id) =>
        set((s) => ({
          builder: {
            ...s.builder,
            selectedSkills: s.builder.selectedSkills.includes(id)
              ? s.builder.selectedSkills.filter((sk) => sk !== id)
              : [...s.builder.selectedSkills, id],
          },
        })),
      resetBuilder: () =>
        set({ builder: { selectedPersonality: null, selectedCore: null, selectedAppearance: null, selectedSkills: [] } }),

      cart: [],
      addToCart: (item) =>
        set((s) => ({
          cart: s.cart.some((c) => c.id === item.id) ? s.cart : [...s.cart, item],
        })),
      removeFromCart: (id) => set((s) => ({ cart: s.cart.filter((c) => c.id !== id) })),
      clearCart: () => set({ cart: [] }),
      cartOpen: false,
      setCartOpen: (open) => set({ cartOpen: open }),

      freeAI: null,
      initFreeAI: () => {
        if (!get().freeAI) {
          set({ freeAI: generateFreeAI() })
        }
      },
      freeAILevel: 1,
      freeAIXP: 0,
      addXP: (xp) =>
        set((s) => {
          const newXP = s.freeAIXP + xp
          const xpPerLevel = 100
          const newLevel = Math.floor(newXP / xpPerLevel) + 1
          return { freeAIXP: newXP, freeAILevel: Math.max(s.freeAILevel, newLevel) }
        }),
      freeAIMessages: 0,
      incrementMessages: () =>
        set((s) => {
          const newCount = s.freeAIMessages + 1
          get().addXP(5)
          if (newCount === 10) get().completeMilestone('first-10-messages')
          if (newCount === 50) get().completeMilestone('fifty-messages')
          if (newCount === 100) get().completeMilestone('hundred-messages')
          return { freeAIMessages: newCount }
        }),

      userMilestones: [],
      completeMilestone: (id) =>
        set((s) => ({
          userMilestones: s.userMilestones.includes(id) ? s.userMilestones : [...s.userMilestones, id],
        })),

      notifications: [],
      addNotification: (message, type = 'success') => {
        const id = Date.now().toString()
        set((s) => ({ notifications: [...s.notifications, { id, message, type }] }))
        setTimeout(() => get().removeNotification(id), 4000)
      },
      removeNotification: (id) =>
        set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),
    }),
    {
      name: 'aeon-store',
      partialize: (state) => ({
        freeAI: state.freeAI,
        freeAILevel: state.freeAILevel,
        freeAIXP: state.freeAIXP,
        freeAIMessages: state.freeAIMessages,
        userMilestones: state.userMilestones,
        cart: state.cart,
      }),
    }
  )
)
