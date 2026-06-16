"use client"

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CheckoutCartItem, CheckoutCartItemCompanionMeta } from './checkout-types'

type BuilderState = {
  selectedPersonality: string | null
  selectedCore: string | null
  selectedAppearance: string | null
  selectedSkills: string[]
}

export type CartItemCompanionMeta = CheckoutCartItemCompanionMeta
export type CartItem = CheckoutCartItem

type AppState = {
  currentPage: 'home' | 'builder' | 'prebuilt' | 'shop' | 'dashboard'
  setPage: (page: AppState['currentPage']) => void

  builder: BuilderState
  setPersonality: (id: string) => void
  setCore: (id: string) => void
  setAppearance: (id: string) => void
  toggleSkill: (id: string) => void
  resetBuilder: () => void

  cart: CartItem[]
  addToCart: (item: CartItem) => void
  removeFromCart: (id: string) => void
  clearCart: () => void
  cartOpen: boolean
  setCartOpen: (open: boolean) => void

  userMilestones: string[]
  completeMilestone: (id: string) => void

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
        set({
          builder: {
            selectedPersonality: null,
            selectedCore: null,
            selectedAppearance: null,
            selectedSkills: [],
          },
        }),

      cart: [],
      addToCart: (item) =>
        set((s) => ({
          cart: s.cart.some((c) => c.id === item.id) ? s.cart : [...s.cart, item],
        })),
      removeFromCart: (id) => set((s) => ({ cart: s.cart.filter((c) => c.id !== id) })),
      clearCart: () => set({ cart: [] }),
      cartOpen: false,
      setCartOpen: (open) => set({ cartOpen: open }),

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
      name: 'operant-store',
      partialize: (state) => ({
        userMilestones: state.userMilestones,
        cart: state.cart,
      }),
    },
  ),
)
