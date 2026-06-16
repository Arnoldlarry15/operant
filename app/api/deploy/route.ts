export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  return Response.json(
    {
      error: 'Agent downloads are retired',
      message: 'Purchased Operant agents run inside the hosted web dashboard. Open your dashboard to use your agent.',
    },
    { status: 410 },
  )
}



