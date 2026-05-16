// GET /api/ai/health
// Returns availability status for all configured providers.
import { checkAllProviders } from '@/lib/ai/registry'

export const runtime = 'nodejs'

export async function GET() {
  const status = await checkAllProviders()
  return Response.json({
    providers: status,
    timestamp: Date.now(),
  })
}
