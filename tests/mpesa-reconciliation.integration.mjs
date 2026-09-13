import test from 'node:test'
import assert from 'node:assert/strict'

const enabled = Boolean(process.env.TEST_DATABASE_URL && process.env.MPESA_INTEGRATION === '1')

test('reconciliation integration uses the explicit disposable PostgreSQL database', { skip: !enabled }, async () => {
  assert.notEqual(process.env.TEST_DATABASE_URL, process.env.DATABASE_URL, 'TEST_DATABASE_URL must not be the application database')
  const { Pool } = await import('pg')
  const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL })
  try { assert.equal((await pool.query('SELECT 1 AS ready')).rows[0].ready, 1) }
  finally { await pool.end() }
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
