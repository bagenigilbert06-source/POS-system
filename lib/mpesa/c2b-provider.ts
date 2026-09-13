import { normalizeKenyanPhone } from './daraja'

export const MPESA_RECONCILIATION_REASONS = [
  'MATCHED', 'NO_PENDING_INTENT', 'AMOUNT_MISMATCH', 'PHONE_MISMATCH', 'MERCHANT_MISMATCH',
  'MULTIPLE_CANDIDATES', 'INTENT_EXPIRED', 'INTENT_CANCELLED', 'LATE_PAYMENT', 'INVALID_PAYLOAD',
  'UNSUPPORTED_EVENT', 'ALREADY_PROCESSED', 'FINALIZATION_FAILED', 'DOWNSTREAM_RECOVERY_REQUIRED',
] as const
export type MpesaReconciliationReason = typeof MPESA_RECONCILIATION_REASONS[number]

export type NormalizedC2bEvent = {
  provider: 'SAFARICOM_DARAJA'; eventType: 'C2B_CONFIRMATION'; providerTransactionId: string
  merchantIdentifier: string; amount: number; payerPhoneNormalized: string | null
  accountReference: string | null; occurredAt: Date | null; sanitizedPayload: Record<string, unknown>
}

type DarajaC2bPayload = Record<string, unknown> & {
  TransID?: unknown; TransAmount?: unknown; BusinessShortCode?: unknown; BillRefNumber?: unknown
  MSISDN?: unknown; TransTime?: unknown; FirstName?: unknown; MiddleName?: unknown; LastName?: unknown
}

export function parseSafaricomC2bConfirmation(payload: unknown): NormalizedC2bEvent {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('INVALID_PAYLOAD')
  const raw = payload as DarajaC2bPayload
  const providerTransactionId = String(raw.TransID ?? '').trim().toUpperCase()
  const merchantIdentifier = String(raw.BusinessShortCode ?? '').trim()
  const amount = Number(raw.TransAmount)
  if (!providerTransactionId || !merchantIdentifier || !Number.isFinite(amount) || amount <= 0) throw new Error('INVALID_PAYLOAD')
  const rawPhone = String(raw.MSISDN ?? '').trim()
  let payerPhoneNormalized: string | null = null
  if (rawPhone) try { payerPhoneNormalized = normalizeKenyanPhone(rawPhone) } catch { /* retained as absent trusted signal */ }
  const time = String(raw.TransTime ?? '')
  let occurredAt: Date | null = null
  if (/^\d{14}$/.test(time)) {
    const p = [time.slice(0, 4), time.slice(4, 6), time.slice(6, 8), time.slice(8, 10), time.slice(10, 12), time.slice(12, 14)].map(Number)
    occurredAt = new Date(Date.UTC(p[0], p[1] - 1, p[2], p[3] - 3, p[4], p[5]))
  }
  return {
    provider: 'SAFARICOM_DARAJA', eventType: 'C2B_CONFIRMATION', providerTransactionId, merchantIdentifier, amount,
    payerPhoneNormalized, accountReference: String(raw.BillRefNumber ?? '').trim().toUpperCase() || null,
    occurredAt, sanitizedPayload: {
      TransID: providerTransactionId, TransAmount: amount, BusinessShortCode: merchantIdentifier,
      BillRefNumber: String(raw.BillRefNumber ?? '').trim() || undefined, TransTime: time || undefined,
      // Names and raw phone are intentionally not copied into the durable payload.
    },
  }
}

export type MatchableIntent = { id: string; amount: string; phone: string | null; status: string; expiresAt: Date; createdAt: Date; userId?: string }
export function classifyC2bMatch(event: Pick<NormalizedC2bEvent, 'amount' | 'payerPhoneNormalized'>, intents: MatchableIntent[], now = new Date()) {
  if (!intents.length) return { intent: null, reason: 'NO_PENDING_INTENT' as MpesaReconciliationReason }
  const active = intents.filter((i) => i.status === 'AWAITING_CONFIRMATION' && i.expiresAt >= now)
  if (!active.length) {
    if (intents.some((i) => i.status === 'CANCELLED')) return { intent: null, reason: 'INTENT_CANCELLED' as MpesaReconciliationReason }
    return { intent: null, reason: intents.some((i) => i.expiresAt < now) ? 'LATE_PAYMENT' as MpesaReconciliationReason : 'NO_PENDING_INTENT' as MpesaReconciliationReason }
  }
  const amount = active.filter((i) => Number(i.amount) === event.amount)
  if (!amount.length) return { intent: null, reason: 'AMOUNT_MISMATCH' as MpesaReconciliationReason }
  const phone = amount.filter((i) => !i.phone || (event.payerPhoneNormalized && i.phone === event.payerPhoneNormalized))
  if (!phone.length) return { intent: null, reason: 'PHONE_MISMATCH' as MpesaReconciliationReason }
  if (phone.length > 1) return { intent: null, reason: 'MULTIPLE_CANDIDATES' as MpesaReconciliationReason }
  return { intent: phone[0], reason: 'MATCHED' as MpesaReconciliationReason }
}
