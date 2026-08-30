import { createHash } from 'node:crypto'
import { deserialize, serialize } from 'node:v8'
import { createClient } from 'redis'

interface RedisClient {
  readonly isOpen: boolean
  readonly isReady: boolean
  connect(): Promise<unknown>
  get(key: string): Promise<string | null>
  set(key: string, value: string, options: { EX: number }): Promise<unknown>
  incr(key: string): Promise<number>
  ping(): Promise<string>
  destroy(): void
  on(event: 'error', listener: () => void): unknown
}

const CACHE_PREFIX = process.env.REDIS_CACHE_PREFIX?.trim() || 'pesaby'
const REDIS_RETRY_COOLDOWN_MS = 30_000
const inFlightLoads = new Map<string, Promise<unknown>>()

declare global {
  var __pesabyRedisClient: RedisClient | undefined
  var __pesabyRedisConnecting: Promise<RedisClient | null> | undefined
  var __pesabyRedisDisabledUntil: number | undefined
}

function markRedisUnavailable() {
  globalThis.__pesabyRedisDisabledUntil = Date.now() + REDIS_RETRY_COOLDOWN_MS
}

function safelyDestroyRedisClient(client: RedisClient) {
  if (globalThis.__pesabyRedisClient === client) {
    globalThis.__pesabyRedisClient = undefined
  }

  // node-redis may close the socket itself when connect() fails. destroy()
  // throws ClientClosedError when called afterward, so cleanup must be guarded.
  if (!client.isOpen) return
  try {
    client.destroy()
  } catch {
    // Redis is an optional cache; cleanup failures must not block DB reads.
  }
}

async function redisClient(): Promise<RedisClient | null> {
  const url = process.env.REDIS_URL?.trim()
  if (!url || (globalThis.__pesabyRedisDisabledUntil ?? 0) > Date.now()) return null
  if (globalThis.__pesabyRedisClient?.isReady) return globalThis.__pesabyRedisClient
  if (globalThis.__pesabyRedisConnecting) return globalThis.__pesabyRedisConnecting

  const connecting = (async (): Promise<RedisClient | null> => {
    const client = createClient({
      url,
      socket: {
        // Redis is an optimization. Never make a cashier wait on a cache
        // connection when PostgreSQL can serve the authoritative data.
        connectTimeout: 300,
        reconnectStrategy: false,
      },
    })
    client.on('error', () => {
      markRedisUnavailable()
      if (!client.isOpen) safelyDestroyRedisClient(client)
    })
    try {
      await client.connect()
      globalThis.__pesabyRedisClient = client
      return client
    } catch {
      markRedisUnavailable()
      safelyDestroyRedisClient(client)
      return null
    } finally {
      globalThis.__pesabyRedisConnecting = undefined
    }
  })()

  globalThis.__pesabyRedisConnecting = connecting
  return connecting
}

function safePart(value: string) {
  return createHash('sha256').update(value).digest('base64url').slice(0, 22)
}

function versionKey(namespace: string, organizationId: string) {
  return `${CACHE_PREFIX}:cache-version:${namespace}:${safePart(organizationId)}`
}

function dataKey(namespace: string, organizationId: string, version: string, variant: string) {
  return `${CACHE_PREFIX}:cache:${namespace}:${safePart(organizationId)}:${version}:${safePart(variant)}`
}

function encode(value: unknown) {
  return serialize(value).toString('base64')
}

function decode<T>(value: string): T {
  return deserialize(Buffer.from(value, 'base64')) as T
}

/**
 * Cache-aside helper for tenant-scoped, non-sensitive read models.
 * Redis is an optimization only: connection, read, serialization, and write
 * failures all fall back to the authoritative PostgreSQL loader.
 */
export async function readThroughRedis<T>(options: {
  namespace: 'products' | 'categories' | 'dashboard'
  organizationId: string
  variant: string
  ttlSeconds: number
  load: () => Promise<T>
}): Promise<T> {
  const client = await redisClient()
  if (!client) return options.load()

  try {
    const version = await client.get(versionKey(options.namespace, options.organizationId)) ?? '0'
    const key = dataKey(options.namespace, options.organizationId, version, options.variant)
    const cached = await client.get(key)
    if (cached) return decode<T>(cached)

    const existingLoad = inFlightLoads.get(key) as Promise<T> | undefined
    if (existingLoad) return existingLoad

    const load = options.load()
      .then(async (value) => {
        await client.set(key, encode(value), { EX: options.ttlSeconds }).catch(markRedisUnavailable)
        return value
      })
      .finally(() => inFlightLoads.delete(key))
    inFlightLoads.set(key, load)
    return load
  } catch {
    markRedisUnavailable()
    return options.load()
  }
}

export async function invalidateRedisCache(namespace: 'products' | 'categories' | 'dashboard', organizationId: string) {
  const client = await redisClient()
  if (!client) return false
  try {
    await client.incr(versionKey(namespace, organizationId))
    return true
  } catch {
    markRedisUnavailable()
    return false
  }
}

/** Product writes also affect category product counts, so invalidate both views. */
export async function invalidateProductCache(organizationId: string) {
  const results = await Promise.all([
    invalidateRedisCache('products', organizationId),
    invalidateRedisCache('categories', organizationId),
  ])
  return results.every(Boolean)
}

/** Stock/price mutations do not change category membership counts. */
export async function invalidateProductReadCache(organizationId: string) {
  return invalidateRedisCache('products', organizationId)
}

export async function invalidateCategoryCache(organizationId: string) {
  return invalidateRedisCache('categories', organizationId)
}

export async function checkRedisCache() {
  const configured = Boolean(process.env.REDIS_URL?.trim())
  if (!configured) return { configured: false, connected: false }
  const client = await redisClient()
  if (!client) return { configured: true, connected: false }
  try {
    return { configured: true, connected: (await client.ping()) === 'PONG' }
  } catch {
    markRedisUnavailable()
    return { configured: true, connected: false }
  }
}
