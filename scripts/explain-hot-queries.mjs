import 'dotenv/config'
import pg from 'pg'

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL
if (!connectionString) throw new Error('DATABASE_URL or DIRECT_URL is required')

const pool = new pg.Pool({
  connectionString,
  max: 2,
  connectionTimeoutMillis: 12_000,
  ssl: connectionString.includes('supabase') ? { rejectUnauthorized: false } : undefined,
})

function planNodes(node, output = []) {
  output.push({
    node: node['Node Type'],
    relation: node['Relation Name'],
    index: node['Index Name'],
    rows: node['Actual Rows'],
    loops: node['Actual Loops'],
    buffers: (node['Shared Hit Blocks'] ?? 0) + (node['Shared Read Blocks'] ?? 0),
  })
  for (const child of node.Plans ?? []) planNodes(child, output)
  return output
}

async function explain(name, sql, params) {
  const result = await pool.query(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`, params)
  const report = result.rows[0]['QUERY PLAN'][0]
  return {
    name,
    planningMs: report['Planning Time'],
    executionMs: report['Execution Time'],
    nodes: planNodes(report.Plan).filter((node) => node.relation || node.index || node.node.includes('Sort')),
  }
}

try {
  const context = await pool.query(`
    select o.id as organization_id,
           (select "userId" from organization_membership where "organizationId" = o.id limit 1) as user_id,
           (select id from branch where "organizationId" = o.id limit 1) as branch_id,
           (select token from session order by "createdAt" desc limit 1) as session_token
    from organization o
    order by (select count(*) from sale s where s."orgId" = o.id) desc
    limit 1
  `)
  const { organization_id: orgId, user_id: userId, branch_id: branchId, session_token: token } = context.rows[0] ?? {}
  if (!orgId || !userId || !branchId || !token) throw new Error('Representative audit context is unavailable')
  const since = new Date(Date.now() - 30 * 86_400_000)

  const queries = [
    ['authentication', 'select id, "userId", "expiresAt" from session where token = $1 limit 1', [token]],
    ['organization membership', 'select "organizationId", role from organization_membership where "userId" = $1', [userId]],
    ['dashboard sales aggregate', `select coalesce(sum(total), 0), count(*) from sale where "orgId" = $1 and status = 'completed' and "createdAt" >= $2`, [orgId, since]],
    ['product name search', `select id, name, sku, barcode from product where "orgId" = $1 and "isActive" = true and name ilike $2 order by name limit 50`, [orgId, '%a%']],
    ['barcode lookup', `select id, name, barcode from product where "orgId" = $1 and barcode = $2 and "isActive" = true limit 1`, [orgId, '__audit_missing_barcode__']],
    ['inventory listing', `select ib."productId", ib."onHand", ib.reserved from inventory_balance ib where ib."orgId" = $1 and ib."branchId" = $2`, [orgId, branchId]],
    ['POS product loading', `select id, name, sku, barcode, stock, "sellingPrice" from product where "orgId" = $1 and "isActive" = true order by name`, [orgId]],
    ['sale history', `select id, "receiptNo", total, status, "createdAt" from sale where "orgId" = $1 order by "createdAt" desc limit 50`, [orgId]],
    ['customer search', `select id, name, phone, email from customer where "orgId" = $1 and (name ilike $2 or phone ilike $2 or email ilike $2) order by "createdAt" desc limit 50`, [orgId, '%a%']],
    ['open shift lookup', `select id, status, "openedAt" from pos_session where "orgId" = $1 and "openedBy" = $2 and status = 'open' limit 1`, [orgId, userId]],
    ['sales report range', `select date_trunc('day', "createdAt"), sum(total), count(*) from sale where "orgId" = $1 and status = 'completed' and "createdAt" >= $2 group by 1 order by 1`, [orgId, since]],
    ['invoice listing', `select id, "invoiceNo", status, total, "createdAt" from invoice where "orgId" = $1 order by "createdAt" desc limit 50`, [orgId]],
    ['expense listing', `select id, "expenseNo", status, amount, "expenseDate" from expense where "orgId" = $1 order by "expenseDate" desc limit 50`, [orgId]],
    ['audit log', `select id, action, "createdAt" from audit_event where "organizationId" = $1 order by "createdAt" desc limit 50`, [orgId]],
  ]

  const reports = []
  for (const [name, sql, params] of queries) reports.push(await explain(name, sql, params))
  console.log(JSON.stringify(reports, null, 2))
} finally {
  await pool.end()
}
