import { Resolver } from 'node:dns/promises'
import { Socket } from 'node:net'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

// Application traffic must use the provider's pooled URL. DIRECT_URL is kept
// for Drizzle migrations, but can be IPv6-only or unavailable from local/WSL
// networks and should not be selected by the long-running Next.js process.
// Supabase pooler hostnames occasionally fail through the host/WSL resolver
// with EAI_AGAIN. Use explicit public resolvers by default for this public
// endpoint, while still allowing deployments to supply their own DNS servers.
const connectionString = process.env.DATABASE_URL ?? process.env.DIRECT_URL
const configuredDatabaseDnsServers = process.env.DATABASE_DNS_SERVERS
  ?.split(',')
  .map((server) => server.trim())
  .filter(Boolean) ?? []
const databaseDnsServers = configuredDatabaseDnsServers.length > 0
  ? configuredDatabaseDnsServers
  : connectionString?.includes('supabase.com')
    ? ['1.1.1.1', '8.8.8.8']
    : []

const configuredConnectionTimeout = Number(
  process.env.DATABASE_CONNECTION_TIMEOUT_MS ?? 12_000,
)
const connectionTimeoutMillis = Number.isFinite(configuredConnectionTimeout) && configuredConnectionTimeout > 0
  ? connectionString?.includes('supabase.com')
    ? Math.max(configuredConnectionTimeout, 12_000)
    : configuredConnectionTimeout
  : 12_000

let databaseAddressCursor = 0

function createDatabaseStream() {
  const socket = new Socket()
  const connect = socket.connect.bind(socket)

  socket.connect = ((port: number, host: string, listener?: () => void) => {
    const resolver = new Resolver()
    resolver.setServers(databaseDnsServers)

    void resolver.resolve4(host).then((addresses) => {
      const address = addresses[databaseAddressCursor % addresses.length]
      databaseAddressCursor += 1
      if (!address) throw new Error(`No IPv4 address found for database host ${host}`)
      if (!socket.destroyed) connect({ port, host: address }, listener)
    }).catch((error: unknown) => {
      socket.destroy(error instanceof Error ? error : new Error('Database DNS lookup failed'))
    })

    return socket
  }) as typeof socket.connect

  return socket
}

const globalForDatabase = globalThis as typeof globalThis & {
  __pesabyPostgresPool?: Pool
  __pesabyPostgresPoolConfig?: string
}

if (!connectionString) {
  throw new Error('DATABASE_URL or DIRECT_URL must be configured')
}

const poolConfigKey = `${connectionString}|${connectionTimeoutMillis}|${databaseDnsServers.join(',')}`
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
  max: 5,
  connectionTimeoutMillis,
  idleTimeoutMillis: 60_000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10_000,
  ...(databaseDnsServers.length > 0 ? { stream: createDatabaseStream } : {}),
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
