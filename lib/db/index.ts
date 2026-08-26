import { Resolver } from 'node:dns/promises'
import { Socket } from 'node:net'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

const databaseDnsServers = process.env.DATABASE_DNS_SERVERS
  ?.split(',')
  .map((server) => server.trim())
  .filter(Boolean) ?? []

const configuredConnectionTimeout = Number(
  process.env.DATABASE_CONNECTION_TIMEOUT_MS ?? 4_000,
)
// Supabase's session endpoint (typically DIRECT_URL / port 5432) is better
// suited to the long-lived pg pool used by the Next.js server. Fall back to
// DATABASE_URL for providers that only expose one connection string.
const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL

function createDatabaseStream() {
  const socket = new Socket()
  const connect = socket.connect.bind(socket)

  socket.connect = ((port: number, host: string, listener?: () => void) => {
    const resolver = new Resolver()
    resolver.setServers(databaseDnsServers)

    void resolver.resolve4(host).then((addresses) => {
      const address = addresses[0]
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
}

// Turbopack reloads server modules frequently in development. Reusing one pool
// prevents abandoned hot-reload pools from exhausting Supabase connections.
export const pool = globalForDatabase.__pesabyPostgresPool ?? new Pool({
  connectionString,
  max: 5,
  connectionTimeoutMillis: Number.isFinite(configuredConnectionTimeout)
    ? configuredConnectionTimeout
    : 4_000,
  idleTimeoutMillis: 30_000,
  ...(databaseDnsServers.length > 0 ? { stream: createDatabaseStream } : {}),
  ssl: connectionString?.includes('supabase.com')
    ? { rejectUnauthorized: false }
    : undefined,
})

if (process.env.NODE_ENV !== 'production') {
  globalForDatabase.__pesabyPostgresPool = pool
}

export const db = drizzle(pool, { schema })
