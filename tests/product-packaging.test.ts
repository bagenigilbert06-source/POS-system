import assert from 'node:assert/strict'
import test from 'node:test'
import { availablePackageQuantity, baseUnitsForSale } from '../lib/pos/product-packaging'

test('bottle, six-pack, twelve-pack and case convert to base inventory', () => {
  assert.equal(baseUnitsForSale(3, 1), 3)
  assert.equal(baseUnitsForSale(2, 6), 12)
  assert.equal(baseUnitsForSale(2, 12), 24)
  assert.equal(baseUnitsForSale(3, 24), 72)
})

test('package availability never oversells remaining bottles', () => {
  assert.equal(availablePackageQuantity(25, 12), 2)
  assert.equal(availablePackageQuantity(11, 12), 0)
})

test('invalid conversions are rejected', () => {
  assert.throws(() => baseUnitsForSale(1, 0), /conversion/)
  assert.throws(() => baseUnitsForSale(1.5, 6), /quantity/)
})
