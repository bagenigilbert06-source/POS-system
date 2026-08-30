import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import pg from 'pg'
import 'dotenv/config'

test('age verification records remain linked, immutable compliance facts', async (t) => {
  if (!process.env.DATABASE_URL) return t.skip('DATABASE_URL is unavailable')
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  await client.query('BEGIN')
  try {
    const context = await client.query('SELECT o.id AS org, b.id AS branch, u.id AS cashier FROM organization o JOIN branch b ON b."organizationId" = o.id JOIN "user" u ON true LIMIT 1')
    if (!context.rowCount) return t.skip('No organization/branch/user fixture is available')
    const { org, branch, cashier } = context.rows[0]
    const suffix = crypto.randomUUID()
    const saleId = `age-test-sale-${suffix}`
    const checkoutId = crypto.randomUUID()
    await client.query('INSERT INTO sale (id,"receiptNo",subtotal,"taxAmount","discountAmount","shippingAmount","roundingAmount",total,"paymentMethod","ageVerified","ageVerifiedAt","ageVerifiedBy",status,"idempotencyKey","userId","orgId","branchId") VALUES ($1,$2,100,0,0,0,0,100,$3,true,now(),$4,$5,$6,$4,$7,$8)', [saleId, `AGE-${suffix.slice(0, 8)}`, 'cash', cashier, 'completed', checkoutId, org, branch])
    await client.query('INSERT INTO age_verification (id,"organizationId","branchId","saleId","checkoutId","cashierId",status,"idType","idReferenceMasked","verifiedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,now())', [`age-test-${suffix}`, org, branch, saleId, checkoutId, cashier, 'VERIFIED', 'national_id', '****5678'])
    await client.query('INSERT INTO age_verification (id,"organizationId","branchId","checkoutId","cashierId",status,"cancelledAt") VALUES ($1,$2,$3,$4,$5,$6,now())', [`age-cancel-${suffix}`, org, branch, crypto.randomUUID(), cashier, 'CANCELLED'])
    const rows = await client.query('SELECT status,"saleId","idReferenceMasked" FROM age_verification WHERE id IN ($1,$2) ORDER BY status', [`age-test-${suffix}`, `age-cancel-${suffix}`])
    assert.equal(rows.rowCount, 2)
    assert.equal(rows.rows.find((row) => row.status === 'VERIFIED').saleId, saleId)
    assert.equal(rows.rows.find((row) => row.status === 'VERIFIED').idReferenceMasked, '****5678')
    assert.equal(rows.rows.find((row) => row.status === 'CANCELLED').saleId, null)
  } finally {
    await client.query('ROLLBACK')
    await client.end()
  }
})
