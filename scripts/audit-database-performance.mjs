import 'dotenv/config'
import pg from 'pg'

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL
if (!connectionString) throw new Error('DATABASE_URL or DIRECT_URL is required')

const pool = new pg.Pool({
  connectionString,
  connectionTimeoutMillis: 12_000,
  ssl: connectionString.includes('supabase') ? { rejectUnauthorized: false } : undefined,
})

try {
  const [tableStats, indexes] = await Promise.all([
    pool.query(`
      select relname as table_name, n_live_tup as rows, seq_scan, idx_scan
      from pg_stat_user_tables
      order by n_live_tup desc
      limit 30
    `),
    pool.query(`
      select tablename, indexname, indexdef
      from pg_indexes
      where schemaname = 'public'
        and tablename = any($1::text[])
      order by tablename, indexname
    `, [[
      'session', 'organization_membership', 'branch_membership', 'customer',
      'product', 'sale', 'sale_item', 'expense', 'sales_return',
      'sales_return_item', 'invoice', 'inventory_balance', 'inventory_lot',
    ]]),
  ])

  console.log(JSON.stringify({ tables: tableStats.rows, indexes: indexes.rows }, null, 2))
} finally {
  await pool.end()
}
