import assert from 'node:assert/strict'
import { normalizeKenyanPhone, validCallbackToken } from '../lib/mpesa/daraja'
import { calculateMpesaAmount } from '../lib/mpesa/amount'

assert.equal(normalizeKenyanPhone('0712 345 678'), '254712345678')
assert.equal(normalizeKenyanPhone('+254 712 345 678'), '254712345678')
assert.equal(normalizeKenyanPhone('712345678'), '254712345678')
assert.throws(() => normalizeKenyanPhone('020 123 4567'), /valid Kenyan M-Pesa number/)
assert.deepEqual(calculateMpesaAmount(2917.4), { amount: 2917, roundingAmount: -0.4 })
assert.deepEqual(calculateMpesaAmount(2917.6), { amount: 2918, roundingAmount: 0.4 })
assert.deepEqual(calculateMpesaAmount(2917), { amount: 2917, roundingAmount: 0 })

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
