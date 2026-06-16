export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const message = 'Legacy free chat has been removed. Use /api/chat/support for embedded guidance.'

export async function GET() {
  return new Response(message, { status: 410 })
}

export async function POST() {
  return new Response(message, { status: 410 })
}
