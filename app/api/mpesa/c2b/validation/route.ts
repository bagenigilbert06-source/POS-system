import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { mpesaBusinessAccount, mpesaPaymentRequest } from '@/lib/db/schema'
import { validCallbackToken, validC2bShortcode } from '@/lib/mpesa/daraja'

type C2bPayload = { TransAmount?: string | number; BillRefNumber?: string; BusinessShortCode?: string | number }

export async function POST(request: NextRequest) {
  if (!validCallbackToken(request.nextUrl.searchParams.get('token'))) return NextResponse.json({ ResultCode: 1, ResultDesc: 'Rejected' }, { status: 401 })
  let payload: C2bPayload
  try { payload = await request.json() as C2bPayload } catch { return NextResponse.json({ ResultCode: 1, ResultDesc: 'Invalid request' }) }
  const reference = String(payload.BillRefNumber || '').trim().toUpperCase()
  const amount = Number(payload.TransAmount)
  const shortcode = String(payload.BusinessShortCode || '').trim()
  if (!validC2bShortcode(shortcode)) return NextResponse.json({ ResultCode: 1, ResultDesc: 'Invalid business shortcode' })
  const [account] = await db.select().from(mpesaBusinessAccount).where(and(eq(mpesaBusinessAccount.shortcode, shortcode), eq(mpesaBusinessAccount.active, true))).limit(1)
  if (!account) return NextResponse.json({ ResultCode: 1, ResultDesc: 'Unregistered business shortcode' })
  if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ ResultCode: 1, ResultDesc: 'Enter a valid amount' })
  if (account.accountType === 'till') return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
  const [payment] = await db.select({ amount: mpesaPaymentRequest.amount }).from(mpesaPaymentRequest).where(and(
    eq(mpesaPaymentRequest.organizationId, account.organizationId), eq(mpesaPaymentRequest.branchId, account.branchId),
    eq(mpesaPaymentRequest.accountReference, reference), eq(mpesaPaymentRequest.paymentMode, 'paybill'), eq(mpesaPaymentRequest.status, 'AWAITING_CONFIRMATION'),
  )).limit(1)
  if (!payment) return NextResponse.json({ ResultCode: 1, ResultDesc: 'Use the account reference shown at the till' })
  if (!Number.isFinite(amount) || Number(payment.amount) !== amount) return NextResponse.json({ ResultCode: 1, ResultDesc: 'Enter the exact amount shown at the till' })
  return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
}
