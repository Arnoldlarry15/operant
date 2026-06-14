import { Pool, type PoolClient } from 'pg'
import { Signer } from '@aws-sdk/rds-signer'

// ---------------------------------------------------------------------------
// Lazy pool — created only on first actual query, not at import time.
// This prevents crashes during Next.js static prerender / build where the
// Vercel OIDC context and AWS env vars are not present.
// ---------------------------------------------------------------------------
const g = globalThis as unknown as { __operantPool?: Pool }

function getPool(): Pool {
  if (g.__operantPool) return g.__operantPool

  // These are only available inside a real Vercel runtime (or local dev with
  // env vars loaded). Importing them here (inside the function) avoids the
  // module-level crash.
  const { awsCredentialsProvider } = require('@vercel/functions/oidc') as typeof import('@vercel/functions/oidc')
  const { attachDatabasePool } = require('@vercel/functions') as typeof import('@vercel/functions')

  const signer = new Signer({
    credentials: awsCredentialsProvider({
      roleArn: process.env.AWS_ROLE_ARN!,
      clientConfig: { region: process.env.AWS_REGION },
    }),
    region: process.env.AWS_REGION,
    hostname: process.env.PGHOST!,
    username: process.env.PGUSER || 'postgres',
    port: 5432,
  })

  const pool = new Pool({
    host: process.env.PGHOST,
    database: process.env.PGDATABASE || 'postgres',
    port: 5432,
    user: process.env.PGUSER || 'postgres',
    password: () => signer.getAuthToken(),
    ssl: { rejectUnauthorized: false },
    max: 20,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 30_000,
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
