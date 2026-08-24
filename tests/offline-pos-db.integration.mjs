import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import test from 'node:test'
import 'dotenv/config'
import pg from 'pg'

test('offline sync ledger enforces organization-scoped idempotency', async (context) => {
  if (!process.env.DATABASE_URL) return context.skip('DATABASE_URL is not configured')
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  try {
    await client.query('begin')
    const fixture = await client.query(`
      select p."id", p."orgId", p."branchId", p."terminalId", p."openedBy"
      from "pos_session" p
      where p."branchId" is not null
      limit 1
    `)
    if (!fixture.rows[0]) {
      await client.query('rollback')
      return context.skip('No POS session fixture is available')
    }
    const source = fixture.rows[0]
    const idempotencyKey = randomUUID()
    const values = [
      randomUUID(), source.orgId, source.branchId, source.id, source.terminalId,
      source.openedBy, idempotencyKey, `OFF-TEST-${idempotencyKey.slice(0, 8).toUpperCase()}`,
      'integration-payload-hash', new Date(),
    ]
    await client.query(`
      insert into "offline_sale_sync"
        ("id", "organizationId", "branchId", "sessionId", "terminalId", "userId",
         "idempotencyKey", "provisionalReceiptNo", "payloadHash", "offlineCreatedAt")
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    `, values)

    await client.query('savepoint duplicate_check')
    let duplicateCode = null
    try {
      await client.query(`
        insert into "offline_sale_sync"
          ("id", "organizationId", "branchId", "sessionId", "terminalId", "userId",
           "idempotencyKey", "provisionalReceiptNo", "payloadHash", "offlineCreatedAt")
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
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
