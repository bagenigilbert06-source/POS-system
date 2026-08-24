import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import test from 'node:test'
import 'dotenv/config'
import pg from 'pg'

test('suspended-sale ledger enforces idempotency and branch scope', async (context) => {
  if (!process.env.DATABASE_URL) return context.skip('DATABASE_URL is not configured')
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  try {
    await client.query('begin')
    const fixture = await client.query(`
      select p."id", p."orgId", p."branchId", p."terminalId", p."openedBy"
      from "pos_session" p where p."branchId" is not null limit 1
    `)
    if (!fixture.rows[0]) {
      await client.query('rollback')
      return context.skip('No POS session fixture is available')
    }
    const source = fixture.rows[0]
    const idempotencyKey = randomUUID()
    const values = [randomUUID(), source.orgId, source.branchId, source.terminalId, source.id, source.openedBy, idempotencyKey, JSON.stringify([{ productId: 'test-product', productName: 'Test', quantity: 1, unitPrice: 10, totalPrice: 10 }]), new Date(Date.now() + 60_000)]
    await client.query(`
      insert into "suspended_sale"
        ("id", "organizationId", "branchId", "terminalId", "sessionId", "cashierId", "idempotencyKey", "items", "subtotal", "expiresAt")
      values ($1,$2,$3,$4,$5,$6,$7,$8,10,$9)
    `, values)
    const wrongBranch = await client.query(`select count(*)::int as count from "suspended_sale" where "organizationId"=$1 and "branchId"=$2 and "status"='HELD'`, [source.orgId, randomUUID()])
    assert.equal(wrongBranch.rows[0].count, 0)

    await client.query('savepoint duplicate_check')
    let duplicateCode = null
    try {
      await client.query(`
        insert into "suspended_sale"
          ("id", "organizationId", "branchId", "terminalId", "sessionId", "cashierId", "idempotencyKey", "items", "subtotal", "expiresAt")
        values ($1,$2,$3,$4,$5,$6,$7,$8,10,$9)
      `, [randomUUID(), ...values.slice(1)])
    } catch (error) {
      duplicateCode = error.code
      await client.query('rollback to savepoint duplicate_check')
    }
    assert.equal(duplicateCode, '23505')
    await client.query('rollback')
  } finally {
    await client.end()
  }
})
