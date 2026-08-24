import assert from 'node:assert/strict'
import test from 'node:test'
import 'dotenv/config'
import pg from 'pg'

test('pharmacy schema, FEFO trace and workflow tables are installed', async (context) => {
  if (!process.env.DATABASE_URL) return context.skip('DATABASE_URL is not configured')
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_URL.includes('supabase.com') ? { rejectUnauthorized: false } : undefined })
  await client.connect()
  try {
    const tables = ['pharmacy_configuration', 'pharmacy_product', 'sale_item_lot_allocation', 'pharmacy_sale_record', 'restricted_item_audit', 'pharmacy_return_disposition']
    for (const table of tables) {
      const result = await client.query('select to_regclass($1) as name', [`public.${table}`])
      assert.equal(result.rows[0].name, table)
    }
    const indexes = await client.query(`select indexname from pg_indexes where schemaname='public' and indexname = any($1::text[])`, [[
      'pharmacy_product_org_internal_code_unique',
      'sale_item_lot_allocation_unique',
      'pharmacy_sale_record_org_sale_unique',
      'restricted_item_audit_org_created_idx',
      'pharmacy_return_disposition_org_status_idx',
    ]])
    assert.equal(indexes.rowCount, 5)
    const returnItemColumn = await client.query(`select 1 from information_schema.columns where table_schema='public' and table_name='sales_return_item' and column_name='originalSaleItemId'`)
    assert.equal(returnItemColumn.rowCount, 1)
  } finally {
    await client.end()
  }
})
