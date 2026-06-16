import { streamText, type ModelMessage } from 'ai'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { DEFAULT_SUPPORT_MODEL } from '@/lib/agent-models'
import { hasAiGatewayAuth } from '@/lib/ai-runtime'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 45

const supportChatSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().trim().min(1).max(4000),
  })).min(1).max(30),
})

function buildSupportPrompt() {
  return `You are Operant Guide, the embedded customer support and setup bot for Operant.

Operant is an AI agent store. Customers can buy pre-built agents, build custom agents, purchase upgrades, assign upgrades to owned agents, and chat with purchased agents in their dashboard.

Your job:
- Help customers choose the right pre-built or custom agent path.
- Explain what upgrades do and when they are worth buying.
- Guide users through checkout, dashboard access, and upgrade assignment.
- Troubleshoot account, payment, and setup confusion without claiming to have private system access.
- Keep answers practical, short enough to act on, and specific to Operant.

Important boundaries:
- You are not one of the paid agents and should not roleplay as one.
- Do not promise capabilities that are not represented by purchased agent skills.
- If the user asks about a failed payment, missing purchased agent, or account-specific issue, tell them what to check and suggest contacting support with the order/session details.
- Always describe Operant as an AI agent store for prebuilt agents, custom agents, and paid upgrades.`
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return new Response('Unauthorized', { status: 401 })

    if (!hasAiGatewayAuth()) {
      return Response.json(
        {
          error: 'AI service is not configured',
          message: 'Operant support is not configured yet. Add AI_GATEWAY_API_KEY or enable Vercel OIDC before using hosted chat.',
        },
        { status: 503 },
      )
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const parsed = supportChatSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json(
        { error: 'Validation failed', issues: parsed.error.flatten().fieldErrors },
        { status: 422 },
      )
    }

    const result = streamText({
      model: DEFAULT_SUPPORT_MODEL,
      system: buildSupportPrompt(),
      messages: parsed.data.messages as ModelMessage[],
      temperature: 0.5,
      maxOutputTokens: 700,
    })

    return result.toTextStreamResponse()
  } catch (err) {
    console.error('[POST /api/chat/support]', err)
    return new Response('Support chat failed', { status: 500 })
  }
}
