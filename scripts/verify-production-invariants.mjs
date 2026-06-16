import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const root = process.cwd()
const scanRoots = ['app', 'components', 'lib'].map((dir) => join(root, dir))

function walk(dir) {
  const entries = []
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    const stat = statSync(path)
    if (stat.isDirectory()) {
      entries.push(...walk(path))
    } else if (/\.(ts|tsx|js|jsx)$/.test(name)) {
      entries.push(path)
    }
  }
  return entries
}

const files = scanRoots.flatMap((dir) => (existsSync(dir) ? walk(dir) : []))
const read = (path) => readFileSync(path, 'utf8')
const rel = (path) => relative(root, path).replaceAll('\\', '/')

const failures = []

function assertNoMatch(description, pattern, filter = () => true) {
  for (const file of files.filter(filter)) {
    const text = read(file)
    if (pattern.test(text)) {
      failures.push(`${description}: ${rel(file)}`)
    }
  }
}

function assertFileContains(path, description, pattern) {
  const fullPath = join(root, path)
  if (!existsSync(fullPath)) {
    failures.push(`${description}: missing ${path}`)
    return
  }
  if (!pattern.test(read(fullPath))) {
    failures.push(`${description}: ${path}`)
  }
}

assertNoMatch(
  'Supabase must not be used for app data',
  /supabase\.(from|rpc|storage)|\.from\(['"`](profiles|companions)['"`]\)|SUPABASE_SERVICE_ROLE_KEY|createAdminClient/,
)

assertNoMatch(
  'Free companion product paths must not exist',
  /createFreeCompanion|generateFreeAI|freeAIPersonalities|initFreeAI|freeAIMessages|freeAIXP|Meet My Free AI/,
)

assertNoMatch(
  'Paid upgrades must only install from pending Aurora rows',
  /export async function installSkill|export async function installCompanionSkill/,
)

assertNoMatch(
  'User-facing companion product copy must not return',
  /free AI companion|free AI agent|premium AI companion|AI Companion|AI companion|companion-bot product|Pre-built AIs|purchased companions|Your companions|Loading companion|level up your companion|Your companion ID|companions and data/i,
  (file) => !rel(file).startsWith('app/api/chat/free/'),
)

assertNoMatch(
  'Customer-facing production URLs must use the configured Operant domain',
  /https:\/\/operant\.ai|support@operant\.ai/,
)

assertNoMatch(
  'Customers must not be asked for provider API keys to use purchased agents',
  /ANTHROPIC_API_KEY|OPENAI_API_KEY|sk-ant|Get a free API key|Enter your Anthropic API key|pip install anthropic|import anthropic/,
)

assertFileContains(
  'app/api/chat/free/route.ts',
  'Legacy free chat route must be gone',
  /status:\s*410/,
)

assertFileContains(
  'app/api/chat/companion/route.ts',
  'Legacy companion chat endpoint must be retired',
  /status:\s*410/,
)

assertFileContains(
  'app/api/companions/route.ts',
  'Direct agent API creation must stay disabled',
  /Direct agent creation is disabled\. Use Stripe Checkout\./,
)

assertFileContains(
  'app/api/db-setup/route.ts',
  'Setup endpoint must restrict runnable migration files',
  /allowedMigrationFiles[\s\S]*Bearer[\s\S]*SETUP_TOKEN[\s\S]*Migration file is not allowed|allowedMigrationFiles[\s\S]*Cache-Control[\s\S]*Bearer[\s\S]*SETUP_TOKEN[\s\S]*Migration file is not allowed/,
)

assertFileContains(
  'app/api/readiness/route.ts',
  'Readiness endpoint must require READINESS_TOKEN',
  /READINESS_TOKEN[\s\S]*Bearer[\s\S]*Cache-Control|Cache-Control[\s\S]*READINESS_TOKEN[\s\S]*Bearer/,
)

assertFileContains(
  'lib/stripe.ts',
  'Stripe client must not use placeholder API keys',
  /export function getStripe/,
)

assertFileContains(
  'lib/readiness.ts',
  'Readiness checks must cover required production service configuration',
  /NEXT_PUBLIC_SUPABASE_URL[\s\S]*PGHOST[\s\S]*STRIPE_SECRET_KEY[\s\S]*STRIPE_WEBHOOK_SECRET[\s\S]*AI_GATEWAY_API_KEY[\s\S]*SETUP_TOKEN/,
)

assertFileContains(
  'lib/actions.ts',
  'Direct checkout server action must stay disabled',
  /Direct checkout is disabled\. Use Stripe Checkout\./,
)

assertFileContains(
  'lib/actions.ts',
  'Upgrade assignment server action must validate browser-submitted ids',
  /assignPendingSkillSchema[\s\S]*\.uuid\([\s\S]*safeParse/,
)

assertNoMatch(
  'Browser-callable server actions must not write conversation messages directly',
  /export async function (saveMessage|updateCompanionXP|completeMilestone)\(/,
  (file) => rel(file) === 'lib/actions.ts',
)

assertNoMatch(
  'Unused direct fulfillment helper exports must not return',
  /export async function (completeMilestone|getMilestones|insertPendingSkill|findOrderByStripeSession)\(/,
)

assertFileContains(
  'package.json',
  'Package scripts must include the simple environment wiring check',
  /"check:env": "node scripts\/check-env\.mjs"/,
)

assertFileContains(
  'scripts/check-env.mjs',
  'Environment wiring check must not print full secret values',
  /No secret values are printed/,
)

assertFileContains(
  '.gitignore',
  'Real .env files must be ignored while .env.example remains trackable',
  /\.env[\s\S]*!\.env\.example/,
)

assertFileContains(
  'scripts/check-env.mjs',
  'Environment wiring check must read the safe local env file',
  /const files = \['\.env\.local'\]/,
)

assertFileContains(
  'scripts/check-env.mjs',
  'Environment wiring check must warn if .env is tracked',
  /Warning: \.env is currently tracked by git/,
)

assertFileContains(
  'scripts/check-env.mjs',
  'Environment wiring check must accept Vercel OIDC for AI Gateway auth',
  /AI_GATEWAY_API_KEY or VERCEL_OIDC_TOKEN/,
)

assertFileContains(
  'lib/db.ts',
  'Aurora database client must stay server-only',
  /import 'server-only'/,
)

assertFileContains(
  'lib/queries.ts',
  'Aurora query helpers must stay server-only',
  /import 'server-only'/,
)

assertFileContains(
  'lib/app-state.ts',
  'Client cart state must reuse the shared checkout item contract',
  /import type \{ CheckoutCartItem, CheckoutCartItemCompanionMeta \} from '\.\/checkout-types'/,
)

const fulfillment = read(join(root, 'lib/fulfill-order.ts'))
const stripeActions = read(join(root, 'lib/stripe-actions.ts'))
const stripeCheckout = read(join(root, 'components/stripe-checkout.tsx'))
const stripeWebhook = read(join(root, 'app/api/webhooks/stripe/route.ts'))
const chatRoute = read(join(root, 'app/api/chat/route.ts'))
const supportChatRoute = read(join(root, 'app/api/chat/support/route.ts'))
const companionPage = read(join(root, 'app/companion/[id]/page.tsx'))
const dashboardPage = read(join(root, 'components/dashboard-page.tsx'))
const deployRoute = read(join(root, 'app/api/deploy/route.ts'))
const agentCapabilities = read(join(root, 'lib/agent-capabilities.ts'))
const storeData = read(join(root, 'lib/store-data.ts'))
const agentModels = read(join(root, 'lib/agent-models.ts'))
const aiRuntime = read(join(root, 'lib/ai-runtime.ts'))
const orderInsertIndex = fulfillment.indexOf('INSERT INTO orders')
const agentInsertIndex = fulfillment.indexOf('INSERT INTO companions')
if (orderInsertIndex === -1 || agentInsertIndex === -1 || orderInsertIndex > agentInsertIndex) {
  failures.push('Fulfillment must insert the idempotent order before creating agents')
}

if (!/order_id/.test(fulfillment) || !/listFulfilledAgentsForOrder/.test(fulfillment) || !/order\.status === 'completed'[\s\S]*listFulfilledAgentsForOrder/.test(fulfillment)) {
  failures.push('Fulfillment must link created agents to orders and return them for already-completed sessions')
}

if (!/listFulfilledAgentsForStripeSession/.test(fulfillment) || !/pgErr\?\.code === '23505'[\s\S]*listFulfilledAgentsForStripeSession/.test(fulfillment)) {
  failures.push('Fulfillment unique-conflict fallback must return linked agents when possible')
}

if (/^['"]use client['"]/m.test(storeData)) {
  failures.push('Catalog data must stay server-safe because checkout and fulfillment import it')
}

if (!/withTransaction/.test(fulfillment)) {
  failures.push('Fulfillment must run order, agent, and upgrade writes in one Aurora transaction')
}

if (!/status,\s*stripe_session_id\)\s*[\s\S]*'pending'/.test(stripeActions)) {
  failures.push('Checkout must create a pending Aurora order keyed by the Stripe session')
}

if (/localhost:3000/.test(stripeActions) || !/NEXT_PUBLIC_APP_URL is not configured/.test(stripeActions)) {
  failures.push('Stripe Checkout return URLs must require configured app URL, not localhost fallback')
}

if (!/status\s+VARCHAR\(20\) NOT NULL DEFAULT 'pending'/.test(read(join(root, 'scripts/001-setup-schema.sql'))) || !/ALTER COLUMN status SET DEFAULT 'pending'/.test(read(join(root, 'scripts/003-full-aurora-schema.sql')))) {
  failures.push('Aurora order status must default to pending until Stripe fulfillment completes')
}

if (!/checkout\.sessions\.expire\(session\.id\)/.test(stripeActions)) {
  failures.push('Checkout must expire the Stripe session if pending Aurora order creation fails')
}

if (!/checkout\.session\.async_payment_succeeded/.test(stripeWebhook)) {
  failures.push('Stripe webhook must fulfill async Checkout payments after they succeed')
}

if (!/checkout\.session\.async_payment_failed/.test(stripeWebhook) || !/checkout\.session\.expired/.test(stripeWebhook) || !/updateOrderStatusByStripeSession\(session\.id,\s*'failed'\)/.test(stripeWebhook)) {
  failures.push('Stripe webhook must persist failed or expired Checkout session state to Aurora')
}

if (!/charge\.refunded/.test(stripeWebhook) || !/allowCompleted:\s*true/.test(stripeWebhook)) {
  failures.push('Stripe webhook must persist refunded completed orders without weakening failed-session protection')
}

if (!/session\.payment_status !== 'paid'/.test(stripeWebhook)) {
  failures.push('Stripe webhook must not provision agents before Checkout payment status is paid')
}

if (!/Payment not completed/.test(stripeWebhook)) {
  failures.push('Stripe webhook must acknowledge not-yet-paid sessions instead of retrying forever')
}

if (!/function canonicalizeCartItem/.test(stripeActions) || /function getCanonicalPrice/.test(stripeActions)) {
  failures.push('Checkout must rebuild canonical cart items, not only canonical prices')
}

if (!/checkoutCartSchema/.test(stripeActions) || !/safeParse\(input\)/.test(stripeActions) || !/\.max\(25\)/.test(stripeActions) || !/\.strict\(\)/.test(stripeActions)) {
  failures.push('Checkout must validate and bound browser-submitted cart payloads before Stripe session creation')
}

if (!/DEFAULT_AGENT_MODEL/.test(agentModels) || !/model:\s*DEFAULT_AGENT_MODEL/.test(stripeActions) || !/model:\s*DEFAULT_AGENT_MODEL/.test(fulfillment)) {
  failures.push('Paid agent model selection must be server-owned, not controlled by cart metadata')
}

if (!/hasAiGatewayAuth/.test(aiRuntime) || !/resolveAgentModel/.test(aiRuntime) || !/hasAiGatewayAuth\(\)/.test(chatRoute) || !/resolveAgentModel\(companion\.model\)/.test(chatRoute) || !/hasAiGatewayAuth\(\)/.test(supportChatRoute)) {
  failures.push('Hosted chat must verify AI Gateway auth and sanitize stored model slugs before model calls')
}

if (chatRoute.indexOf('hasAiGatewayAuth()') > chatRoute.indexOf("saveMessage(user.id, companionId, 'user', message)")) {
  failures.push('Paid chat must verify AI Gateway auth before saving customer messages')
}

if (/gpt-4o/.test(agentModels + read(join(root, 'scripts/001-setup-schema.sql'))) || !/ALTER COLUMN model SET DEFAULT 'openai\/gpt-5\.4'/.test(read(join(root, 'scripts/003-full-aurora-schema.sql')))) {
  failures.push('Paid agent and support defaults must use the current server-owned AI Gateway model')
}

const types = read(join(root, 'lib/types.ts'))
const checkoutTypes = read(join(root, 'lib/checkout-types.ts'))
const publicCheckoutItemType = checkoutTypes.match(/export type CheckoutCartItem =[\s\S]*?\n}/)?.[0] ?? ''
const publicCompanionMetaType = checkoutTypes.match(/export type CheckoutCartItemCompanionMeta =[\s\S]*?\n}/)?.[0] ?? ''
if (/model\?:/.test(publicCheckoutItemType + publicCompanionMetaType) || /model:\s*z\.string/.test(types) || /companionMeta\?\.model|meta\.model/.test(stripeActions + fulfillment)) {
  failures.push('Checkout and fulfillment must not accept client-submitted agent model metadata')
}

if (!/emoji:\s*meta\.emoji \?\? 'AI'/.test(stripeActions + fulfillment)) {
  failures.push('Fallback agent emoji default must stay ASCII-safe')
}

if (!/orderItems\.push\(canonicalItem\)/.test(stripeActions) || !/canonicalItem\.type/.test(stripeActions)) {
  failures.push('Checkout must persist canonical item type and metadata in the pending Aurora order')
}

if (!/expectedUserId/.test(fulfillment) || !/Checkout session does not belong to the current user/.test(fulfillment)) {
  failures.push('Client fallback fulfillment must verify the checkout session belongs to the authenticated Aurora user')
}

if (!/session\.metadata\.user_id !== auroraUser\.id/.test(fulfillment)) {
  failures.push('Fulfillment must verify Stripe user metadata matches the resolved Aurora user')
}

if (!/fulfillCheckoutSession\(sessionId,\s*\{\s*expectedUserId:\s*user\.id\s*\}\)/.test(stripeActions)) {
  failures.push('Browser fallback fulfillment must pass the authenticated Aurora user id')
}

if (!/sessionIdRef/.test(stripeCheckout) || !/setFulfillmentError/.test(stripeCheckout)) {
  failures.push('Embedded checkout must keep a stable session id and show retryable fulfillment errors')
}

if (!/checkoutError/.test(stripeCheckout) || !/Retry checkout/.test(stripeCheckout) || !/key=\{checkoutAttempt\}/.test(stripeCheckout)) {
  failures.push('Embedded checkout must show retryable startup errors when Stripe session creation fails')
}

if (!/if \(!result\?\.success\)/.test(stripeCheckout)) {
  failures.push('Embedded checkout must not clear the cart or show success when fallback fulfillment fails')
}

if (!/Open your dashboard to see fulfilled agents and upgrades/.test(stripeCheckout)) {
  failures.push('Checkout success must guide customers to fulfilled agents and upgrades when the webhook fulfills first')
}

if (!/buildPaidAgentSystemPrompt/.test(chatRoute) || !/Purchased capability profile/.test(agentCapabilities)) {
  failures.push('Paid chat agents must use the catalog-backed capability profile')
}

if (!/DAILY_AGENT_MESSAGE_LIMIT/.test(chatRoute) || !/countUserMessagesSince/.test(chatRoute) || !/status:\s*429/.test(chatRoute)) {
  failures.push('Paid hosted chat must enforce a simple server-side usage limit before model calls')
}

const assistantSaveIndex = chatRoute.indexOf("saveMessage(user.id, companionId, 'assistant', text)")
const xpAwardIndex = chatRoute.indexOf('addCompanionXP(user.id, companionId, 8)')
if (assistantSaveIndex === -1 || xpAwardIndex === -1 || xpAwardIndex < assistantSaveIndex) {
  failures.push('Paid chat must award XP only after saving a successful assistant response')
}

if (!/supportChatSchema/.test(supportChatRoute) || !/\.max\(30\)/.test(supportChatRoute) || !/\.max\(4000\)/.test(supportChatRoute) || /rawMessages\.slice/.test(supportChatRoute)) {
  failures.push('Support chat must validate and bound customer messages before hosted model calls')
}

if (!/z\.enum\(\['user', 'assistant'\]\)/.test(supportChatRoute)) {
  failures.push('Support chat must not accept browser-supplied system messages')
}

if (!/toTextStreamResponse/.test(chatRoute) || !/toTextStreamResponse/.test(supportChatRoute)) {
  failures.push('Chat API routes must return plain text streams for the simple fetch-based chat UI')
}

if (/text-delta|trimmed\.startsWith\('data:'\)/.test(companionPage) || /text-delta|trimmed\.startsWith\('data:'\)/.test(dashboardPage)) {
  failures.push('Simple chat UIs must not parse AI SDK UI-message SSE chunks')
}

if (!/orderStatusTone/.test(dashboardPage) || !/order\.status/.test(dashboardPage)) {
  failures.push('Dashboard order history must show Aurora order status for checkout support')
}

if (!/status:\s*410/.test(deployRoute) || !/Agent downloads are retired/.test(deployRoute)) {
  failures.push('Customer agent download/deploy route must stay retired for the hosted web app version')
}

if (/DeployModal/.test(companionPage + dashboardPage)) {
  failures.push('Customer download/deploy modal must not be imported in the hosted web app version')
}

if (/DeployModal|Deploy My AI|\/api\/deploy|Download ZIP|launch_macos|launch_windows|PWA access|deploy launchers/.test(companionPage + dashboardPage + read(join(root, 'README.md')))) {
  failures.push('Customer UI/docs must not offer agent downloads, launchers, or deploy flows')
}

if (/Higher levels unlock more advanced capabilities/.test(companionPage)) {
  failures.push('Agent UI must not promise level-based capability unlocks that are not implemented')
}

if (!/FOR UPDATE/.test(fulfillment)) {
  failures.push('Fulfillment must lock the pending order row before creating agents')
}

if (!/order\.total_cents !== totalCents/.test(fulfillment)) {
  failures.push('Fulfillment must verify the paid Stripe amount matches the pending Aurora order')
}

if (!/SET status = 'completed'/.test(fulfillment)) {
  failures.push('Fulfillment must mark the pending order completed inside the transaction')
}

if (!/Paid agent item could not be resolved from catalog/.test(fulfillment)) {
  failures.push('Fulfillment must reject paid agent items that do not resolve to the server catalog')
}

if (!/Paid upgrade item could not be resolved from catalog/.test(fulfillment)) {
  failures.push('Fulfillment must reject paid upgrade items that do not resolve to the server catalog')
}

const queries = read(join(root, 'lib/queries.ts'))
if (!/export async function updateOrderStatusByStripeSession/.test(queries) || !/\$3::boolean OR status <> 'completed'/.test(queries)) {
  failures.push('Order status updates must preserve completed fulfillment rows')
}

if (!/ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders\(id\) ON DELETE SET NULL/.test(read(join(root, 'scripts/003-full-aurora-schema.sql')))) {
  failures.push('Aurora schema must link fulfilled agents back to their source order')
}

if (!/export async function countUserMessagesSince/.test(queries) || !/conversations\.created_at >= \$3/.test(queries)) {
  failures.push('Aurora queries must support rolling usage limits for hosted paid chat')
}

if (!/FOR UPDATE/.test(queries) || !/DELETE FROM pending_skills/.test(queries)) {
  failures.push('Upgrade assignment must lock and consume the pending upgrade row in Aurora')
}

if (!/GREATEST\(level,\s*FLOOR\(\(xp \+ \$3\) \/ 100\)::INT \+ 1\)/.test(queries)) {
  failures.push('Agent XP updates must use monotonic floored level calculation')
}

if (failures.length) {
  console.error('Production invariant check failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Production invariant check passed.')
