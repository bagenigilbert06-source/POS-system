import assert from 'node:assert/strict'
import test from 'node:test'
import { bindPosConnectivityEvents, checkoutAlreadyQueued, classifyOfflineSyncError, createProvisionalReceiptNo, isConnectivityFailure, offlineAmountConflicts, offlinePaymentAllowed, offlineWorkspaceStorageKey, shouldSynchronizeOfflineSale, summarizeOfflineQueue } from '../lib/pos/offline-policy'

test('offline checkout allows cash only', () => {
  assert.equal(offlinePaymentAllowed('cash'), true)
  assert.equal(offlinePaymentAllowed('mpesa'), false)
  assert.equal(offlinePaymentAllowed('card'), false)
  assert.equal(offlinePaymentAllowed('split'), false)
})

test('provisional receipt numbers are visibly offline and stable', () => {
  assert.equal(createProvisionalReceiptNo(new Date(2026, 7, 24, 15, 4, 5), '12345678-abcd-4000-8000-000000000000'), 'OFF-260824150405-123456')
})

test('queue summary keeps failures visible', () => {
  assert.deepEqual(summarizeOfflineQueue(['PENDING', 'FAILED', 'SYNCING', 'SYNCED', 'FAILED']), { pending: 1, syncing: 1, failed: 2, synced: 1 })
})

test('pending, interrupted, and failed records can synchronize', () => {
  assert.equal(shouldSynchronizeOfflineSale('PENDING'), true)
  assert.equal(shouldSynchronizeOfflineSale('SYNCING'), true)
  assert.equal(shouldSynchronizeOfflineSale('FAILED'), true)
  assert.equal(shouldSynchronizeOfflineSale('SYNCED'), false)
})

test('reconnection starts synchronization immediately and listener cleanup works', () => {
  const target = new EventTarget()
  const states: boolean[] = []
  let synchronizations = 0
  const cleanup = bindPosConnectivityEvents(target as unknown as Window, (online) => states.push(online), () => { synchronizations += 1 })

  target.dispatchEvent(new Event('offline'))
  assert.deepEqual(states, [false])
  assert.equal(synchronizations, 0)

  target.dispatchEvent(new Event('online'))
  assert.deepEqual(states, [false, true])
  assert.equal(synchronizations, 1)

  cleanup()
  target.dispatchEvent(new Event('online'))
  assert.equal(synchronizations, 1)
})

test('only connectivity errors trigger offline fallback', () => {
  assert.equal(isConnectivityFailure(new TypeError('Failed to fetch')), true)
  assert.equal(isConnectivityFailure(new Error('Network request failed')), true)
  assert.equal(isConnectivityFailure(new Error('Insufficient stock available')), false)
  assert.equal(isConnectivityFailure(new Error('Permission denied')), false)
})

test('browser refresh recognizes a basket already written to the queue', () => {
  assert.equal(checkoutAlreadyQueued('queue-1', ['queue-1']), true)
  assert.equal(checkoutAlreadyQueued('queue-2', ['queue-1']), false)
  assert.equal(checkoutAlreadyQueued(null, ['queue-1']), false)
})

test('offline carts, checkouts, and payments are isolated by workspace', () => {
  assert.equal(offlineWorkspaceStorageKey('pharmacy-org', 'cart'), 'pesaby-pos:pharmacy-org:cart')
  assert.notEqual(offlineWorkspaceStorageKey('pharmacy-org', 'cart'), offlineWorkspaceStorageKey('liquor-org', 'cart'))
  assert.notEqual(offlineWorkspaceStorageKey('pharmacy-org', 'checkout-id'), offlineWorkspaceStorageKey('pharmacy-org', 'mpesa'))
})

test('authoritative sync detects price/total and stock conflicts', () => {
  assert.equal(offlineAmountConflicts(1200, 1200), false)
  assert.equal(offlineAmountConflicts(1200, 1250), true)
  assert.equal(classifyOfflineSyncError('Insufficient stock available for Whisky'), 'STOCK_CONFLICT')
  assert.equal(classifyOfflineSyncError('Offline price conflict for Whisky'), 'PRICE_CONFLICT')
})
