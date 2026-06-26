import 'server-only'
import { Pool, type PoolClient } from 'pg'
import { Signer } from '@aws-sdk/rds-signer'
import { getAwsCredentials, getAwsRegion } from '@/lib/aws'

// ---------------------------------------------------------------------------
// Lazy pool - created only on first actual query, not at import time.
// This prevents crashes during Next.js static prerender / build where the
// Vercel OIDC context and AWS env vars are not present.
// ---------------------------------------------------------------------------
const g = globalThis as unknown as { __operantPool?: Pool }

function getPool(): Pool {
  if (g.__operantPool) return g.__operantPool

  const { attachDatabasePool } = require('@vercel/functions') as typeof import('@vercel/functions')

  const port = Number(process.env.PGPORT ?? 5432)
  const sslMode = (process.env.PGSSLMODE ?? 'verify-full').toLowerCase()
  const ssl =
    sslMode === 'disable'
      ? false
      : { rejectUnauthorized: sslMode !== 'require' && sslMode !== 'no-verify' }

  const signer = new Signer({
    credentials: getAwsCredentials(),
    region: getAwsRegion(),
    hostname: process.env.PGHOST!,
    username: process.env.PGUSER || 'postgres',
    port,
  })

  const pool = new Pool({
    host: process.env.PGHOST,
    database: process.env.PGDATABASE || 'postgres',
    port,
    user: process.env.PGUSER || 'postgres',
    password: () => signer.getAuthToken(),
    ssl,
    max: 20,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 30_000,
  })

  pool.on('error', (err) => {
    console.error('[db] idle client error', err)
  })

  attachDatabasePool(pool)
  g.__operantPool = pool
  return pool
}

/** Single parameterized query. */
export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[],
): Promise<{ rows: T[]; rowCount: number }> {
  const res = await getPool().query(text, params)
  return { rows: res.rows as T[], rowCount: res.rowCount ?? 0 }
}

/** Multi-statement transactions. Rolls back on any thrown error. */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}
