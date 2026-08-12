import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { mpesaPaymentRequest } from '@/lib/db/schema'
import { validCallbackToken, validC2bShortcode } from '@/lib/mpesa/daraja'

type C2bPayload = { TransAmount?: string | number; BillRefNumber?: string; BusinessShortCode?: string | number }

export async function POST(request: NextRequest) {
  if (!validCallbackToken(request.nextUrl.searchParams.get('token'))) return NextResponse.json({ ResultCode: 1, ResultDesc: 'Rejected' }, { status: 401 })
  let payload: C2bPayload
  try { payload = await request.json() as C2bPayload } catch { return NextResponse.json({ ResultCode: 1, ResultDesc: 'Invalid request' }) }
  const reference = String(payload.BillRefNumber || '').trim().toUpperCase()
  const amount = Number(payload.TransAmount)
  if (!validC2bShortcode(String(payload.BusinessShortCode || ''))) return NextResponse.json({ ResultCode: 1, ResultDesc: 'Invalid business shortcode' })
  const [payment] = await db.select({ amount: mpesaPaymentRequest.amount }).from(mpesaPaymentRequest).where(and(
    eq(mpesaPaymentRequest.accountReference, reference), eq(mpesaPaymentRequest.paymentMode, 'paybill'), eq(mpesaPaymentRequest.status, 'pending'),
  )).limit(1)
  if (!payment) return NextResponse.json({ ResultCode: 1, ResultDesc: 'Use the account reference shown at the till' })
  if (!Number.isFinite(amount) || Number(payment.amount) !== amount) return NextResponse.json({ ResultCode: 1, ResultDesc: 'Enter the exact amount shown at the till' })
  return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
}
