import { timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { processDueMpesaProviderEvents } from '@/lib/mpesa/provider-event-processor'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function validSecret(value: string | null) {
  const expected = process.env.MPESA_RETRY_SECRET?.trim()
  if (!value || !expected) return false
  const left = Buffer.from(value); const right = Buffer.from(expected)
  return left.length === right.length && timingSafeEqual(left, right)
}

function validCronSecret(value: string | null) {
  const expected = process.env.CRON_SECRET?.trim()
  if (!value || !expected) return false
  const left = Buffer.from(value); const right = Buffer.from(expected)
  return left.length === right.length && timingSafeEqual(left, right)
}

async function run() {
  const results = await processDueMpesaProviderEvents(25)
  return NextResponse.json({ processed: results.length, statuses: results.map((result) => result.status) })
}

export async function POST(request: NextRequest) {
  if (!validSecret(request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? null))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return run()
}

/** Vercel Cron sends GET with Authorization: Bearer $CRON_SECRET. */
export async function GET(request: NextRequest) {
  if (!validCronSecret(request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? null))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return run()
}
