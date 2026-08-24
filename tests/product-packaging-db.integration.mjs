import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import test from 'node:test'
import 'dotenv/config'
import pg from 'pg'

test('product packages enforce barcode uniqueness and valid conversion', async (context) => {
  if (!process.env.DATABASE_URL) return context.skip('DATABASE_URL is not configured')
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  try {
    await client.query('begin')
    const fixture = await client.query('select "id", "orgId" from "product" limit 1')
    if (!fixture.rows[0]) { await client.query('rollback'); return context.skip('No product fixture is available') }
    const source = fixture.rows[0]
    const barcode = `PKGTEST${Date.now()}`
    await client.query(`insert into "product_package" ("id","organizationId","productId","name","packageType","barcode","sellingPrice","baseUnitQuantity") values ($1,$2,$3,$4,'case',$5,1200,12)`, [randomUUID(), source.orgId, source.id, `Test case ${randomUUID()}`, barcode])
    await client.query('savepoint duplicate_barcode')
    let duplicateCode = null
    try { await client.query(`insert into "product_package" ("id","organizationId","productId","name","packageType","barcode","sellingPrice","baseUnitQuantity") values ($1,$2,$3,$4,'case',$5,1200,12)`, [randomUUID(), source.orgId, source.id, `Other case ${randomUUID()}`, barcode]) }
    catch (error) { duplicateCode = error.code; await client.query('rollback to savepoint duplicate_barcode') }
    assert.equal(duplicateCode, '23505')
    await client.query('savepoint invalid_conversion')
    let checkCode = null
    try { await client.query(`insert into "product_package" ("id","organizationId","productId","name","packageType","sellingPrice","baseUnitQuantity") values ($1,$2,$3,$4,'case',100,1)`, [randomUUID(), source.orgId, source.id, `Invalid ${randomUUID()}`]) }
    catch (error) { checkCode = error.code; await client.query('rollback to savepoint invalid_conversion') }
    assert.equal(checkCode, '23514')
    await client.query('rollback')
  } finally { await client.end() }
})
