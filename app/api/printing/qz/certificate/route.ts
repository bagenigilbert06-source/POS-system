import { NextResponse } from 'next/server'

export async function GET() {
  const certificate = process.env.QZ_CERTIFICATE?.replace(/\\n/g, '\n').trim()
  if (certificate) {
    return new NextResponse(certificate, {
      headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
    })
  }

  const unsignedDevelopmentAllowed =
    process.env.NODE_ENV === 'development' && process.env.QZ_ALLOW_UNSIGNED_DEVELOPMENT === 'true'

  if (unsignedDevelopmentAllowed) {
    return new NextResponse(null, {
      status: 204,
      headers: { 'cache-control': 'no-store', 'x-qz-unsigned-development': 'allowed' },
    })
  }

  return NextResponse.json(
    { error: 'QZ signing is not configured' },
    { status: 503, headers: { 'cache-control': 'no-store' } },
  )
}
