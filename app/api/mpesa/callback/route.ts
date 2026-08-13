import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { mpesaIncomingPayment, mpesaPaymentRequest } from '@/lib/db/schema'
import { mpesaPaybillDetails, validCallbackToken } from '@/lib/mpesa/daraja'
import { finalizeConfirmedMpesaPayment } from '@/lib/mpesa/finalize-payment'
import { generateId } from '@/lib/utils'

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
  const eligibleForAutomaticSale = successful && ['SENDING_STK', 'AWAITING_CUSTOMER'].includes(payment.status) && payment.expiresAt >= new Date() && !payment.saleId
  const failureStatus = callback.ResultCode === 1032 ? 'CANCELLED' : callback.ResultCode === 1037 ? 'EXPIRED' : 'FAILED'
  await db.transaction(async (tx) => {
    if (receiptNumber) await tx.insert(mpesaIncomingPayment).values({
      id: generateId(), transactionId: receiptNumber, organizationId: payment.organizationId, branchId: payment.branchId,
      shortcode: mpesaPaybillDetails().shortcode, accountReference: payment.accountReference, phone: paidPhone, amount: String(paidAmount),
      matchedRequestId: eligibleForAutomaticSale ? payment.id : null, status: eligibleForAutomaticSale ? 'MATCHED_PENDING_FINALIZATION' : 'NEEDS_MATCHING', payload,
    }).onConflictDoNothing({ target: mpesaIncomingPayment.transactionId })
    await tx.update(mpesaPaymentRequest).set({
      merchantRequestId: callback.MerchantRequestID || payment.merchantRequestId,
      receiptNumber: successful ? receiptNumber : payment.receiptNumber,
      resultCode: String(callback.ResultCode), resultDescription: successful ? (eligibleForAutomaticSale ? 'Payment received' : 'Payment received after checkout expiry; reconciliation required') : callback.ResultDesc || 'Payment failed',
      status: successful ? 'CONFIRMED' : failureStatus, callbackPayload: payload,
      completedAt: new Date(), updatedAt: new Date(),
    }).where(eq(mpesaPaymentRequest.id, payment.id))
  })
  if (eligibleForAutomaticSale) {
    try { await finalizeConfirmedMpesaPayment(payment.id) }
    catch (error) {
      await db.update(mpesaIncomingPayment).set({ status: 'NEEDS_MATCHING' }).where(eq(mpesaIncomingPayment.transactionId, receiptNumber))
      await db.update(mpesaPaymentRequest).set({ resultDescription: `Payment received; sale requires reconciliation: ${error instanceof Error ? error.message : 'finalization failed'}` }).where(eq(mpesaPaymentRequest.id, payment.id))
    }
  }
  return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
}
