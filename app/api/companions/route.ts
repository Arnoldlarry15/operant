import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createCompanion, listCompanions } from '@/lib/queries'
import { createCompanionSchema } from '@/lib/types'

// Aurora + AWS SDK require the Node.js runtime (never edge).
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/companions — list the authenticated user's companions
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const companions = await listCompanions(user.id)
    return NextResponse.json({ companions })
  } catch (err) {
    console.error('[GET /api/companions]', err)
    return NextResponse.json({ error: 'Failed to load companions' }, { status: 500 })
  }
}

// POST /api/companions — create a new companion
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const parsed = createCompanionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: parsed.error.flatten().fieldErrors },
        { status: 422 },
      )
    }

    const companion = await createCompanion(user.id, parsed.data)
    return NextResponse.json({ companion }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/companions]', err)
    return NextResponse.json({ error: 'Failed to create companion' }, { status: 500 })
  }
}
