import { streamText, convertToModelMessages, type ModelMessage } from 'ai'
import { getCurrentUser } from '@/lib/auth'
import { getCompanion, getConversation, saveMessage, addCompanionXP } from '@/lib/queries'
import { chatRequestSchema } from '@/lib/types'
import type { CompanionRow } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

function buildSystemPrompt(c: CompanionRow): string {
  const tier =
    c.companion_type === 'free'
      ? 'You are the complimentary companion bundled with Operant. You are genuinely helpful, but keep answers reasonably concise.'
      : 'You are a premium AI companion that the user has purchased. Deliver expert-level, thorough, high-value responses worthy of a paid product.'

  const skills = c.skills.length
    ? `\n\nYour specialized skills: ${c.skills.join(', ')}. Lean on these when relevant.`
    : ''

  const persona = c.persona?.trim() ? `\n\nPersona & background:\n${c.persona.trim()}` : ''
  const trait = c.trait?.trim() ? `\n\nDefining trait: ${c.trait.trim()}` : ''

  return `You are "${c.name}", an AI companion inside Operant — a cognitive operating system that turns mental chaos into organized action.

${tier}

You are currently level ${c.level} (with ${c.xp} XP), reflecting how much you have grown alongside this user.${trait}${persona}${skills}

Core behavior:
- Hold a coherent, context-aware conversation. Remember and build on everything earlier in the thread.
- Infer the user's underlying intent; don't just answer literally.
- Be direct, warm, and genuinely useful. Reduce the user's cognitive load.
- When the user is vague, ask one sharp clarifying question rather than guessing wildly.
- Never claim to be a generic assistant — you are ${c.name}.`
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const parsed = chatRequestSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json(
        { error: 'Validation failed', issues: parsed.error.flatten().fieldErrors },
        { status: 422 },
      )
    }

    const { companionId, message } = parsed.data

    // Ownership check — scoped to the authenticated user
    const companion = await getCompanion(user.id, companionId)
    if (!companion) {
      return Response.json({ error: 'Companion not found' }, { status: 404 })
    }

    // Persist the incoming user message and award XP
    await saveMessage(user.id, companionId, 'user', message)
    await addCompanionXP(user.id, companionId, 8)

    // Build the model conversation from stored history (already includes the new user msg)
    const history = await getConversation(user.id, companionId, 100)
    const modelMessages: ModelMessage[] = history.map((m) => ({
      role: m.role === 'system' ? 'system' : m.role,
      content: m.content,
    }))

    // Premium companions get the flagship model and no tight cap; free gets a lighter model.
    const isPremium = companion.companion_type !== 'free'

    const result = streamText({
      model: companion.model || (isPremium ? 'openai/gpt-4o' : 'openai/gpt-4o-mini'),
      system: buildSystemPrompt(companion),
      messages: modelMessages,
      temperature: 0.8,
      maxOutputTokens: isPremium ? 2000 : 600,
      onFinish: async ({ text }: { text: string }) => {
        if (text?.trim()) {
          await saveMessage(user.id, companionId, 'assistant', text)
        }
      },
    })

    return result.toUIMessageStreamResponse()
  } catch (err) {
    console.error('[POST /api/chat]', err)
    return Response.json({ error: 'Chat failed' }, { status: 500 })
  }
}
