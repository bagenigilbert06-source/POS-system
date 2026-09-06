import 'dotenv/config'
import pg from 'pg'

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL
if (!connectionString) throw new Error('DATABASE_URL or DIRECT_URL is required')
const pool = new pg.Pool({ connectionString, max: 1, ssl: connectionString.includes('supabase') ? { rejectUnauthorized: false } : undefined })

try {
  const session = await pool.query(`select token from session where "expiresAt" > now() order by "createdAt" desc limit 1`)
  const token = session.rows[0]?.token
  if (!token) throw new Error('No active session is available for route measurement')

  const baseUrl = process.env.ROUTE_AUDIT_BASE_URL || 'http://localhost:3000'
  for (const route of ['/dashboard', '/dashboard/pos', '/dashboard/sales', '/dashboard/inventory']) {
    const started = performance.now()
    const response = await fetch(`${baseUrl}${route}`, {
      redirect: 'manual',
      headers: { authorization: `Bearer ${token}`, accept: 'text/html' },
    })
    const body = await response.arrayBuffer()
    console.log(JSON.stringify({ route, status: response.status, durationMs: Number((performance.now() - started).toFixed(1)), bytes: body.byteLength, redirectedTo: response.headers.get('location') }))
  }
} finally {
  await pool.end()
}
