import { NextResponse } from 'next/server'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { query } from '@/lib/db'

// One-time migration runner. Guarded by a secret token.
// POST /api/_setup?token=...&file=001-setup-schema.sql
export async function POST(req: Request) {
  const url = new URL(req.url)
  const token = url.searchParams.get('token')
  if (!process.env.SETUP_TOKEN || token !== process.env.SETUP_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const file = url.searchParams.get('file') || '001-setup-schema.sql'
  try {
    const sql = readFileSync(join(process.cwd(), 'scripts', file), 'utf8')
    await query(sql)
    const { rows } = await query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`,
    )
    return NextResponse.json({ ok: true, file, tables: rows.map((r) => r.table_name) })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
