# Environment Variables Configuration Plan

## Current Status
⚠️ **BLOCKER:** Environment variables are NOT yet set in Vercel. Nothing will work until these are configured.

---

## Summary
The Operant app requires 24+ environment variables across 6 categories: AWS, Cognito, Aurora PostgreSQL, Stripe, PostHog Analytics, and AI Gateway. This plan documents which are truly required, which are optional, and the exact steps to set them in Vercel.

---

## Your Configuration Decisions (From User Input)

✅ **Cognito:** Client secret IS required → `COGNITO_USER_POOL_CLIENT_SECRET` is REQUIRED  
✅ **AI/LLM:** Using Vercel AI Gateway only → Only need `AI_GATEWAY_API_KEY` or `VERCEL_OIDC_TOKEN`  
✅ **Analytics:** PostHog needed for launch → `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST` are REQUIRED  

---

## STEP 1: SET ENVIRONMENT VARIABLES IN VERCEL (CRITICAL - DO THIS FIRST)

### Instructions:
1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**
2. Copy each required variable below and paste into Vercel
3. Make sure to set them for: **Production**, **Preview**, and **Development** environments
4. **Redeploy** after adding variables so they take effect

### REQUIRED Variables to Add to Vercel

**Copy-paste these into Vercel (fill in YOUR values):**

```
AWS_REGION=us-east-2
AWS_ROLE_ARN=arn:aws:iam::ACCOUNT_ID:role/vercel-oidc-role
PGHOST=database-1.cluster-xxxx.us-east-2.rds.amazonaws.com
PGDATABASE=operant_db
COGNITO_USER_POOL_ID=us-east-2_abc123xyz
COGNITO_USER_POOL_CLIENT_ID=1a2b3c4d5e6f7g8h9i0j
COGNITO_USER_POOL_CLIENT_SECRET=your_client_secret_here
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
NEXT_PUBLIC_APP_URL=https://operant.vercel.app
AGENT_ASSETS_BUCKET=operant-assets-prod
AWS_SECRETS_MANAGER_CONFIG_SECRET_ID=operant/prod/config
NEXT_PUBLIC_POSTHOG_KEY=phc_xxxxx
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
AI_GATEWAY_API_KEY=sk_gateway_xxxxx
READINESS_TOKEN=your_random_readiness_secret_here
SETUP_TOKEN=your_random_setup_secret_here
```

**Optional (defaults apply if missing, but readiness checks them):**
```
PGPORT=5432
PGUSER=postgres
PGSSLMODE=verify-full
COGNITO_USER_POOL_CLIENT_SECRET=only_if_your_client_requires_it
```

### Where to Get Each Value

