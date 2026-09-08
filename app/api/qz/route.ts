import { createSign } from 'node:crypto'
import { getCurrentSession } from '@/lib/auth'
import { qzSigningConfiguration } from '@/lib/printing/qz-config'

export const runtime = 'nodejs'

function envValue(value: string | undefined) {
  return value?.replace(/\\n/g, '\n').trim() || ''
}

export async function GET() {
  const certificate = envValue(process.env.QZ_CERTIFICATE)
  if (!certificate && process.env.NODE_ENV === 'development' && process.env.QZ_ALLOW_UNSIGNED_DEVELOPMENT === 'true')
    return new Response(null, { status: 204, headers: { 'x-qz-unsigned-development': 'allowed', 'x-qz-signing-status': 'development-unsigned' } })
  if (!certificate) return new Response('QZ trusted printing is not configured on this server.', { status: 503, headers: { 'x-qz-signing-status': 'not-configured' } })
  return new Response(certificate, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store', 'x-qz-signing-status': 'trusted' } })
}

export async function POST(request: Request) {
  if (!(await getCurrentSession())?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const privateKey = envValue(process.env.QZ_PRIVATE_KEY)
  if (!qzSigningConfiguration().privateKeyConfigured) return Response.json({ error: 'QZ trusted printing is not configured on this server.' }, { status: 503 })
  const body = (await request.json().catch(() => null)) as { request?: unknown } | null
  if (!body || typeof body.request !== 'string' || body.request.length > 1_000_000)
    return Response.json({ error: 'Invalid signing payload' }, { status: 400 })
  const signer = createSign('SHA512')
  signer.update(body.request)
  signer.end()
  try {
    return Response.json({ signature: signer.sign(privateKey, 'base64') }, { headers: { 'cache-control': 'no-store' } })
  } catch {
    return Response.json({ error: 'QZ signing failed on this server.' }, { status: 503 })
  }
}
