import { z } from 'zod'

// ----- Row types (shape returned from Aurora) -----
export interface UserRow {
  id: string
  email: string
  name: string | null
  created_at: string
  updated_at: string
}

export type CompanionType = 'free' | 'prebuilt' | 'custom'

export interface CompanionRow {
  id: string
  user_id: string
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

export interface PurchaseRow {
  id: string
  user_id: string
  companion_id: string | null
  items: { id: string; name: string; price: number; type: string }[]
  total_cents: number
  status: 'pending' | 'completed' | 'refunded' | 'failed'
  created_at: string
}

// ----- Validation schemas for request bodies -----
export const createCompanionSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  companionType: z.enum(['free', 'prebuilt', 'custom']).default('custom'),
  trait: z.string().trim().max(2000).default(''),
  persona: z.string().trim().max(4000).default(''),
  emoji: z.string().trim().max(16).default('🤖'),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a hex value like #6366f1')
    .default('#6366f1'),
  model: z.string().trim().max(60).default('openai/gpt-5.5'),
  skills: z.array(z.string().trim().max(80)).max(50).default([]),
})

export type CreateCompanionInput = z.infer<typeof createCompanionSchema>

export const chatRequestSchema = z.object({
  companionId: z.string().uuid('companionId must be a valid UUID'),
  message: z.string().trim().min(1, 'Message cannot be empty').max(8000),
})

export type ChatRequestInput = z.infer<typeof chatRequestSchema>
