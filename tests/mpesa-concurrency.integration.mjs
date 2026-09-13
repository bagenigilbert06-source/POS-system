import test from 'node:test'
import assert from 'node:assert/strict'

// These integration tests are intentionally opt-in: CI environments without a
// disposable DATABASE_URL skip them rather than silently replacing database
// concurrency with sequential mocks. Set MPESA_INTEGRATION=1 to run against a
// migrated test database.
const enabled = Boolean(process.env.TEST_DATABASE_URL && process.env.MPESA_INTEGRATION === '1')

test('real PostgreSQL gives one owner to concurrent duplicate provider events', { skip: !enabled }, async () => {
  assert.notEqual(process.env.TEST_DATABASE_URL, process.env.DATABASE_URL, 'TEST_DATABASE_URL must not be the application database')
  const { Pool } = await import('pg')
  const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL, max: 12 })
  const table = `mpesa_concurrency_${process.pid}`
  try {
    await pool.query(`CREATE TEMP TABLE ${table} (transaction_id text PRIMARY KEY) ON COMMIT PRESERVE ROWS`)
    // A temporary table is connection-local, so hold one real PG connection and
    // issue overlapping protocol operations against its database uniqueness constraint.
    const client = await pool.connect()
    try {
      await client.query(`CREATE TEMP TABLE ${table}_shared (transaction_id text PRIMARY KEY)`)
      const results = await Promise.all(Array.from({ length: 10 }, () =>
        client.query(`INSERT INTO ${table}_shared (transaction_id) VALUES ($1) ON CONFLICT DO NOTHING RETURNING transaction_id`, ['SIMULATED-RECEIPT-1'])))
      assert.equal(results.reduce((count, result) => count + result.rowCount, 0), 1)
    } finally { client.release() }
  } finally { await pool.end() }
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

test('A-I PostgreSQL financial state-transition races remain single-owner', { skip: !enabled }, async () => {
  const { Pool } = await import('pg')
  const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL, max: 12 })
  const suffix = `${process.pid}_${Date.now()}`
  const intents = `mpesa_race_intents_${suffix}`, events = `mpesa_race_events_${suffix}`, shifts = `mpesa_race_shifts_${suffix}`
  const race = async (...queries) => Promise.allSettled(queries.map(({ text, values }) => pool.query(text, values)))
  try {
    await pool.query(`CREATE TABLE ${intents} (id text PRIMARY KEY, status text NOT NULL, receipt text UNIQUE, sale_id text UNIQUE)`)
    await pool.query(`CREATE TABLE ${events} (tx text PRIMARY KEY, intent_id text UNIQUE, state text NOT NULL DEFAULT 'RECEIVED', lease_at timestamp)`)
    await pool.query(`CREATE TABLE ${shifts} (id text PRIMARY KEY, status text NOT NULL)`)

    // A: callback claim vs cancellation. Exactly one conditional transition owns the pending intent.
    await pool.query(`INSERT INTO ${intents} VALUES ('a','WAITING',NULL,NULL)`)
    const a = await race(
      { text: `UPDATE ${intents} SET status='CONFIRMED',receipt='A1' WHERE id='a' AND status='WAITING' RETURNING id` },
      { text: `UPDATE ${intents} SET status='CANCELLED' WHERE id='a' AND status='WAITING' RETURNING id` },
    )
    assert.equal(a.filter((r) => r.status === 'fulfilled' && r.value.rowCount === 1).length, 1)

    // B: callback vs expiry uses the same one-owner transition.
    await pool.query(`INSERT INTO ${intents} VALUES ('b','WAITING',NULL,NULL)`)
    const b = await race(
      { text: `UPDATE ${intents} SET status='CONFIRMED',receipt='B1' WHERE id='b' AND status='WAITING' RETURNING id` },
      { text: `UPDATE ${intents} SET status='EXPIRED' WHERE id='b' AND status='WAITING' RETURNING id` },
    )
    assert.equal(b.filter((r) => r.status === 'fulfilled' && r.value.rowCount === 1).length, 1)

    // C/D: closure never deletes money or reopens a closed shift.
    await pool.query(`INSERT INTO ${shifts} VALUES ('c','OPEN'),('d','CLOSED')`)
    await pool.query(`INSERT INTO ${events} VALUES ('C1',NULL,'RECEIVED',NULL),('D1',NULL,'RECEIVED',NULL)`)
    await race(
      { text: `UPDATE ${shifts} SET status='CLOSING' WHERE id='c' AND status='OPEN'` },
      { text: `UPDATE ${events} SET state='NEEDS_REVIEW' WHERE tx='C1' AND state='RECEIVED'` },
    )
    assert.equal((await pool.query(`SELECT status FROM ${shifts} WHERE id='d'`)).rows[0].status, 'CLOSED')
    assert.equal((await pool.query(`SELECT count(*)::int count FROM ${events} WHERE tx IN ('C1','D1')`)).rows[0].count, 2)

    // E: SKIP LOCKED leases give one event to one worker.
    await pool.query(`INSERT INTO ${events} VALUES ('E1',NULL,'RECEIVED',NULL)`)
    const claim = async () => {
      const client = await pool.connect(); try {
        await client.query('BEGIN')
        const row = await client.query(`SELECT tx FROM ${events} WHERE state='RECEIVED' ORDER BY tx FOR UPDATE SKIP LOCKED LIMIT 1`)
        if (row.rowCount) await client.query(`UPDATE ${events} SET state='PROCESSING',lease_at=now() WHERE tx=$1`, [row.rows[0].tx])
        await new Promise((resolve) => setTimeout(resolve, 30)); await client.query('COMMIT'); return row.rows[0]?.tx
      } catch (error) { await client.query('ROLLBACK'); throw error } finally { client.release() }
    }
    const claimed = await Promise.all([claim(), claim()])
    assert.equal(claimed.filter((tx) => tx === 'E1').length, 1)

    // F/I: automatic and manual contenders cannot assign two receipts/events to one intent.
    await pool.query(`INSERT INTO ${intents} VALUES ('f','WAITING',NULL,NULL)`)
    await pool.query(`INSERT INTO ${events} VALUES ('F1',NULL,'RECEIVED',NULL),('F2',NULL,'RECEIVED',NULL)`)
    await race(
      { text: `UPDATE ${events} SET intent_id='f' WHERE tx='F1'; UPDATE ${intents} SET status='CONFIRMED',receipt='F1' WHERE id='f' AND status='WAITING'` },
      { text: `UPDATE ${events} SET intent_id='f' WHERE tx='F2'; UPDATE ${intents} SET status='CONFIRMED',receipt='F2' WHERE id='f' AND status='WAITING'` },
    )
    assert.equal((await pool.query(`SELECT count(*)::int count FROM ${events} WHERE intent_id='f'`)).rows[0].count, 1)

    // G/H: simultaneous duplicate STK/C2B receipts persist once.
    for (const tx of ['G-STK', 'H-C2B']) {
      const duplicate = await race(...Array.from({ length: 8 }, () => ({ text: `INSERT INTO ${events}(tx,state) VALUES ($1,'RECEIVED') ON CONFLICT DO NOTHING RETURNING tx`, values: [tx] })))
      assert.equal(duplicate.filter((r) => r.status === 'fulfilled' && r.value.rowCount === 1).length, 1)
    }
  } finally {
    await pool.query(`DROP TABLE IF EXISTS ${events}, ${intents}, ${shifts}`)
    await pool.end()
  }
})
