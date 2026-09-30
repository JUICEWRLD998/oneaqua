import { propose } from '../../../lib/proposer'
import { runtimeDeps } from '../../../lib/proposer/runtime'

export const dynamic = 'force-dynamic'

export async function POST(req: Request): Promise<Response> {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    body = undefined
  }
  const { http, json } = await propose(runtimeDeps(), body)
  return Response.json(json, { status: http })
}
