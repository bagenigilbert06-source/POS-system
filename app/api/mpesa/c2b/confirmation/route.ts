import { NextRequest, NextResponse } from 'next/server'
import { and, eq, gte } from 'drizzle-orm'
import { db } from '@/lib/db'
import { mpesaBusinessAccount, mpesaIncomingPayment, mpesaPaymentRequest } from '@/lib/db/schema'
import { validCallbackToken, validC2bShortcode } from '@/lib/mpesa/daraja'
import { generateId } from '@/lib/utils'
import { finalizeConfirmedMpesaPayment } from '@/lib/mpesa/finalize-payment'
import { selectUnambiguousTillCandidate } from '@/lib/mpesa/matching'

type C2bPayload = {
  TransID?: string; TransAmount?: string | number; BusinessShortCode?: string | number; BillRefNumber?: string
  MSISDN?: string | number; FirstName?: string; MiddleName?: string; LastName?: string
  TransTime?: string
}

function parseDarajaTime(value?: string) {
  if (!value || !/^\d{14}$/.test(value)) return null
  const [year, month, day, hour, minute, second] = [value.slice(0, 4), value.slice(4, 6), value.slice(6, 8), value.slice(8, 10), value.slice(10, 12), value.slice(12, 14)].map(Number)
  return new Date(Date.UTC(year, month - 1, day, hour - 3, minute, second))
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
  if (!transactionId || !Number.isFinite(amount) || amount <= 0 || !shortcode) return NextResponse.json({ ResultCode: 1, ResultDesc: 'Invalid payment confirmation' }, { status: 400 })
  if (!validC2bShortcode(shortcode)) return NextResponse.json({ ResultCode: 1, ResultDesc: 'Invalid business shortcode' }, { status: 400 })

  const [alreadyRecorded] = await db.select({ id: mpesaIncomingPayment.id, matchedRequestId: mpesaIncomingPayment.matchedRequestId }).from(mpesaIncomingPayment)
    .where(eq(mpesaIncomingPayment.transactionId, transactionId)).limit(1)
  if (alreadyRecorded) {
    if (alreadyRecorded.matchedRequestId) {
      try { await finalizeConfirmedMpesaPayment(alreadyRecorded.matchedRequestId) } catch { /* retained for reconciliation */ }
    }
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
  }

  const [account] = await db.select().from(mpesaBusinessAccount).where(and(
    eq(mpesaBusinessAccount.shortcode, shortcode), eq(mpesaBusinessAccount.active, true),
  )).limit(1)
  if (!account) return NextResponse.json({ ResultCode: 1, ResultDesc: 'Unregistered business shortcode' }, { status: 400 })
  const payerName = [payload.FirstName, payload.MiddleName, payload.LastName].filter(Boolean).join(' ').trim()
  let newlyRecorded = false
  try {
    const inserted = await db.insert(mpesaIncomingPayment).values({
      id: generateId(), transactionId, organizationId: account.organizationId, branchId: account.branchId,
      shortcode, accountReference: reference || null, phone, payerName: payerName || null, transactionAt: parseDarajaTime(payload.TransTime),
      amount: String(amount), matchedRequestId: null, status: 'UNMATCHED', payload,
    }).onConflictDoNothing({ target: mpesaIncomingPayment.transactionId }).returning({ id: mpesaIncomingPayment.id })
    newlyRecorded = inserted.length === 1
  } catch {
    return NextResponse.json({ ResultCode: 1, ResultDesc: 'Could not record payment' }, { status: 500 })
  }
  if (!newlyRecorded) return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
  const candidates = account.accountType === 'paybill'
    ? await db.select().from(mpesaPaymentRequest).where(and(
      eq(mpesaPaymentRequest.organizationId, account.organizationId), eq(mpesaPaymentRequest.branchId, account.branchId),
      eq(mpesaPaymentRequest.accountReference, reference), eq(mpesaPaymentRequest.paymentMode, 'paybill'),
      eq(mpesaPaymentRequest.status, 'AWAITING_CONFIRMATION'), gte(mpesaPaymentRequest.expiresAt, new Date()),
    )).limit(2)
    : await db.select().from(mpesaPaymentRequest).where(and(
      eq(mpesaPaymentRequest.organizationId, account.organizationId), eq(mpesaPaymentRequest.branchId, account.branchId),
      eq(mpesaPaymentRequest.paymentMode, 'till'), eq(mpesaPaymentRequest.status, 'AWAITING_CONFIRMATION'),
      eq(mpesaPaymentRequest.amount, String(amount)), gte(mpesaPaymentRequest.createdAt, new Date(Date.now() - 10 * 60_000)),
      gte(mpesaPaymentRequest.expiresAt, new Date()),
    )).limit(2)
  const payment = account.accountType === 'till'
    ? selectUnambiguousTillCandidate(candidates, amount)
    : candidates.length === 1 && Number(candidates[0].amount) === amount ? candidates[0] : null
  let claimed = false
  try {
    await db.transaction(async (tx) => {
      if (payment) {
        const updated = await tx.update(mpesaPaymentRequest).set({
        phone, receiptNumber: transactionId, resultCode: '0', resultDescription: 'PayBill payment received',
        status: 'CONFIRMED', callbackPayload: payload, completedAt: new Date(), updatedAt: new Date(),
        }).where(and(eq(mpesaPaymentRequest.id, payment.id), eq(mpesaPaymentRequest.status, 'AWAITING_CONFIRMATION'))).returning({ id: mpesaPaymentRequest.id })
        claimed = updated.length === 1
        if (claimed) await tx.update(mpesaIncomingPayment).set({ matchedRequestId: payment.id, status: 'MATCHED_PENDING_FINALIZATION' })
          .where(eq(mpesaIncomingPayment.transactionId, transactionId))
      }
    })
  } catch {
    return NextResponse.json({ ResultCode: 1, ResultDesc: 'Could not record payment' }, { status: 500 })
  }
  if (payment && claimed) {
    try { await finalizeConfirmedMpesaPayment(payment.id) }
    catch (error) {
      await db.update(mpesaIncomingPayment).set({ status: 'NEEDS_MATCHING' }).where(eq(mpesaIncomingPayment.transactionId, transactionId))
      await db.update(mpesaPaymentRequest).set({ resultDescription: `Payment received; sale requires reconciliation: ${error instanceof Error ? error.message : 'finalization failed'}` }).where(eq(mpesaPaymentRequest.id, payment.id))
    }
  }
  return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
}
