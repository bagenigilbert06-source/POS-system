import assert from 'node:assert/strict'
import test from 'node:test'
import { filterPharmacyCatalog, isPharmacyBusiness, normalizeExpiryWarningDays, pharmacyExpiryState, planFefoAllocation, planReturnedLotTrace } from '../lib/pharmacy/rules'

test('recognizes current and legacy pharmacy workspace categories', () => {
  assert.equal(isPharmacyBusiness('pharmacy', 'community_pharmacy'), true)
  assert.equal(isPharmacyBusiness('health_wellness', 'health_pharmacy'), true)
  assert.equal(isPharmacyBusiness('retail', 'retail_pharmacy'), true)
  assert.equal(isPharmacyBusiness('retail', 'liquor_shop'), false)
})

test('pharmacy catalog excludes non-medicine products without changing liquor catalog behavior', () => {
  const products = [{ id: 'whisky' }, { id: 'paracetamol' }]
  assert.deepEqual(filterPharmacyCatalog(products, ['paracetamol'], true), [{ id: 'paracetamol' }])
  assert.deepEqual(filterPharmacyCatalog(products, ['paracetamol'], false), products)
})

test('expiry warning thresholds are normalized safely', () => {
  assert.deepEqual(normalizeExpiryWarningDays([30, 90, 30, -2, 7]), [90, 30, 7])
  assert.deepEqual(normalizeExpiryWarningDays([]), [90, 60, 30, 7])
})

test('expiry state distinguishes normal, warning, near-expiry and expired batches', () => {
  const now = new Date('2026-08-24T00:00:00.000Z')
  assert.equal(pharmacyExpiryState(new Date('2027-01-01T00:00:00.000Z'), now).status, 'normal')
  assert.equal(pharmacyExpiryState(new Date('2026-10-01T00:00:00.000Z'), now).status, 'expiring_soon')
  assert.equal(pharmacyExpiryState(new Date('2026-08-29T00:00:00.000Z'), now).status, 'near_expiry')
  assert.equal(pharmacyExpiryState(new Date('2026-08-23T00:00:00.000Z'), now).status, 'expired')
})

test('FEFO consumes the earliest valid expiry across multiple batches', () => {
  const now = new Date('2026-08-24T00:00:00.000Z')
  const allocation = planFefoAllocation([
    { id: 'june', quantity: 10, expiresAt: new Date('2027-06-01'), status: 'available' },
    { id: 'january', quantity: 4, expiresAt: new Date('2027-01-01'), status: 'available' },
  ], 7, now)
  assert.deepEqual(allocation, [{ lotId: 'january', quantity: 4 }, { lotId: 'june', quantity: 3 }])
})

test('FEFO excludes expired, quarantined and empty batches', () => {
  const now = new Date('2026-08-24T00:00:00.000Z')
  assert.deepEqual(planFefoAllocation([
    { id: 'expired', quantity: 20, expiresAt: new Date('2026-08-01'), status: 'available' },
    { id: 'quarantine', quantity: 20, expiresAt: new Date('2027-01-01'), status: 'quarantined' },
    { id: 'empty', quantity: 0, expiresAt: new Date('2027-01-01'), status: 'available' },
    { id: 'valid', quantity: 3, expiresAt: new Date('2027-02-01'), status: 'available' },
  ], 3, now), [{ lotId: 'valid', quantity: 3 }])
})

test('FEFO refuses a sale when unexpired batch stock is insufficient', () => {
  assert.throws(() => planFefoAllocation([{ id: 'only', quantity: 2, expiresAt: null, status: 'available' }], 3), /Insufficient unexpired batch stock/)
})

test('returned medicine traces only the remaining quantity in each original batch allocation', () => {
  const result = planReturnedLotTrace([
    { id: 'allocation-a', quantity: 6, alreadyReturned: 4 },
    { id: 'allocation-b', quantity: 8, alreadyReturned: 0 },
  ], 5)
  assert.deepEqual(result, {
    traced: [
      { allocationId: 'allocation-a', quantity: 2 },
      { allocationId: 'allocation-b', quantity: 3 },
    ],
    untracedQuantity: 0,
  })
})

test('returned medicine keeps unmatched legacy quantities quarantined and visible', () => {
  const result = planReturnedLotTrace([{ id: 'allocation-a', quantity: 2, alreadyReturned: 2 }], 3)
  assert.equal(result.traced.length, 0)
  assert.equal(result.untracedQuantity, 3)
})
