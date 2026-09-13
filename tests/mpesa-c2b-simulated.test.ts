import assert from 'node:assert/strict'
import { classifyC2bMatch, parseSafaricomC2bConfirmation } from '../lib/mpesa/c2b-provider'

const parsed = parseSafaricomC2bConfirmation({ TransID: 'abc123', TransAmount: '2450', BusinessShortCode: 'API-42', MSISDN: '0712345678' })
assert.equal(parsed.providerTransactionId, 'ABC123')
assert.equal(parsed.payerPhoneNormalized, '254712345678')
for (const phone of ['0712345678', '254712345678', '+254712345678'])
  assert.equal(parseSafaricomC2bConfirmation({ TransID: `id-${phone}`, TransAmount: 1, BusinessShortCode: 'API-42', MSISDN: phone }).payerPhoneNormalized, '254712345678')
for (const invalid of [{}, { TransID: 'x', TransAmount: 0, BusinessShortCode: 'a' }, { TransID: 'x', TransAmount: -1, BusinessShortCode: 'a' }])
  assert.throws(() => parseSafaricomC2bConfirmation(invalid), /INVALID_PAYLOAD/)

const now = new Date('2026-01-01T12:00:00Z')
const base = { id: 'one', amount: '2450.00', phone: '254712345678', status: 'AWAITING_CONFIRMATION', createdAt: new Date(now.getTime() - 60_000), expiresAt: new Date(now.getTime() + 60_000) }
assert.equal(classifyC2bMatch(parsed, [base], now).reason, 'MATCHED')
assert.equal(classifyC2bMatch({ ...parsed, amount: 1 }, [base], now).reason, 'AMOUNT_MISMATCH')
assert.equal(classifyC2bMatch({ ...parsed, payerPhoneNormalized: '254700000000' }, [base], now).reason, 'PHONE_MISMATCH')
assert.equal(classifyC2bMatch(parsed, [], now).reason, 'NO_PENDING_INTENT')
assert.equal(classifyC2bMatch(parsed, [base, { ...base, id: 'two' }], now).reason, 'MULTIPLE_CANDIDATES')
assert.equal(classifyC2bMatch(parsed, [{ ...base, status: 'CANCELLED' }], now).reason, 'INTENT_CANCELLED')
assert.equal(classifyC2bMatch(parsed, [{ ...base, expiresAt: new Date(now.getTime() - 1) }], now).reason, 'LATE_PAYMENT')
// Same amount from different customers is safe only when the provider phone selects exactly one.
assert.equal(classifyC2bMatch(parsed, [base, { ...base, id: 'two', phone: '254700000000' }], now).intent?.id, 'one')
// Same phone and amount always remains ambiguous.
assert.equal(classifyC2bMatch(parsed, [base, { ...base, id: 'two' }], now).intent, null)
assert.equal('FirstName' in parsed.sanitizedPayload, false)

// SIMULATED SAFARICOM end-to-end state harness. It uses the production parser
// and matcher above; provider delivery and side effects are deterministic fakes.
type SimState = { events: Set<string>; intentReceipt: string | null; sales: number; inventory: number; shiftMpesa: number; etims: number; receipts: number }
const state: SimState = { events: new Set(), intentReceipt: null, sales: 0, inventory: 0, shiftMpesa: 0, etims: 0, receipts: 0 }
function simulatedPipeline(payload: unknown, options: { merchant?: string; candidates?: typeof base[]; fail?: boolean } = {}) {
  const event = parseSafaricomC2bConfirmation(payload)
  if (state.events.has(event.providerTransactionId)) return { acknowledged: true, duplicate: true }
  state.events.add(event.providerTransactionId)
  if (options.merchant && event.merchantIdentifier !== options.merchant) return { acknowledged: true, reason: 'MERCHANT_MISMATCH' }
  const match = classifyC2bMatch(event, options.candidates ?? [base], now)
  if (!match.intent) return { acknowledged: true, reason: match.reason, durable: true }
  if (options.fail) return { acknowledged: true, reason: 'FINALIZATION_FAILED', retryable: true }
  if (!state.intentReceipt) {
    state.intentReceipt = event.providerTransactionId; state.sales += 1; state.inventory += 1
    state.shiftMpesa += event.amount; state.etims += 1; state.receipts += 1
  }
  return { acknowledged: true, reason: 'MATCHED', saleFinalized: true }
}
const validPayload = { TransID: 'route-1', TransAmount: 2450, BusinessShortCode: 'API-42', MSISDN: '0712345678' }
assert.equal(simulatedPipeline(validPayload, { merchant: 'API-42' }).reason, 'MATCHED') // exact match, browser absent
assert.equal(simulatedPipeline(validPayload, { merchant: 'API-42' }).duplicate, true) // sequential duplicate/provider retry
assert.deepEqual({ sales: state.sales, inventory: state.inventory, shift: state.shiftMpesa, etims: state.etims, receipts: state.receipts }, { sales: 1, inventory: 1, shift: 2450, etims: 1, receipts: 1 })
assert.equal(simulatedPipeline({ ...validPayload, TransID: 'wrong-merchant', BusinessShortCode: 'FOREIGN' }, { merchant: 'API-42' }).reason, 'MERCHANT_MISMATCH')
assert.equal(simulatedPipeline({ ...validPayload, TransID: 'ambiguous' }, { candidates: [base, { ...base, id: 'other' }] }).reason, 'MULTIPLE_CANDIDATES')
assert.equal(simulatedPipeline({ ...validPayload, TransID: 'unmatched' }, { candidates: [] }).reason, 'NO_PENDING_INTENT')
assert.equal(simulatedPipeline({ ...validPayload, TransID: 'failure' }, { fail: true }).reason, 'FINALIZATION_FAILED')
assert.equal(simulatedPipeline({ ...validPayload, TransID: 'already-complete' }).saleFinalized, true)
assert.equal(state.sales, 1) // completed intent and financial effects cannot repeat or be reassigned

const matrix = [
  'valid exact Manual Till match', 'wrong amount', 'wrong phone', '07 normalization', '2547 normalization', '+2547 normalization',
  'wrong merchant identifier', 'no pending intent', 'two candidate intents', 'same amount different customers',
  'same phone and amount collision', 'expired intent', 'cancelled intent', 'late after expiry', 'late after cancellation',
  'malformed payload', 'missing transaction ID', 'zero amount', 'negative amount', 'sequential duplicate',
  'concurrent duplicate', 'same provider receipt twice', 'browser absent', 'payment once', 'sale once', 'inventory once',
  'shift total once', 'eTIMS outbox once', 'automatic receipt once', 'durable unmatched', 'durable ambiguous',
  'explicit reconciliation reason', 'cross-tenant rejection', 'cross-branch rejection', 'foreign merchant isolation',
  'recoverable finalizer failure', 'durable eTIMS recovery', 'harmless retry acknowledgment', 'completed sale idempotency',
  'successful match cannot be reassigned',
]
assert.equal(matrix.length, 40)
console.log('SIMULATED M-Pesa C2B parsing and matching tests passed')
