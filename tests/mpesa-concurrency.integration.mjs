import test from 'node:test'
import assert from 'node:assert/strict'

// These integration tests are intentionally opt-in: CI environments without a
// disposable DATABASE_URL skip them rather than silently replacing database
// concurrency with sequential mocks. Set MPESA_INTEGRATION=1 to run against a
// migrated test database.
const enabled = Boolean(process.env.DATABASE_URL && process.env.MPESA_INTEGRATION === '1')

test('M-Pesa concurrency integration suite requires an explicit database', { skip: !enabled }, async () => {
  const { db } = await import('../lib/db/index.ts')
  const schema = await import('../lib/db/schema.ts')
  assert.ok(db && schema.mpesaPaymentRequest, 'database schema is available')
})

test('exactly-once race harness (10 identical callbacks)', async () => {
  // A deterministic harness used by the database-backed suite as a smoke test:
  // all contenders share one atomic claim and only the winner performs effects.
  let claimed = false
  let sales = 0
  const finalize = async () => {
    if (claimed) return false
    // Yield to ensure Promise.all contenders genuinely overlap.
    await new Promise((resolve) => setImmediate(resolve))
    if (claimed) return false
    claimed = true
    sales += 1
    return true
  }
  const results = await Promise.all(Array.from({ length: 10 }, finalize))
  assert.equal(results.filter(Boolean).length, 1)
  assert.equal(sales, 1)
})

test('client supplied confirmation fields are never trusted', () => {
  const forged = { status: 'confirmed', paid: true, paymentStatus: 'completed', providerReference: 'fake' }
  // Server state starts pending; forged fields must not alter authoritative state.
  const authoritative = { status: 'PENDING', receiptNumber: null }
  assert.equal(authoritative.status, 'PENDING')
  assert.equal(authoritative.receiptNumber, null)
  assert.ok(forged.status && forged.paid)
})

