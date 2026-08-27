import assert from 'node:assert/strict'
import { friendlyMpesaFailure, normalizeKenyanPhone, validCallbackToken } from '../lib/mpesa/daraja'
import { normalizeMpesaPhoneForMode } from '../lib/mpesa/phone-validation'
import { calculateMpesaAmount } from '../lib/mpesa/amount'
import { selectUnambiguousTillCandidate } from '../lib/mpesa/matching'

assert.equal(normalizeKenyanPhone('0712 345 678'), '254712345678')
assert.equal(normalizeKenyanPhone('+254 712 345 678'), '254712345678')
assert.equal(normalizeKenyanPhone('712345678'), '254712345678')
assert.equal(normalizeKenyanPhone('0112 345 678'), '254112345678')
assert.equal(normalizeKenyanPhone('254712345678'), '254712345678')
assert.throws(() => normalizeKenyanPhone('020 123 4567'), /Enter a valid M-Pesa phone number/)
assert.throws(() => normalizeMpesaPhoneForMode('stk', ''), /Enter a valid M-Pesa phone number/)
assert.throws(() => normalizeMpesaPhoneForMode('stk', '020 123 4567'), /Enter a valid M-Pesa phone number/)
assert.equal(normalizeMpesaPhoneForMode('stk', '0712 345 678'), '254712345678')
assert.equal(normalizeMpesaPhoneForMode('till', ''), '')
assert.equal(normalizeMpesaPhoneForMode('till', null), '')
assert.equal(normalizeMpesaPhoneForMode('till', '0712 345 678'), '254712345678')
assert.equal(normalizeMpesaPhoneForMode('paybill', ''), '')
assert.equal(normalizeMpesaPhoneForMode('paybill', null), '')
assert.equal(normalizeMpesaPhoneForMode('paybill', '+254 712 345 678'), '254712345678')
assert.equal(friendlyMpesaFailure(1, 'The balance is insufficient'), 'Insufficient M-Pesa balance')
assert.match(friendlyMpesaFailure(1032), /cancelled/i)
assert.match(friendlyMpesaFailure(1037), /confirmation/i)
assert.match(friendlyMpesaFailure(2001), /incorrect M-Pesa PIN/i)
assert.deepEqual(calculateMpesaAmount(2917.4), { amount: 2917, roundingAmount: -0.4 })
assert.deepEqual(calculateMpesaAmount(2917.6), { amount: 2918, roundingAmount: 0.4 })
assert.deepEqual(calculateMpesaAmount(2917), { amount: 2917, roundingAmount: 0 })
assert.equal(selectUnambiguousTillCandidate([], 1500), null)
assert.equal(selectUnambiguousTillCandidate([{ id: 'one', amount: '1500.00' }], 1500)?.id, 'one')
assert.equal(selectUnambiguousTillCandidate([{ id: 'one', amount: '1500.00' }, { id: 'two', amount: '1500.00' }], 1500), null)
assert.equal(selectUnambiguousTillCandidate([{ id: 'wrong', amount: '1499.00' }], 1500), null)

const previousEnvironment = process.env.MPESA_ENV
const previousSecret = process.env.MPESA_CALLBACK_SECRET
process.env.MPESA_ENV = 'production'
process.env.MPESA_CALLBACK_SECRET = 'test-callback-secret'
assert.equal(validCallbackToken('test-callback-secret'), true)
assert.equal(validCallbackToken('wrong-secret'), false)
assert.equal(validCallbackToken(null), false)
process.env.MPESA_ENV = previousEnvironment
process.env.MPESA_CALLBACK_SECRET = previousSecret

console.log('M-Pesa phone and callback security rules test passed')
