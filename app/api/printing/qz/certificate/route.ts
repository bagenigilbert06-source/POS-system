import { NextResponse } from 'next/server'

export async function GET() {
  const certificate = process.env.QZ_CERTIFICATE?.replace(/\\n/g, '\n').trim()
  return certificate ? new NextResponse(certificate, { headers: { 'content-type': 'text/plain', 'cache-control': 'no-store' } }) : new NextResponse('', { status: 404 })
}
