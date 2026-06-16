import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { listCompanions } from '@/lib/queries'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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
    return NextResponse.json({ error: 'Failed to load agents' }, { status: 500 })
  }
}

export async function POST() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      { error: 'Direct agent creation is disabled. Use Stripe Checkout.' },
      { status: 403 },
    )
  } catch (err) {
    console.error('[POST /api/companions]', err)
    return NextResponse.json({ error: 'Failed to reject direct agent creation' }, { status: 500 })
  }
}
