export type CheckoutCartItem = {
  id: string
  name: string
  price: number
  type: 'prebuilt' | 'custom' | 'shop'
  companionMeta?: CheckoutCartItemCompanionMeta
}

export type CheckoutCartItemCompanionMeta = {
  companion_type: 'prebuilt' | 'custom'
  personality_id?: string
  core_id?: string
  appearance_id?: string
  prebuilt_id?: string
  skill_ids?: string[]
  color?: string
  emoji?: string
  trait?: string
}

export type CanonicalCheckoutCartItem = Omit<CheckoutCartItem, 'companionMeta'> & {
  companionMeta?: CheckoutCartItemCompanionMeta & {
    model?: string
  }
}
