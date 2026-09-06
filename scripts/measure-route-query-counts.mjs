import 'dotenv/config'
import pg from 'pg'

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL
if (!connectionString) throw new Error('DATABASE_URL or DIRECT_URL is required')
const pool = new pg.Pool({ connectionString, max: 1, ssl: connectionString.includes('supabase') ? { rejectUnauthorized: false } : undefined })

function category(query) {
  const compact = query.replace(/\s+/g, ' ').trim()
  const operation = compact.split(' ', 1)[0]?.toUpperCase() || 'QUERY'
  const relation = compact.match(/\b(?:from|into|update)\s+"?([a-zA-Z0-9_]+)"?/i)?.[1] || 'derived'
  return `${operation}:${relation}`
}

async function snapshot() {
  const result = await pool.query(`
    select queryid::text, query, calls, total_exec_time
    from pg_stat_statements
    where dbid = (select oid from pg_database where datname = current_database())
  `)
  return new Map(result.rows.map((row) => [row.queryid, row]))
}

try {
  const session = await pool.query(`select token from session where "expiresAt" > now() order by "createdAt" desc limit 1`)
  const token = session.rows[0]?.token
  if (!token) throw new Error('No active session is available for route measurement')
  const route = process.argv[2] || '/dashboard'
  const baseUrl = process.env.ROUTE_AUDIT_BASE_URL || 'http://localhost:3000'
  const before = await snapshot()
  const started = performance.now()
  const response = await fetch(`${baseUrl}${route}`, { headers: { authorization: `Bearer ${token}`, accept: 'text/html' } })
  await response.arrayBuffer()
  const durationMs = performance.now() - started
  const after = await snapshot()
  const deltas = []
  for (const [id, current] of after) {
    const previous = before.get(id)
    const calls = Number(current.calls) - Number(previous?.calls ?? 0)
    const databaseMs = Number(current.total_exec_time) - Number(previous?.total_exec_time ?? 0)
    if (calls > 0) deltas.push({ category: category(current.query), calls, databaseMs: Number(databaseMs.toFixed(3)) })
  }
  deltas.sort((a, b) => b.databaseMs - a.databaseMs)
  console.log(JSON.stringify({ route, status: response.status, durationMs: Number(durationMs.toFixed(1)), queries: deltas.reduce((sum, item) => sum + item.calls, 0), databaseMs: Number(deltas.reduce((sum, item) => sum + item.databaseMs, 0).toFixed(3)), statements: deltas }, null, 2))
} finally {
  await pool.end()
}
