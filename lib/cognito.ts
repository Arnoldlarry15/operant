import 'server-only'

import {
  CognitoIdentityProviderClient,
  ConfirmSignUpCommand,
  GetUserCommand,
  InitiateAuthCommand,
  SignUpCommand,
  type AuthenticationResultType,
  type AttributeType,
} from '@aws-sdk/client-cognito-identity-provider'
import crypto from 'node:crypto'
import { cookies } from 'next/headers'
import type { NextResponse } from 'next/server'
import { getAwsRegion } from '@/lib/aws'

export type CognitoAppUser = {
  id: string
  email: string
  name: string | null
  user_metadata: {
    display_name?: string | null
    name?: string | null
  }
}

export const authCookieNames = {
  access: 'operant_access_token',
  id: 'operant_id_token',
  refresh: 'operant_refresh_token',
  expiresAt: 'operant_auth_expires_at',
} as const

let client: CognitoIdentityProviderClient | null = null

function getCognitoClient(): CognitoIdentityProviderClient {
  client ??= new CognitoIdentityProviderClient({ region: getAwsRegion() })
  return client
}

function getUserPoolClientId(): string {
  const clientId = process.env.COGNITO_USER_POOL_CLIENT_ID
  if (!clientId) throw new Error('COGNITO_USER_POOL_CLIENT_ID is not configured')
  return clientId
}

function getSecretHash(email: string): string | undefined {
  const clientSecret = process.env.COGNITO_USER_POOL_CLIENT_SECRET
  if (!clientSecret) return undefined

  return crypto
    .createHmac('sha256', clientSecret)
    .update(`${email}${getUserPoolClientId()}`)
    .digest('base64')
}

function getAttribute(attributes: AttributeType[] | undefined, name: string): string | null {
  return attributes?.find((attribute) => attribute.Name === name)?.Value ?? null
}

function toAppUser(attributes: AttributeType[] | undefined): CognitoAppUser | null {
  const id = getAttribute(attributes, 'sub')
  const email = getAttribute(attributes, 'email')
  if (!id || !email) return null

  const name = getAttribute(attributes, 'name')

  return {
    id,
    email,
    name,
    user_metadata: {
      display_name: name,
      name,
    },
  }
}

function cookieOptions(maxAge?: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    ...(maxAge ? { maxAge } : {}),
  }
}

export function setAuthCookies(response: NextResponse, auth: AuthenticationResultType): void {
  if (!auth.AccessToken || !auth.IdToken) throw new Error('Cognito did not return access and id tokens')

  const expiresIn = auth.ExpiresIn ?? 3600
  response.cookies.set(authCookieNames.access, auth.AccessToken, cookieOptions(expiresIn))
  response.cookies.set(authCookieNames.id, auth.IdToken, cookieOptions(expiresIn))
  response.cookies.set(authCookieNames.expiresAt, String(Date.now() + expiresIn * 1000), cookieOptions(expiresIn))

  if (auth.RefreshToken) {
    response.cookies.set(authCookieNames.refresh, auth.RefreshToken, cookieOptions(30 * 24 * 60 * 60))
  }
}

export function clearAuthCookies(response: NextResponse): void {
  for (const name of Object.values(authCookieNames)) {
    response.cookies.set(name, '', { ...cookieOptions(), maxAge: 0 })
  }
}

export async function signInWithCognito(email: string, password: string): Promise<AuthenticationResultType> {
  const secretHash = getSecretHash(email)
  const result = await getCognitoClient().send(
    new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: getUserPoolClientId(),
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
        ...(secretHash ? { SECRET_HASH: secretHash } : {}),
      },
    }),
  )

  if (!result.AuthenticationResult) throw new Error('Cognito sign-in did not return a session')
  return result.AuthenticationResult
}

export async function signUpWithCognito(input: {
  email: string
  password: string
  displayName: string
}): Promise<void> {
  const secretHash = getSecretHash(input.email)
  await getCognitoClient().send(
    new SignUpCommand({
      ClientId: getUserPoolClientId(),
      Username: input.email,
      Password: input.password,
      UserAttributes: [
        { Name: 'email', Value: input.email },
        { Name: 'name', Value: input.displayName },
      ],
      ...(secretHash ? { SecretHash: secretHash } : {}),
    }),
  )
}

export async function confirmSignUpWithCognito(email: string, code: string): Promise<void> {
  const secretHash = getSecretHash(email)
  await getCognitoClient().send(
    new ConfirmSignUpCommand({
      ClientId: getUserPoolClientId(),
      Username: email,
      ConfirmationCode: code,
      ...(secretHash ? { SecretHash: secretHash } : {}),
    }),
  )
}

export async function refreshCognitoSession(): Promise<AuthenticationResultType | null> {
  const cookieStore = await cookies()
  const refreshToken = cookieStore.get(authCookieNames.refresh)?.value
  if (!refreshToken) return null

  const clientId = getUserPoolClientId()
  const clientSecret = process.env.COGNITO_USER_POOL_CLIENT_SECRET

  // For refresh token flow, SECRET_HASH uses the username stored in the id token
  const idToken = cookieStore.get(authCookieNames.id)?.value
  let username = ''
  if (idToken) {
    try {
      const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString())
      username = payload['cognito:username'] ?? payload.sub ?? ''
    } catch {
      username = ''
    }
  }

  const secretHash = clientSecret
    ? crypto.createHmac('sha256', clientSecret).update(`${username}${clientId}`).digest('base64')
    : undefined

    const result = await getCognitoClient().send(
      new InitiateAuthCommand({
        AuthFlow: 'REFRESH_TOKEN_AUTH',
        ClientId: clientId,
        AuthParameters: {
          REFRESH_TOKEN: refreshToken,
          ...(secretHash ? { SECRET_HASH: secretHash } : {}),
        },
      }),
    )
  return result.AuthenticationResult ?? null
}

export async function getCognitoUserFromAccessToken(accessToken: string): Promise<CognitoAppUser | null> {
  try {
    const result = await getCognitoClient().send(new GetUserCommand({ AccessToken: accessToken }))
    return toAppUser(result.UserAttributes)
  } catch {
    return null
  }
}

export async function getCognitoUserFromCookies(): Promise<CognitoAppUser | null> {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get(authCookieNames.access)?.value
  if (!accessToken) return null

  return getCognitoUserFromAccessToken(accessToken)
}

export function hasCognitoConfig(): boolean {
  return Boolean(process.env.COGNITO_USER_POOL_ID && process.env.COGNITO_USER_POOL_CLIENT_ID)
}
