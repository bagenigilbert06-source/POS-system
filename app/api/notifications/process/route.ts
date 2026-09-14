import { timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { materializeNotificationEvents } from '@/lib/notifications/materialize'
import { processDueNotifications } from '@/lib/notifications/processor'
import { createDueDigestEvents } from '@/lib/notifications/digest'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function authorized(request: NextRequest) {
  const expected = process.env.CRON_SECRET?.trim(), provided = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? ''
  if (!expected || !provided) return false
  const left = Buffer.from(provided), right = Buffer.from(expected)
  return left.length === right.length && timingSafeEqual(left, right)
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const digests = await createDueDigestEvents()
  const materialized = await materializeNotificationEvents(25)
  const statuses = await processDueNotifications(25)
  return NextResponse.json({ digests, materialized, processed: statuses.length, sent: statuses.filter((status) => status === 'SENT').length, failed: statuses.filter((status) => status !== 'SENT').length })
}
