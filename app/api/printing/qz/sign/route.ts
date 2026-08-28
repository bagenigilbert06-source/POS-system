import { createSign } from 'node:crypto'
import { getCurrentSession } from '@/lib/auth'

export async function POST(request: Request) {
  const session = await getCurrentSession()
  if (!session?.user) return new Response('Unauthorized', { status: 401 })
  const privateKey = process.env.QZ_PRIVATE_KEY?.replace(/\\n/g, '\n').trim()
  if (!privateKey) return new Response('QZ signing is not configured', { status: 503 })
  const payload = await request.text()
  if (!payload || payload.length > 1_000_000) return new Response('Invalid signing payload', { status: 400 })
  const signer = createSign('SHA512'); signer.update(payload); signer.end()
  return new Response(signer.sign(privateKey, 'base64'), { headers: { 'content-type': 'text/plain', 'cache-control': 'no-store' } })
}
