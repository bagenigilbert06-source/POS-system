import { db } from '@/lib/db'
import { mpesaIncomingPayment } from '@/lib/db/schema'
import { generateId } from '@/lib/utils'
import { parseSafaricomC2bConfirmation } from './c2b-provider'

/** Shared by the HTTP callback and integration tests: normalize and commit only. */
export async function ingestSafaricomC2bConfirmation(payload: unknown) {
  const event = parseSafaricomC2bConfirmation(payload)
  const inserted = await db.insert(mpesaIncomingPayment).values({
    id: generateId(), transactionId: event.providerTransactionId, shortcode: event.merchantIdentifier,
    accountReference: event.accountReference, phone: event.payerPhoneNormalized, amount: String(event.amount),
    transactionAt: event.occurredAt, status: 'UNMATCHED', provider: event.provider, eventType: event.eventType,
    processingStatus: 'RECEIVED', reconciliationStatus: 'PENDING', reconciliationReason: null,
    payload: event.sanitizedPayload,
  }).onConflictDoNothing({ target: mpesaIncomingPayment.transactionId }).returning({ id: mpesaIncomingPayment.id })
  return { eventId: inserted[0]?.id ?? null, duplicate: inserted.length === 0 }
}
