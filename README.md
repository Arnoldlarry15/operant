# Operant

Operant is an AI agent store built with Next.js. Customers can buy prebuilt AI agents, build custom agents from modular parts, purchase upgrades, assign those upgrades to owned agents, and chat with their paid agents.

Supabase is used for authentication only. Application data lives in Aurora PostgreSQL. Stripe handles checkout and payment webhooks.

## What This App Does

- Sells prebuilt AI agents.
- Lets customers build custom AI agents.
- Sells paid upgrades and skills.
- Assigns purchased upgrades to owned agents.
- Provides an embedded support and guidance bot for customers.
- Provisions paid agents only after Stripe confirms payment.

There is no free companion product in the active scope.

## Tech Stack

- Next.js App Router
- React
- Supabase Auth
- Aurora PostgreSQL
- Stripe Checkout
- Vercel AI SDK
- Vercel deployment

## Local Setup

Install dependencies:

```bash
npm install
```

Create local environment variables:

```bash
cp .env.example .env.local
```

Fill in the real values in `.env.local`, then check the account wiring:

```bash
npm run check:env
```

The check prints missing variable names only. It does not print secret values.

Do not put real secrets in `.env` or any tracked file. Use `.env.local` locally and Vercel Environment Variables in deployment.

Start the app:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Required Environment Variables

Supabase Auth:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_SITE_URL
```

Aurora PostgreSQL:

```text
PGHOST
PGDATABASE
PGUSER
AWS_REGION
AWS_ROLE_ARN
```

Stripe:

```text
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
```

AI:

```text
AI_GATEWAY_API_KEY
```

On Vercel, `VERCEL_OIDC_TOKEN` can satisfy AI Gateway auth instead when your project is linked and AI Gateway is enabled.

Customers do not need Anthropic, OpenAI, or other provider API keys to use purchased agents. Purchased agents run inside the hosted Operant dashboard after the customer signs in. The server-owned default model is set in `lib/agent-models.ts`.

Hosted paid-agent chat has a simple server-side usage guard: each paid agent can receive up to 100 customer messages per rolling 24-hour window. Adjust `DAILY_AGENT_MESSAGE_LIMIT` in `app/api/chat/route.ts` when pricing and plans are finalized.

The embedded support bot also validates message shape and size before calling the hosted model.

App/admin:

```text
NEXT_PUBLIC_APP_URL
READINESS_TOKEN
SETUP_TOKEN
```

`NEXT_PUBLIC_SITE_URL` may also be set for Supabase auth redirects. In production, keep `NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_SITE_URL` pointed at the same public Vercel domain.

## Vercel Deployment

Yes, Vercel needs the same real environment variables too.

Local `.env.local` values are only for your machine. Add production values in:

```text
Vercel Project -> Settings -> Environment Variables
```

Set them for Production, and also Preview if you want preview deployments to use real services.

## Stripe Setup

Use Stripe Checkout for payments.

Required webhook endpoint:

```text
https://your-domain.com/api/webhooks/stripe
```

Subscribe to:

```text
checkout.session.completed
checkout.session.async_payment_succeeded
checkout.session.async_payment_failed
checkout.session.expired
payment_intent.payment_failed
charge.refunded
charge.dispute.created
```

Put the webhook signing secret in:

```text
STRIPE_WEBHOOK_SECRET
```

## Aurora Setup

Run the schema setup route after `SETUP_TOKEN` and Aurora env vars are configured:

```text
POST /api/db-setup
Authorization: Bearer YOUR_SETUP_TOKEN
```

The setup route also accepts `?token=...` for manual browser testing, but bearer auth is preferred so tokens are less likely to appear in logs. The setup route only allows approved migration files from `scripts/`.

## Readiness Check

The readiness endpoint is admin-only and protected by `READINESS_TOKEN`.

Configuration-only check:

```text
GET /api/readiness
Authorization: Bearer YOUR_READINESS_TOKEN
```

Operational check with Aurora ping:

```text
GET /api/readiness?mode=operational
Authorization: Bearer YOUR_READINESS_TOKEN
```

## Verification Commands

Run these before deploying:

```bash
npm run check:env
npm run verify:production
npm run lint
npm run build
```

`npm run check:env` is expected to fail until real local or shell environment variables are present.

## Important Product Boundaries

- Supabase is auth only.
- Aurora stores users, agents, orders, conversations, skills, milestones, and fulfillment state.
- Stripe is the source of payment confirmation.
- Paid agents are provisioned from server-side catalog data, not client-submitted prices.
- Customers do not download, install, or run purchased agents; they use them from the hosted dashboard.
- The embedded support bot is guidance only and is not a sellable agent.
