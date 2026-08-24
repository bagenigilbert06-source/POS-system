import assert from 'node:assert/strict'
import test from 'node:test'
import { canAccessHeldSale, heldSaleExpired, heldSalePriceChanged } from '../lib/pos/held-sale-policy'

test('held sales are isolated by organization and branch', () => {
  const scope = { organizationId: 'org-1', branchId: 'branch-a' }
  assert.equal(canAccessHeldSale(scope, { organizationId: 'org-1', branchId: 'branch-a' }), true)
  assert.equal(canAccessHeldSale(scope, { organizationId: 'org-1', branchId: 'branch-b' }), false)
  assert.equal(canAccessHeldSale(scope, { organizationId: 'org-2', branchId: 'branch-a' }), false)
})

test('expired held sales cannot be resumed', () => {
  const now = new Date('2026-08-24T12:00:00Z')
  assert.equal(heldSaleExpired(new Date('2026-08-24T11:59:59Z'), now), true)
  assert.equal(heldSaleExpired(new Date('2026-08-24T12:00:00Z'), now), true)
  assert.equal(heldSaleExpired(new Date('2026-08-24T12:00:01Z'), now), false)
})

test('resumed baskets detect authoritative price changes', () => {
  assert.equal(heldSalePriceChanged(100, 100), false)
  assert.equal(heldSalePriceChanged(100, 105), true)
})
