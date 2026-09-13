import { after, NextRequest, NextResponse } from 'next/server'
import { validCallbackToken } from '@/lib/mpesa/daraja'
import { processDueMpesaProviderEvents } from '@/lib/mpesa/provider-event-processor'
import { ingestSafaricomC2bConfirmation } from '@/lib/mpesa/c2b-ingestion'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const accepted = () => NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
const rejected = (description: string, status = 400) => NextResponse.json({ ResultCode: 1, ResultDesc: description }, { status })

/** Persist first and acknowledge. Financial work is performed by the durable retry worker. */
export async function POST(request: NextRequest) {
  if (!validCallbackToken(request.nextUrl.searchParams.get('token'), 'c2b-confirmation')) return rejected('Rejected', 401)
  let payload: unknown
  try { payload = await request.json() } catch { return rejected('Invalid request') }
  try {
    const ingested = await ingestSafaricomC2bConfirmation(payload)
    if (ingested.eventId) after(async () => { await processDueMpesaProviderEvents(1) })
    // A provider retry is acknowledged without mutating the first event's audit state.
    return accepted()
  } catch { return rejected('Could not record payment', 503) }
}
