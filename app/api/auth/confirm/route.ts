import { NextResponse } from 'next/server'
import { z } from 'zod'
import { CognitoIdentityProviderClient, ConfirmSignUpCommand } from '@aws-sdk/client-cognito-identity-provider'
import crypto from 'node:crypto'
import { getAwsRegion } from '@/lib/aws'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const schema = z.object({
  email: z.string().trim().email(),
  code: z.string().min(6).max(6),
})

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const clientId = process.env.COGNITO_USER_POOL_CLIENT_ID!
  const clientSecret = process.env.COGNITO_USER_POOL_CLIENT_SECRET

  const secretHash = clientSecret
    ? crypto.createHmac('sha256', clientSecret).update(`${parsed.data.email}${clientId}`).digest('base64')
    : undefined

  try {
    const client = new CognitoIdentityProviderClient({ region: getAwsRegion() })
    await client.send(new ConfirmSignUpCommand({
      ClientId: clientId,
      Username: parsed.data.email,
      ConfirmationCode: parsed.data.code,
      ...(secretHash ? { SecretHash: secretHash } : {}),
    }))

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Confirmation failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
