import { existsSync, readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'

const root = process.cwd()
const files = ['.env.local']
const placeholders = /your-|replace-with|\.\.\.|placeholder/i

const required = [
  ['Cognito Auth', [
    { label: 'COGNITO_USER_POOL_ID', names: ['COGNITO_USER_POOL_ID'] },
    { label: 'COGNITO_USER_POOL_CLIENT_ID', names: ['COGNITO_USER_POOL_CLIENT_ID'] },
    { label: 'COGNITO_USER_POOL_CLIENT_SECRET (optional)', names: ['COGNITO_USER_POOL_CLIENT_SECRET'], optional: true },
  ]],
  ['AWS Secrets Manager', [
    { label: 'AWS_SECRETS_MANAGER_CONFIG_SECRET_ID', names: ['AWS_SECRETS_MANAGER_CONFIG_SECRET_ID'] },
  ]],
  ['AWS S3', [
    { label: 'AGENT_ASSETS_BUCKET', names: ['AGENT_ASSETS_BUCKET'] },
  ]],
  ['PostHog', [
    { label: 'NEXT_PUBLIC_POSTHOG_KEY', names: ['NEXT_PUBLIC_POSTHOG_KEY'] },
    { label: 'NEXT_PUBLIC_POSTHOG_HOST', names: ['NEXT_PUBLIC_POSTHOG_HOST'] },
  ]],
  ['Stripe', [
    { label: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', names: ['NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'] },
    { label: 'STRIPE_SECRET_KEY', names: ['STRIPE_SECRET_KEY'] },
    { label: 'STRIPE_WEBHOOK_SECRET', names: ['STRIPE_WEBHOOK_SECRET'] },
  ]],
  ['AI', [
    { label: 'AI_GATEWAY_API_KEY or VERCEL_OIDC_TOKEN', names: ['AI_GATEWAY_API_KEY', 'VERCEL_OIDC_TOKEN'] },
  ]],
  ['App', [
    { label: 'NEXT_PUBLIC_APP_URL or NEXT_PUBLIC_SITE_URL', names: ['NEXT_PUBLIC_APP_URL', 'NEXT_PUBLIC_SITE_URL'] },
    { label: 'READINESS_TOKEN', names: ['READINESS_TOKEN'] },
    { label: 'SETUP_TOKEN', names: ['SETUP_TOKEN'] },
  ]],
]

function loadEnvFiles() {
  const values = new Map()

  for (const file of files) {
    const path = join(root, file)
    if (!existsSync(path)) continue

    const lines = readFileSync(path, 'utf8').split(/\r?\n/)
    for (const line of lines) {
      const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
      if (!match) continue
      values.set(match[1], match[2].trim())
    }
  }

  for (const [key, value] of Object.entries(process.env)) {
    if (value) values.set(key, value)
  }

  return values
}

const values = loadEnvFiles()
let ok = true
let trackedDotEnv = false
const localDotEnvExists = existsSync(join(root, '.env'))

try {
  execFileSync('git', ['ls-files', '--error-unmatch', '.env'], {
    cwd: root,
    stdio: 'ignore',
  })
  trackedDotEnv = true
} catch {
  trackedDotEnv = false
}

console.log('Operant account wiring check')
console.log('No secret values are printed.\n')

if (trackedDotEnv) {
  console.log('Warning: .env is currently tracked by git. Do not put real secrets in it.')
  console.log('Use .env.local for local secrets and Vercel Environment Variables for deployments.\n')
} else if (localDotEnvExists) {
  console.log('Note: a local .env file exists, but this checker only trusts .env.local and shell environment variables.')
  console.log('Move real local secrets to .env.local so local checks match the intended setup.\n')
}

for (const [group, checks] of required) {
  console.log(`${group}:`)
  for (const item of checks) {
    const foundValues = item.names.map((name) => values.get(name) ?? '').filter(Boolean)
    const present = foundValues.length > 0
    const valid = foundValues.some((value) => !placeholders.test(value) && (!item.validate || item.validate(value)))
    if (!item.optional) ok &&= valid
    const status = valid ? 'ok' : present ? 'invalid' : item.optional ? 'optional' : 'missing'
    console.log(`  ${status.padEnd(11)} ${item.label}`)
  }
  console.log('')
}

if (!ok) {
  console.log('Add the missing values to .env.local locally and to Vercel environment variables for production.')
  console.log('Do not put real secrets in tracked files.')
  process.exit(1)
}

console.log('All required account wiring variables are present.')
