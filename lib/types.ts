import { z } from 'zod'

// ----- Row types (shape returned from Aurora) -----
export interface UserRow {
  id: string
  email: string
  name: string | null
  created_at: string
  updated_at: string
}

export type CompanionType = 'prebuilt' | 'custom'

export interface CompanionRow {
  id: string
  user_id: string
  order_id: string | null
  name: string
  companion_type: CompanionType
  trait: string
  persona: string
  emoji: string
  color: string
  model: string
  level: number
  xp: number
  skills: string[]
  message_count: number
  created_at: string
  updated_at: string
}

export type MessageRole = 'user' | 'assistant' | 'system'

export interface ConversationRow {
  id: string
  companion_id: string
  user_id: string
  role: MessageRole
  content: string
  created_at: string
}

export const chatRequestSchema = z.object({
  companionId: z.string().uuid('companionId must be a valid UUID'),
  message: z.string().trim().min(1, 'Message cannot be empty').max(8000),
})

export type ChatRequestInput = z.infer<typeof chatRequestSchema>
