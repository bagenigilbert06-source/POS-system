import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { mpesaIncomingPayment, mpesaPaymentRequest } from '@/lib/db/schema'
import { validCallbackToken, validC2bShortcode } from '@/lib/mpesa/daraja'
import { generateId } from '@/lib/utils'

type C2bPayload = {
  TransID?: string; TransAmount?: string | number; BusinessShortCode?: string | number; BillRefNumber?: string
  MSISDN?: string | number; FirstName?: string; MiddleName?: string; LastName?: string
}

export async function POST(request: NextRequest) {
  if (!validCallbackToken(request.nextUrl.searchParams.get('token'))) return NextResponse.json({ ResultCode: 1, ResultDesc: 'Rejected' }, { status: 401 })
  let payload: C2bPayload
  try { payload = await request.json() as C2bPayload } catch { return NextResponse.json({ ResultCode: 1, ResultDesc: 'Invalid request' }, { status: 400 }) }
  const transactionId = String(payload.TransID || '').trim().toUpperCase()
  const reference = String(payload.BillRefNumber || '').trim().toUpperCase()
  const amount = Number(payload.TransAmount)
  const shortcode = String(payload.BusinessShortCode || '').trim()
  const phone = String(payload.MSISDN || '').trim()
  if (!transactionId || !reference || !Number.isFinite(amount) || !shortcode) return NextResponse.json({ ResultCode: 1, ResultDesc: 'Invalid payment confirmation' }, { status: 400 })
  if (!validC2bShortcode(shortcode)) return NextResponse.json({ ResultCode: 1, ResultDesc: 'Invalid business shortcode' }, { status: 400 })

  const [alreadyRecorded] = await db.select({ id: mpesaIncomingPayment.id }).from(mpesaIncomingPayment)
    .where(eq(mpesaIncomingPayment.transactionId, transactionId)).limit(1)
  if (alreadyRecorded) return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })

  const [payment] = await db.select().from(mpesaPaymentRequest).where(and(
    eq(mpesaPaymentRequest.accountReference, reference), eq(mpesaPaymentRequest.paymentMode, 'paybill'), eq(mpesaPaymentRequest.status, 'pending'),
  )).limit(1)
  const matched = Boolean(payment && Number(payment.amount) === amount)
  const payerName = [payload.FirstName, payload.MiddleName, payload.LastName].filter(Boolean).join(' ').trim()
  try {
    await db.transaction(async (tx) => {
      await tx.insert(mpesaIncomingPayment).values({
        id: generateId(), transactionId, shortcode, accountReference: reference, phone, payerName: payerName || null,
        amount: String(amount), matchedRequestId: matched ? payment!.id : null, status: matched ? 'matched' : 'unmatched', payload,
      }).onConflictDoNothing({ target: mpesaIncomingPayment.transactionId })
      if (matched) await tx.update(mpesaPaymentRequest).set({
        phone, receiptNumber: transactionId, resultCode: '0', resultDescription: 'PayBill payment received',
        status: 'success', callbackPayload: payload, completedAt: new Date(), updatedAt: new Date(),
      }).where(and(eq(mpesaPaymentRequest.id, payment!.id), eq(mpesaPaymentRequest.status, 'pending')))
    })
  } catch {
    return NextResponse.json({ ResultCode: 1, ResultDesc: 'Could not record payment' }, { status: 500 })
  }
  return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
}
