import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getCompanion, getConversation } from '@/lib/queries'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// GET /api/companions/[id] - fetch a single paid agent plus its conversation
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: 'Invalid companion id' }, { status: 400 })
    }

    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const companion = await getCompanion(user.id, id)
    if (!companion) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    const messages = await getConversation(user.id, id)
    return NextResponse.json({ companion, messages })
  } catch (err) {
    console.error('[GET /api/companions/[id]]', err)
    return NextResponse.json({ error: 'Failed to load agent' }, { status: 500 })
  }
}
