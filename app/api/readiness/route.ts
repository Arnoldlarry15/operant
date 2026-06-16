import { NextRequest, NextResponse } from 'next/server'
import { getConfigurationReadiness, getOperationalReadiness } from '@/lib/readiness'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function json(body: unknown, init?: ResponseInit) {
  const res = NextResponse.json(body, init)
  res.headers.set('Cache-Control', 'no-store')
  return res
}

function isAuthorized(req: NextRequest): boolean {
  const token = process.env.READINESS_TOKEN
  if (!token) return false

  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim()
  const queryToken = req.nextUrl.searchParams.get('token')
  return bearer === token || queryToken === token
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const mode = req.nextUrl.searchParams.get('mode') ?? 'configuration'
  const report = mode === 'operational'
    ? await getOperationalReadiness()
    : getConfigurationReadiness()

  return json(report, { status: report.ok ? 200 : 503 })
}
