import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

// Application traffic uses the provider's pooled URL. DIRECT_URL is kept for
// Drizzle migrations and is only a fallback for local environments without
// DATABASE_URL.
const connectionString = process.env.DATABASE_URL ?? process.env.DIRECT_URL
const configuredConnectionTimeout = Number(
  process.env.DATABASE_CONNECTION_TIMEOUT_MS ?? 12_000,
)
const connectionTimeoutMillis = Number.isFinite(configuredConnectionTimeout) && configuredConnectionTimeout > 0
  ? connectionString?.includes('supabase.com')
    ? Math.max(configuredConnectionTimeout, 12_000)
    : configuredConnectionTimeout
  : 12_000

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

// Keep each serverless instance within a small, configurable connection budget.
// The provider pooler handles global concurrency; an oversized local pool would
// multiply connections across every warm Vercel function instance.
const poolMax = positiveInteger(process.env.DATABASE_POOL_MAX, 5)
const idleTimeoutMillis = positiveInteger(process.env.DATABASE_IDLE_TIMEOUT_MS, 30_000)
const queryTimeoutMillis = positiveInteger(process.env.DATABASE_QUERY_TIMEOUT_MS, 30_000)

const globalForDatabase = globalThis as typeof globalThis & {
  __pesabyPostgresPool?: Pool
  __pesabyPostgresPoolConfig?: string
}

if (!connectionString) {
  throw new Error('DATABASE_URL or DIRECT_URL must be configured')
}

const poolConfigKey = `${connectionString}|${connectionTimeoutMillis}|${poolMax}|${idleTimeoutMillis}|${queryTimeoutMillis}`
const reusablePool = globalForDatabase.__pesabyPostgresPoolConfig === poolConfigKey
  ? globalForDatabase.__pesabyPostgresPool
  : undefined

// Dispose a development pool when its URL or network settings change during a
// hot reload. Otherwise globalThis would keep using the previous broken route.
if (globalForDatabase.__pesabyPostgresPool && !reusablePool) {
  void globalForDatabase.__pesabyPostgresPool.end().catch(() => undefined)
}

// Turbopack reloads server modules frequently in development. Reusing one pool
// prevents abandoned hot-reload pools from exhausting Supabase connections.
export const pool = reusablePool ?? new Pool({
  connectionString,
  max: poolMax,
  connectionTimeoutMillis,
  idleTimeoutMillis,
  query_timeout: queryTimeoutMillis,
  statement_timeout: queryTimeoutMillis,
  application_name: 'pesaby-web',
  keepAlive: true,
  keepAliveInitialDelayMillis: 10_000,
  ssl: connectionString?.includes('supabase.com')
    ? { rejectUnauthorized: false }
    : undefined,
})

if (!reusablePool) {
  // pg removes broken idle clients automatically; the listener prevents an
  // intermittent network reset from becoming an uncaught process error.
  pool.on('error', (error) => {
    console.warn('[database] Idle PostgreSQL connection was discarded:', error.message)
  })
}

if (process.env.NODE_ENV !== 'production') {
  globalForDatabase.__pesabyPostgresPool = pool
  globalForDatabase.__pesabyPostgresPoolConfig = poolConfigKey
}

export const db = drizzle(pool, { schema })
