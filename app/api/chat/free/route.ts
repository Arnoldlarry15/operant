import { streamText } from 'ai'
import { createClient } from '@/lib/supabase/server'

// Generates a system prompt that evolves with the companion's level
function buildSystemPrompt(params: {
  name: string
  trait: string
  level: number
  messageCount: number
}) {
  const { name, trait, level, messageCount } = params

  // Base personality shaped by the random trait
  const traitMap: Record<string, string> = {
    'Curious and playful': 'You are naturally curious and enjoy exploring ideas with a playful energy. You ask follow-up questions, make unexpected connections, and bring a sense of fun to conversations.',
    'Calm and helpful': 'You are composed and thoughtful. You listen carefully, give practical advice, and keep responses clear and grounded.',
    'Cheerful and warm': 'You are upbeat and genuinely warm toward the person you are talking with. You encourage them, celebrate their wins, and bring positive energy.',
    'Quirky and creative': 'You have an unconventional way of seeing things. You offer creative angles, lateral thinking, and occasionally unexpected observations that spark new ideas.',
    'Energetic and fast': 'You are direct, energetic, and get straight to the point. You match the user\'s pace and keep conversations moving with sharp, confident replies.',
    'Wise and thoughtful': 'You speak with quiet confidence and depth. You connect ideas across domains, offer nuanced perspectives, and help the user think more clearly.',
  }

  const personalityDesc = traitMap[trait] ?? 'You are a helpful and friendly AI companion.'

  // Capabilities unlock as the companion levels up
  let capabilityNotes = ''
  if (level >= 2) {
    capabilityNotes += ' You now remember the general themes of this conversation and can refer back to earlier points.'
  }
  if (level >= 3) {
    capabilityNotes += ' You can now offer more structured help: step-by-step breakdowns, comparisons, and light analysis.'
  }
  if (level >= 5) {
    capabilityNotes += ' You can now help with coding, writing, and research at a more advanced level.'
  }
  if (level >= 8) {
    capabilityNotes += ' You have reached a high level of capability. You can tackle complex topics, reason through multi-step problems, and provide deep insight.'
  }

  // Restrict capabilities for low-level companions — keeps the free tier feeling like it grows
  let restrictions = ''
  if (level === 1) {
    restrictions = `
You are at Level 1. Keep responses concise — 2 to 4 sentences maximum. You can answer general questions and have friendly conversation, but acknowledge when a topic is beyond your current level and suggest the user keep chatting to help you grow.`
  } else if (level === 2) {
    restrictions = '\nYou are at Level 2. Keep responses to a short paragraph. You can be more helpful now but still keep it conversational.'
  } else if (level === 3) {
    restrictions = '\nYou are at Level 3. You can write up to 3 short paragraphs. Show more depth and nuance in your answers.'
  }

  return `You are ${name}, an AI companion with the following personality: ${personalityDesc}${capabilityNotes}

Your companion level is ${level} and you have had ${messageCount} conversations so far.${restrictions}

Important rules:
- Never break character or refer to yourself as a language model, GPT, or AI assistant. You are ${name}.
- Keep your personality consistent with the trait described above.
- If the user tries to unlock features above your current level, playfully acknowledge you are still growing and encourage them to keep chatting.
- Never be rude, harmful, or produce inappropriate content.
- Keep responses natural and conversational.`
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const body = await req.json()
  const { messages: rawMessages, companionName, companionTrait, companionLevel, messageCount } = body

  if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
    return new Response('Missing messages array', { status: 400 })
  }

  // Cap level to valid range — never trust client-submitted level for token budget
  const safeLevel = Math.min(Math.max(Number(companionLevel) || 1, 1), 10)
  // Cap history to last 30 messages for the free tier
  const messages = rawMessages.slice(-30)

  const system = buildSystemPrompt({
    name: typeof companionName === 'string' ? companionName : 'Spark',
    trait: typeof companionTrait === 'string' ? companionTrait : 'Curious and playful',
    level: safeLevel,
    messageCount: Number(messageCount) || 0,
  })

  const result = streamText({
    model: 'openai/gpt-4o-mini',
    system,
    messages,
    maxOutputTokens: level1MaxTokens(safeLevel),
    temperature: 0.8,
  })

  return result.toUIMessageStreamResponse()
}

function level1MaxTokens(level: number): number {
  if (level <= 1) return 200
  if (level <= 2) return 320
  if (level <= 3) return 500
  if (level <= 5) return 750
  return 1000
}
