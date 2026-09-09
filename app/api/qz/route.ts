import { createSign } from 'node:crypto'
import { getCurrentSession } from '@/lib/auth'
import {
  normalizedQzCertificate,
  normalizedQzPrivateKey,
  qzSigningConfiguration,
} from '@/lib/printing/qz-config'

export const runtime = 'nodejs'

const noStoreHeaders = { 'cache-control': 'no-store' }

export async function GET() {
  const certificate = normalizedQzCertificate()
  if (!certificate && process.env.NODE_ENV === 'development' && process.env.QZ_ALLOW_UNSIGNED_DEVELOPMENT === 'true')
    return new Response(null, { status: 204, headers: { ...noStoreHeaders, 'x-qz-unsigned-development': 'allowed', 'x-qz-signing-status': 'development-unsigned' } })
  if (!certificate) return new Response('QZ trusted printing is not configured on this server.', { status: 503, headers: { ...noStoreHeaders, 'x-qz-signing-status': 'not-configured' } })
  return new Response(certificate, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store', 'x-qz-signing-status': 'trusted' } })
}

export async function POST(request: Request) {
  if (!(await getCurrentSession())?.user) return Response.json({ error: 'Unauthorized' }, { status: 401, headers: noStoreHeaders })
  const privateKey = normalizedQzPrivateKey()
  const signingConfiguration = qzSigningConfiguration()
  if (!privateKey || !signingConfiguration.privateKeyConfigured || !signingConfiguration.keyPairMatches)
    return Response.json({ error: 'QZ trusted printing is not configured on this server.' }, { status: 503, headers: noStoreHeaders })
  const toSign = await request.text()
  if (!toSign || toSign.length > 1_000_000)
    return Response.json({ error: 'Invalid signing payload' }, { status: 400, headers: noStoreHeaders })
  const signer = createSign('SHA512')
  signer.update(toSign, 'utf8')
  signer.end()
  try {
    const signature = signer.sign(privateKey, 'base64')
    return new Response(signature, {
      headers: { 'content-type': 'text/plain', 'cache-control': 'no-store' },
    })
  } catch {
    return Response.json({ error: 'QZ signing failed on this server.' }, { status: 503, headers: noStoreHeaders })
  }
}