| Variable | Where to Find It |
|----------|------------------|
| `AWS_REGION` | Your AWS region (e.g., us-east-2) |
| `AWS_ROLE_ARN` | AWS IAM → Roles → Your Vercel OIDC role → Copy ARN |
| `PGHOST` | AWS RDS → Databases → Your cluster → Connectivity & security → Writer endpoint |
| `PGDATABASE` | Your Aurora database name |
| `COGNITO_USER_POOL_ID` | AWS Cognito → User pools → Your pool → Pool ID |
| `COGNITO_USER_POOL_CLIENT_ID` | AWS Cognito → User pools → Your pool → App integration → App clients → Client ID |
| `COGNITO_USER_POOL_CLIENT_SECRET` | AWS Cognito → User pools → Your pool → App integration → App clients → Show Details → Client secret |
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API keys → Secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Developers → Webhooks → Signing secret |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe Dashboard → Developers → API keys → Publishable key |
| `NEXT_PUBLIC_APP_URL` | Your deployed app URL (e.g., https://operant.vercel.app) |
| `AGENT_ASSETS_BUCKET` | Your S3 bucket name for assets |
| `AWS_SECRETS_MANAGER_CONFIG_SECRET_ID` | Your Secrets Manager secret name/ID |
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog Dashboard → Project settings → API key |
| `NEXT_PUBLIC_POSTHOG_HOST` | https://us.i.posthog.com (or your PostHog instance URL) |
| `AI_GATEWAY_API_KEY` | Vercel Dashboard → Integrations → AI Gateway → API key |
| `READINESS_TOKEN` | Generate random string: `openssl rand -hex 32` |
| `SETUP_TOKEN` | Generate random string: `openssl rand -hex 32` |

---

## REQUIRED vs OPTIONAL Variables

### Category 1: AWS / Infrastructure
**All Required**
- `AWS_REGION` — AWS region (e.g., us-east-2). Throws error if missing.
- `AWS_ROLE_ARN` — IAM role ARN for Vercel OIDC. Required for RDS auth token generation.
- `AGENT_ASSETS_BUCKET` — S3 bucket name for agent files. Throws if missing.
- `AWS_SECRETS_MANAGER_CONFIG_SECRET_ID` — Secrets Manager config secret ID. Required for operational readiness.

**Analysis:** Using IAM role assumption with Vercel OIDC, NOT `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`. Do NOT store AWS keys in Vercel.

---

### Category 2: Cognito / Authentication
**Absolutely Required**
- `COGNITO_USER_POOL_ID` — User pool ID (e.g., us-east-2_abc123xyz)
- `COGNITO_USER_POOL_CLIENT_ID` — App client ID. Throws if missing.
- `COGNITO_USER_POOL_CLIENT_SECRET` — ✅ REQUIRED for your setup (your client requires it)

**Analysis:** App uses basic USER_PASSWORD_AUTH flow. No hosted UI or JWT verification.

---

### Category 3: Aurora PostgreSQL
**Required**
- `PGHOST` — Aurora cluster endpoint (e.g., database-1.cluster-xxxx.us-east-2.rds.amazonaws.com)
- `PGDATABASE` — Database name
- `AWS_REGION` — (also needed for IAM auth token generation)
- `AWS_ROLE_ARN` — (IAM auth assumption, not PGPASSWORD)

**Optional (but readiness checks them)**
- `PGPORT` — Defaults to 5432 if missing
- `PGUSER` — Defaults to 'postgres' if missing
- `PGSSLMODE` — Defaults to 'verify-full' if missing

**Authentication Method**
- **NOT using:** PGPASSWORD with static credentials
- **Using:** IAM database authentication via AWS Signer + Vercel OIDC
- **Implication:** No password needed; tokens generated at runtime

**⚠️ CRITICAL:** PGHOST must be reachable from Vercel. If you see a 500 error on `/api/auth/me`, the database is not reachable.

---

### Category 4: Stripe
**All Required**
- `STRIPE_SECRET_KEY` — Secret key for API calls. Throws if missing.
- `STRIPE_WEBHOOK_SECRET` — Webhook signing secret. Required to verify webhook signatures.
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — Public key for embedded checkout.

**One-of Required**
- `NEXT_PUBLIC_APP_URL` — App URL (e.g., https://operant.vercel.app)
- `NEXT_PUBLIC_SITE_URL` — Fallback if NEXT_PUBLIC_APP_URL is absent

---

### Category 5: PostHog Analytics
**✅ REQUIRED for your launch** (You confirmed you need analytics)
- `NEXT_PUBLIC_POSTHOG_KEY` — PostHog project key
- `NEXT_PUBLIC_POSTHOG_HOST` — PostHog ingestion host

---

### Category 6: AI / LLM Gateway
**One-of Required** (You're using Vercel AI Gateway only)
- `AI_GATEWAY_API_KEY` — Vercel AI Gateway API key
- `VERCEL_OIDC_TOKEN` — Alternative auth for Vercel AI Gateway

**Not needed:** Direct provider keys (OPENAI_API_KEY, ANTHROPIC_API_KEY, etc.) are NOT used.

---

### Category 7: App Protection / Operations
**All Required**
- `READINESS_TOKEN` — Secret token to access `/api/readiness` endpoint
- `SETUP_TOKEN` — Secret token to access `/api/db-setup` endpoint

---

## STEP 2: AFTER SETTING VERCEL ENV VARS (Only after Step 1 is complete)

Once all variables are set in Vercel and deployed:

### Verify Configuration Readiness
```bash
# In browser console on your deployed Vercel URL:
fetch('https://your-app.vercel.app/api/readiness?token=YOUR_READINESS_TOKEN', {
  method: 'GET'
})
.then(r => r.json())
.then(data => console.log(data))
```

Look for:
- ✅ All "ok: true" for configuration checks
- ⚠️ Database connectivity errors → Fix PGHOST or security groups
- ⚠️ S3 access errors → Fix AGENT_ASSETS_BUCKET or AWS credentials

### Initialize Aurora Schema (if not already done)
```bash
# Production setup (replace token with your SETUP_TOKEN):
fetch('https://your-app.vercel.app/api/db-setup?token=YOUR_SETUP_TOKEN&file=001-setup-schema.sql', {
  method: 'POST'
})
.then(r => r.json())
.then(data => console.log(data))

# Then full schema:
fetch('https://your-app.vercel.app/api/db-setup?token=YOUR_SETUP_TOKEN&file=003-full-aurora-schema.sql', {
  method: 'POST'
})
.then(r => r.json())
.then(data => console.log(data))
```

---

## STEP 3: TEST AUTH & CHECKOUT FLOW

Once database is initialized:

- [ ] Visit your app → Sign up at `/auth/sign-up`
- [ ] Confirm email with code
- [ ] Sign in at `/auth/login`
- [ ] Verify user avatar appears in navbar
- [ ] Add item to cart
- [ ] Click "Confirm Purchase" button
- [ ] Verify button is ENABLED (not grayed out) - this means `user` state loaded successfully
- [ ] Stripe embedded form should appear
- [ ] Complete test payment (use Stripe test card: 4242 4242 4242 4242)

---

## Files That Reference process.env

If you need to add new env vars in the future, check:
- `lib/aws.ts`
- `lib/cognito.ts`
- `lib/db.ts`
- `lib/s3.ts`
- `lib/stripe.ts`
- `lib/stripe-actions.ts`
- `lib/fulfill-order.ts`
- `lib/posthog.ts`
- `lib/ai-runtime.ts`
- `lib/readiness.ts`
- `components/stripe-checkout.tsx`
- `app/api/auth/confirm/route.ts`
- `app/api/readiness/route.ts`
- `app/api/db-setup/route.ts`
- `app/api/webhooks/stripe/route.ts`

---

## Code Changes Already Made (Previously)

The following code fixes have already been implemented:
- ✅ Fixed button rendering issues (Base UI semantics)
- ✅ Fixed AuthProvider loading (synchronous import instead of dynamic)
- ✅ Added success toasts for sign up/login/confirm
- ✅ Fixed cart sign-in visibility logic
- ✅ Added logout button
- ✅ Indentation fixes in auth routes
