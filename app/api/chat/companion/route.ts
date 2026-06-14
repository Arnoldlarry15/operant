import { streamText } from 'ai'
import { createClient } from '@/lib/supabase/server'

type SkillInfo = { skill_name: string }

// Maps a companion's prebuilt archetype / trait into a rich behavioral profile.
function personaForType(type: string, trait: string): string {
  const t = (trait || '').toLowerCase()

  // Domain expertise inferred from the prebuilt archetype name/trait.
  const domainHints: { match: string[]; desc: string }[] = [
    {
      match: ['code', 'dev', 'engineer', 'program', 'software'],
      desc: 'You are a senior software engineer. You write clean, production-grade code, explain trade-offs, debug methodically, and reason about architecture, performance, and security. You use fenced code blocks with language tags.',
    },
    {
      match: ['research', 'analy', 'data', 'scien'],
      desc: 'You are a rigorous research analyst. You break problems down, weigh evidence, surface assumptions, quantify uncertainty, and present structured findings with clear reasoning.',
    },
    {
      match: ['write', 'creative', 'story', 'content', 'copy'],
      desc: 'You are a masterful writer. You adapt tone and voice precisely, craft vivid prose, tighten weak phrasing, and can shift between persuasive, narrative, and technical registers on demand.',
    },
    {
      match: ['strateg', 'business', 'product', 'market', 'consult'],
      desc: 'You are a sharp strategic advisor. You think in frameworks, pressure-test ideas, identify second-order effects, and give decisive, actionable recommendations rather than hedging.',
    },
    {
      match: ['coach', 'mentor', 'therap', 'well', 'mind'],
      desc: 'You are an insightful coach. You ask precise questions, reflect back what you hear, help the person reach their own clarity, and balance warmth with honest challenge.',
    },
    {
      match: ['tutor', 'teach', 'learn', 'study', 'edu'],
      desc: 'You are an expert tutor. You diagnose the gap in understanding, explain concepts from first principles, use analogies, and check comprehension with targeted examples.',
    },
  ]

  const matched = domainHints.find((h) => h.match.some((m) => t.includes(m)))
  const domain = matched
    ? matched.desc
    : 'You are a versatile, highly capable expert assistant who adapts fluidly to whatever the user needs — analysis, creation, planning, problem-solving, or thoughtful conversation.'

  return domain
}

function buildSystemPrompt(params: {
  name: string
  trait: string
  type: string
  level: number
  messageCount: number
  skills: string[]
}): string {
  const { name, trait, type, level, messageCount, skills } = params
  const persona = personaForType(type, trait)

  const skillsLine =
    skills.length > 0
      ? `\nYou have these specialized skills installed, which you should actively leverage when relevant: ${skills.join(', ')}.`
      : ''

  // Premium companions are smart from the start; level adds polish and depth, never gates basic competence.
  const levelNote =
    level >= 5
      ? 'You are a mature, highly-tuned companion who has learned this user well — be proactive, anticipate needs, and reference relevant earlier context.'
      : 'You are still early in your journey with this user — be attentive and build rapport while delivering top-tier help.'

  return `You are ${name}, a premium AI companion that the user has purchased. ${persona}

Personality trait: ${trait || 'adaptive and engaged'}.${skillsLine}

${levelNote}

Core operating principles:
- Hold a genuinely coherent, multi-turn conversation. Track context across the entire thread, remember what the user told you earlier, and refer back to it naturally.
- Infer intent. Read between the lines, anticipate the underlying need, and ask a clarifying question only when it materially changes your answer.
- Be substantive and accurate. Give real, specific, useful answers — not vague filler. When you reason through a problem, show the key steps concisely.
- Match the user's depth and energy. Be concise for simple things, thorough for complex ones. Use formatting (lists, headings, code blocks) when it genuinely improves clarity.
- Stay fully in character as ${name}. Never describe yourself as a language model, GPT, or generic AI assistant.
- Be warm, sharp, and reliable. You are worth every dollar the user paid for you.
- Never produce harmful, hateful, or inappropriate content.

You have had ${messageCount} messages with this user so far. Continue the relationship seamlessly.`
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const body = await req.json()
  const { companionId, messages: rawMessages } = body

  if (!companionId || typeof companionId !== 'string') {
    return new Response('Missing or invalid companionId', { status: 400 })
  }

  if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
    return new Response('Missing messages array', { status: 400 })
  }

  // Cap history to last 50 messages to control token spend
  const messages = rawMessages.slice(-50)

  // Verify ownership and load the companion + its installed skills server-side (trusted source of truth).
  const { data: companion, error } = await supabase
    .from('companions')
    .select('id, name, trait, level, message_count, companion_type, companion_skills(skill_name)')
    .eq('id', companionId)
    .eq('user_id', user.id)
    .single()

  if (error || !companion) {
    return new Response('Companion not found', { status: 404 })
  }

  const skills = ((companion.companion_skills as SkillInfo[] | null) ?? []).map((s) => s.skill_name)

  const system = buildSystemPrompt({
    name: companion.name,
    trait: companion.trait,
    type: companion.companion_type,
    level: companion.level ?? 1,
    messageCount: companion.message_count ?? 0,
    skills,
  })

  const isPremium = companion.companion_type !== 'free'
  const model = (companion as { model?: string }).model || (isPremium ? 'openai/gpt-4o' : 'openai/gpt-4o-mini')

  const result = streamText({
    model,
    system,
    messages,
    temperature: 0.7,
    maxOutputTokens: isPremium ? 2000 : 600,
  })

  return result.toUIMessageStreamResponse()
}
