import assert from 'node:assert/strict'
import { calculateRefundAmount, roundCurrency } from '../lib/pos/refund-calculation'

assert.equal(roundCurrency(10.005), 10.01)

// Tax-exclusive sale: KES 100 subtotal + KES 16 VAT.
assert.equal(calculateRefundAmount(100, 116, [
  { lineSubtotal: 25, soldQuantity: 1, refundQuantity: 1 },
]), 29)

// Discounted sale: a KES 40 line receives its proportional share of a KES 10 discount.
assert.equal(calculateRefundAmount(100, 90, [
  { lineSubtotal: 40, soldQuantity: 1, refundQuantity: 1 },
]), 36)

// Partial quantity refund retains the same proportional tax/discount allocation.
assert.equal(calculateRefundAmount(100, 116, [
  { lineSubtotal: 60, soldQuantity: 3, refundQuantity: 1 },
]), 23.2)

assert.throws(() => calculateRefundAmount(100, 116, [
  { lineSubtotal: 60, soldQuantity: 3, refundQuantity: 4 },
]), /Invalid refund item/)

console.log('POS sale and refund rules unit test passed')
