import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { mpesaPaymentRequest } from '@/lib/db/schema'
import { validCallbackToken } from '@/lib/mpesa/daraja'

type CallbackItem = { Name?: string; Value?: string | number }
type CallbackBody = { Body?: { stkCallback?: { MerchantRequestID?: string; CheckoutRequestID?: string; ResultCode?: number; ResultDesc?: string; CallbackMetadata?: { Item?: CallbackItem[] } } } }

export async function POST(request: NextRequest) {
  if (!validCallbackToken(request.nextUrl.searchParams.get('token'))) return NextResponse.json({ ResultCode: 1, ResultDesc: 'Rejected' }, { status: 401 })
  let payload: CallbackBody
  try { payload = await request.json() as CallbackBody } catch { return NextResponse.json({ ResultCode: 1, ResultDesc: 'Invalid JSON' }, { status: 400 }) }
  const callback = payload.Body?.stkCallback
  if (!callback?.CheckoutRequestID || typeof callback.ResultCode !== 'number') return NextResponse.json({ ResultCode: 1, ResultDesc: 'Invalid callback' }, { status: 400 })
  const [payment] = await db.select().from(mpesaPaymentRequest).where(eq(mpesaPaymentRequest.checkoutRequestId, callback.CheckoutRequestID)).limit(1)
  if (!payment) return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
  const metadata = new Map((callback.CallbackMetadata?.Item || []).map((item) => [item.Name, item.Value]))
  const paidAmount = Number(metadata.get('Amount'))
  const receiptNumber = String(metadata.get('MpesaReceiptNumber') || '')
  const paidPhone = String(metadata.get('PhoneNumber') || '')
  const successful = callback.ResultCode === 0 && receiptNumber.length > 0 && Number(payment.amount) === paidAmount && paidPhone === payment.phone
  await db.update(mpesaPaymentRequest).set({
    merchantRequestId: callback.MerchantRequestID || payment.merchantRequestId,
    receiptNumber: successful ? receiptNumber : null,
    resultCode: String(callback.ResultCode), resultDescription: successful ? 'Payment received' : callback.ResultDesc || 'Payment failed',
    status: successful ? 'success' : 'failed', callbackPayload: payload,
    completedAt: new Date(), updatedAt: new Date(),
  }).where(eq(mpesaPaymentRequest.id, payment.id))
  return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
}
