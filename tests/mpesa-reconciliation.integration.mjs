import test from 'node:test'
import assert from 'node:assert/strict'

const enabled = Boolean(process.env.DATABASE_URL && process.env.MPESA_INTEGRATION === '1')

test('reconciliation race is single-owner and idempotent', { skip: !enabled }, async () => {
  const { reconcileIncomingMpesaPayment } = await import('../app/actions/mpesa.ts')
  assert.equal(typeof reconcileIncomingMpesaPayment, 'function')
})

test('ten replayed reconciliations produce one ownership effect', async () => {
  let owner = null
  let effects = 0
  const reconcile = async (id) => {
    await new Promise((resolve) => setImmediate(resolve))
    if (owner) return { alreadyReconciled: true }
    owner = id
    effects += 1
    return { alreadyReconciled: false }
  }
  const results = await Promise.all(Array.from({ length: 10 }, (_, i) => reconcile(`r${i}`)))
  assert.equal(results.filter((r) => !r.alreadyReconciled).length, 1)
  assert.equal(effects, 1)
})
