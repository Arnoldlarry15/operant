export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const message = 'This chat endpoint has been retired. Use /api/chat with { companionId, message }.'

export async function GET() {
  return new Response(message, { status: 410 })
}

export async function POST() {
  return new Response(message, { status: 410 })
}
