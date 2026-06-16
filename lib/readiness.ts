import { query } from '@/lib/db'

type ReadinessCheck = {
  name: string
  ok: boolean
  detail?: string
}

export type ReadinessReport = {
  ok: boolean
  checks: ReadinessCheck[]
}

function hasEnv(name: string): boolean {
  return Boolean(process.env[name]?.trim())
}

function check(name: string, ok: boolean, detail?: string): ReadinessCheck {
  return { name, ok, detail }
}

export function getConfigurationReadiness(): ReadinessReport {
  const checks: ReadinessCheck[] = [
    check('supabase_auth_url', hasEnv('NEXT_PUBLIC_SUPABASE_URL'), 'Required for Supabase Auth.'),
    check('supabase_auth_anon_key', hasEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'), 'Required for Supabase Auth.'),
    check('aurora_host', hasEnv('PGHOST'), 'Required for Aurora PostgreSQL.'),
    check('aurora_database', hasEnv('PGDATABASE'), 'Required for Aurora PostgreSQL.'),
    check('aurora_user', hasEnv('PGUSER'), 'Required for Aurora PostgreSQL.'),
    check('aurora_aws_region', hasEnv('AWS_REGION'), 'Required for IAM database auth.'),
    check('aurora_aws_role', hasEnv('AWS_ROLE_ARN'), 'Required for Vercel OIDC to assume the RDS auth role.'),
    check('stripe_publishable_key', hasEnv('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'), 'Required for embedded Checkout.'),
    check('stripe_secret_key', hasEnv('STRIPE_SECRET_KEY'), 'Required for server-side Checkout and fulfillment.'),
    check('stripe_webhook_secret', hasEnv('STRIPE_WEBHOOK_SECRET'), 'Required to verify Stripe webhook signatures.'),
    check('ai_gateway_auth', hasEnv('AI_GATEWAY_API_KEY') || hasEnv('VERCEL_OIDC_TOKEN'), 'Required for Vercel AI Gateway chat generation.'),
    check('app_url', hasEnv('NEXT_PUBLIC_APP_URL') || hasEnv('NEXT_PUBLIC_SITE_URL'), 'Required for Stripe return URLs and auth redirects.'),
    check('readiness_token', hasEnv('READINESS_TOKEN'), 'Required to protect the readiness endpoint.'),
    check('setup_token', hasEnv('SETUP_TOKEN'), 'Required to protect the Aurora setup endpoint.'),
  ]

  return { ok: checks.every((item) => item.ok), checks }
}

export async function getOperationalReadiness(): Promise<ReadinessReport> {
  const configuration = getConfigurationReadiness()
  const checks = [...configuration.checks]

  if (
    hasEnv('PGHOST') &&
    hasEnv('PGDATABASE') &&
    hasEnv('PGUSER') &&
    hasEnv('AWS_REGION') &&
    hasEnv('AWS_ROLE_ARN')
  ) {
    try {
      await query('SELECT 1')
      checks.push(check('aurora_connection', true, 'Aurora accepted a lightweight SELECT 1 query.'))
    } catch (err) {
      checks.push(check('aurora_connection', false, err instanceof Error ? err.message : String(err)))
    }
  } else {
    checks.push(check('aurora_connection', false, 'Skipped because Aurora environment variables are incomplete.'))
  }

  return { ok: checks.every((item) => item.ok), checks }
}
