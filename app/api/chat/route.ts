import { streamText, type ModelMessage } from 'ai'
import { getCurrentUser } from '@/lib/auth'
import { getCompanion, getConversation, saveMessage, addCompanionXP, countUserMessagesSince } from '@/lib/queries'
import { chatRequestSchema } from '@/lib/types'
import { buildPaidAgentSystemPrompt } from '@/lib/agent-capabilities'
import { hasAiGatewayAuth, resolveAgentModel } from '@/lib/ai-runtime'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const DAILY_AGENT_MESSAGE_LIMIT = 100

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

    const companion = await getCompanion(user.id, companionId)
    if (!companion) {
      return Response.json({ error: 'Agent not found' }, { status: 404 })
    }

    if (!hasAiGatewayAuth()) {
      return Response.json(
        {
          error: 'AI service is not configured',
          message: 'Operant AI service is not configured yet. Add AI_GATEWAY_API_KEY or enable Vercel OIDC before using hosted agents.',
        },
        { status: 503 },
      )
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const recentUserMessages = await countUserMessagesSince(user.id, companionId, since)
    if (recentUserMessages >= DAILY_AGENT_MESSAGE_LIMIT) {
      return Response.json(
        {
          error: 'Daily message limit reached',
          message: `This agent has reached ${DAILY_AGENT_MESSAGE_LIMIT} messages in the last 24 hours. Try again later.`,
        },
        { status: 429 },
      )
    }

    await saveMessage(user.id, companionId, 'user', message)

    const history = await getConversation(user.id, companionId, 30)
    const modelMessages: ModelMessage[] = history.map((m) => ({
      role: m.role === 'system' ? 'system' : m.role,
      content: m.content,
    }))

    const result = streamText({
      model: resolveAgentModel(companion.model),
      system: buildPaidAgentSystemPrompt(companion),
      messages: modelMessages,
      temperature: 0.8,
      maxOutputTokens: 2000,
      onFinish: async ({ text }: { text: string }) => {
        if (text?.trim()) {
          await saveMessage(user.id, companionId, 'assistant', text)
          await addCompanionXP(user.id, companionId, 8)
        }
      },
    })

    return result.toTextStreamResponse()
  } catch (err) {
    console.error('[POST /api/chat]', err)
    return Response.json({ error: 'Chat failed' }, { status: 500 })
  }
}
