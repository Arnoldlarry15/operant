import 'server-only'
import { DEFAULT_AGENT_MODEL } from '@/lib/agent-models'

const GATEWAY_MODEL_RE = /^[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9._-]*$/i

export function hasAiGatewayAuth(): boolean {
  return Boolean(process.env.AI_GATEWAY_API_KEY?.trim() || process.env.VERCEL_OIDC_TOKEN?.trim())
}

export function resolveAgentModel(model: string | null | undefined): string {
  const candidate = model?.trim()
  if (!candidate || !GATEWAY_MODEL_RE.test(candidate)) return DEFAULT_AGENT_MODEL
  return candidate
}
