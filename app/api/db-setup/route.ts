import { NextResponse } from 'next/server'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { query } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const allowedMigrationFiles = new Set([
  '001-setup-schema.sql',
  '003-full-aurora-schema.sql',
])

function json(body: unknown, init?: ResponseInit) {
  const res = NextResponse.json(body, init)
  res.headers.set('Cache-Control', 'no-store')
  return res
}

// One-time Aurora migration runner. Guarded by a secret token and a file allowlist.
export async function POST(req: Request) {
  const url = new URL(req.url)
  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim()
  const token = bearer || url.searchParams.get('token')
  if (!process.env.SETUP_TOKEN || token !== process.env.SETUP_TOKEN) {
    return json({ error: 'Unauthorized' }, { status: 401 })
  }

  const file = url.searchParams.get('file') || '001-setup-schema.sql'
  if (!allowedMigrationFiles.has(file)) {
    return json({ error: 'Migration file is not allowed' }, { status: 400 })
  }

  try {
    const sql = readFileSync(join(process.cwd(), 'scripts', file), 'utf8')
    await query(sql)
    const { rows } = await query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`,
    )
    return json({ ok: true, file, tables: rows.map((r) => r.table_name) })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return json({ ok: false, error: message }, { status: 500 })
  }
}
