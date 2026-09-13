import { and, eq, gte, inArray, isNull, lte, or, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { mpesaBusinessAccount, mpesaIncomingPayment, mpesaPaymentRequest } from '@/lib/db/schema'
import { classifyC2bMatch } from './c2b-provider'
import { finalizeConfirmedMpesaPayment } from './finalize-payment'
import { getBranchMpesaMerchant } from './merchant-configuration'
import { acceptsBranchC2b } from './merchant-rules'

const LEASE_MS = 5 * 60_000
const MAX_ATTEMPTS = 8

function retryAt(attempt: number) {
  return new Date(Date.now() + Math.min(60, 2 ** Math.max(0, attempt - 1)) * 60_000)
}

export async function claimNextMpesaProviderEvent() {
  return db.transaction(async (tx) => {
    const rows = await tx.execute(sql<{ id: string }>`
      SELECT id FROM mpesa_incoming_payment
      WHERE (
        "processingStatus" IN ('RECEIVED', 'RETRYABLE_FAILURE')
        AND ("nextRetryAt" IS NULL OR "nextRetryAt" <= now())
      ) OR (
        "processingStatus" = 'PROCESSING'
        AND "processingStartedAt" < now() - interval '5 minutes'
      )
      ORDER BY "createdAt" ASC
      FOR UPDATE SKIP LOCKED LIMIT 1`)
    const rawId = rows.rows[0]?.id
    if (!rawId) return null
    const id = String(rawId)
    const [claimed] = await tx.update(mpesaIncomingPayment).set({
      processingStatus: 'PROCESSING', processingStartedAt: new Date(), nextRetryAt: null,
      processingAttempts: sql`${mpesaIncomingPayment.processingAttempts} + 1`, failureCode: null, failureMessage: null,
    }).where(eq(mpesaIncomingPayment.id, id)).returning()
    return claimed ?? null
  })
}

export async function processMpesaProviderEvent(eventId: string) {
  const [event] = await db.select().from(mpesaIncomingPayment).where(eq(mpesaIncomingPayment.id, eventId)).limit(1)
  if (!event) return { status: 'MISSING' as const }
  if (event.processingStatus === 'PROCESSED' || event.status === 'MATCHED') return { status: 'ALREADY_PROCESSED' as const }
  try {
    // A prior worker may have committed the durable match and crashed during
    // finalization. Resume that exact request; never search for a new intent.
    if (event.matchedRequestId) {
      await finalizeConfirmedMpesaPayment(event.matchedRequestId)
      await db.update(mpesaIncomingPayment).set({ status: 'MATCHED', processingStatus: 'PROCESSED', reconciliationStatus: 'MATCHED', reconciliationReason: 'MATCHED', processedAt: new Date(), nextRetryAt: null }).where(eq(mpesaIncomingPayment.id, event.id))
      return { status: 'PROCESSED' as const }
    }
    const [account] = await db.select().from(mpesaBusinessAccount).where(and(
      eq(mpesaBusinessAccount.shortcode, event.shortcode), eq(mpesaBusinessAccount.active, true),
    )).limit(1)
    if (!account) {
      await db.update(mpesaIncomingPayment).set({ processingStatus: 'NEEDS_REVIEW', reconciliationStatus: 'NEEDS_REVIEW', reconciliationReason: 'MERCHANT_MISMATCH', processedAt: new Date() }).where(eq(mpesaIncomingPayment.id, event.id))
      return { status: 'NEEDS_REVIEW' as const, reason: 'MERCHANT_MISMATCH' as const }
    }
    const merchant = await getBranchMpesaMerchant(account.organizationId, account.branchId)
    if (!acceptsBranchC2b({ configuredTill: merchant?.tillNumber ?? null, configuredProviderIdentifier: account.shortcode, callbackMerchantIdentifier: event.shortcode, manualTillEnabled: Boolean(merchant?.manualTillEnabled) })) {
      await db.update(mpesaIncomingPayment).set({ organizationId: account.organizationId, branchId: account.branchId, processingStatus: 'NEEDS_REVIEW', reconciliationStatus: 'NEEDS_REVIEW', reconciliationReason: 'MERCHANT_MISMATCH', processedAt: new Date() }).where(eq(mpesaIncomingPayment.id, event.id))
      return { status: 'NEEDS_REVIEW' as const, reason: 'MERCHANT_MISMATCH' as const }
    }
    await db.update(mpesaIncomingPayment).set({ organizationId: account.organizationId, branchId: account.branchId }).where(eq(mpesaIncomingPayment.id, event.id))
    const candidates = await db.select().from(mpesaPaymentRequest).where(and(
      eq(mpesaPaymentRequest.organizationId, account.organizationId), eq(mpesaPaymentRequest.branchId, account.branchId),
      eq(mpesaPaymentRequest.paymentMode, account.accountType),
      account.accountType === 'paybill' && event.accountReference ? eq(mpesaPaymentRequest.accountReference, event.accountReference) : undefined,
      gte(mpesaPaymentRequest.createdAt, new Date(event.createdAt.getTime() - 30 * 60_000)),
      inArray(mpesaPaymentRequest.status, ['AWAITING_CONFIRMATION', 'CANCELLED', 'EXPIRED']),
    )).limit(10)
    const outcome = classifyC2bMatch({ amount: Number(event.amount), payerPhoneNormalized: event.phone }, candidates)
    if (!outcome.intent) {
      const ambiguous = outcome.reason === 'MULTIPLE_CANDIDATES'
      await db.update(mpesaIncomingPayment).set({ status: ambiguous ? 'AMBIGUOUS' : 'UNMATCHED', processingStatus: 'NEEDS_REVIEW', reconciliationStatus: ambiguous ? 'AMBIGUOUS' : 'NEEDS_REVIEW', reconciliationReason: outcome.reason, processedAt: new Date() }).where(eq(mpesaIncomingPayment.id, event.id))
      return { status: 'NEEDS_REVIEW' as const, reason: outcome.reason }
    }
    const requestId = await db.transaction(async (tx) => {
      const [claimedEvent] = await tx.update(mpesaIncomingPayment).set({ matchedRequestId: outcome.intent!.id, matchedAt: new Date(), matchedBy: outcome.intent!.userId, status: 'MATCHED_PENDING_FINALIZATION', reconciliationStatus: 'MATCHED', reconciliationReason: 'MATCHED' }).where(and(eq(mpesaIncomingPayment.id, event.id), isNull(mpesaIncomingPayment.matchedRequestId), eq(mpesaIncomingPayment.processingStatus, 'PROCESSING'))).returning({ id: mpesaIncomingPayment.id })
      if (!claimedEvent) return null
      const [claimedIntent] = await tx.update(mpesaPaymentRequest).set({ phone: event.phone || outcome.intent!.phone || '', receiptNumber: event.transactionId, resultCode: '0', resultDescription: 'C2B payment received', status: 'CONFIRMED', callbackPayload: event.payload, completedAt: new Date(), updatedAt: new Date() }).where(and(eq(mpesaPaymentRequest.id, outcome.intent!.id), eq(mpesaPaymentRequest.status, 'AWAITING_CONFIRMATION'), isNull(mpesaPaymentRequest.saleId))).returning({ id: mpesaPaymentRequest.id })
      if (!claimedIntent) throw new Error('INTENT_RACE_LOST')
      return claimedIntent.id
    })
    if (!requestId) return { status: 'ALREADY_PROCESSED' as const }
    await finalizeConfirmedMpesaPayment(requestId)
    await db.update(mpesaIncomingPayment).set({ processingStatus: 'PROCESSED', reconciliationStatus: 'MATCHED', reconciliationReason: 'MATCHED', processedAt: new Date() }).where(eq(mpesaIncomingPayment.id, event.id))
    return { status: 'PROCESSED' as const }
  } catch (error) {
    const message = (error instanceof Error ? error.message : 'Provider event processing failed').replace(/[\r\n]+/g, ' ').slice(0, 500)
    const permanent = event.processingAttempts >= MAX_ATTEMPTS
    await db.update(mpesaIncomingPayment).set({ processingStatus: permanent ? 'PERMANENT_FAILURE' : 'RETRYABLE_FAILURE', reconciliationStatus: 'NEEDS_REVIEW', reconciliationReason: 'FINALIZATION_FAILED', failureCode: message === 'INTENT_RACE_LOST' ? 'INTENT_RACE_LOST' : 'PROCESSING_FAILED', failureMessage: message, nextRetryAt: permanent ? null : retryAt(event.processingAttempts), processedAt: new Date() }).where(eq(mpesaIncomingPayment.id, event.id))
    return { status: permanent ? 'PERMANENT_FAILURE' as const : 'RETRYABLE_FAILURE' as const }
  }
}

export async function processDueMpesaProviderEvents(limit = 25) {
  const results = []
  for (let i = 0; i < limit; i += 1) {
    const event = await claimNextMpesaProviderEvent()
    if (!event) break
    results.push(await processMpesaProviderEvent(event.id))
  }
  return results
}
