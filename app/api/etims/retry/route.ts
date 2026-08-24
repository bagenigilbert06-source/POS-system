import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { processDueEtimsCreditNoteRetries, processDueEtimsRetries } from '@/lib/etims/service'

function validSecret(value: string | null) {
  const expected = process.env.ETIMS_RETRY_SECRET
  if (!value || !expected) return false
  const provided = Buffer.from(value)
  const configured = Buffer.from(expected)
  return provided.length === configured.length && timingSafeEqual(provided, configured)
}

export async function POST(request: NextRequest) {
  if (!validSecret(request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? null)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const [invoices, creditNotes] = await Promise.all([processDueEtimsRetries(25), processDueEtimsCreditNoteRetries(25)])
  return NextResponse.json({ processed: invoices.length + creditNotes.length, invoices: invoices.map((item) => item.status), creditNotes: creditNotes.map((item) => item.status) })
}
