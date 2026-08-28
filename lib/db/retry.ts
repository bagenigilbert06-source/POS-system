const TRANSIENT_DATABASE_ERROR_CODES = new Set([
  'EAI_AGAIN',
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'ENOTFOUND',
  '08000',
  '08003',
  '08006',
  '57P01',
  '57P02',
  '57P03',
])
const TRANSIENT_DATABASE_ERROR_MESSAGES = [
  'timeout exceeded when trying to connect',
  'connection terminated due to connection timeout',
  'connection terminated unexpectedly',
  'connection ended unexpectedly',
  'failed to get session',
  'database dns lookup failed',
]

function isTransientDatabaseError(error: unknown) {
  if (!(error instanceof Error)) return false

  const errorWithCode = error as Error & {
    code?: string
    cause?: unknown
    body?: { code?: string; message?: string }
  }
  const codes = [errorWithCode.code, errorWithCode.body?.code].filter(Boolean) as string[]
  if (codes.some((code) => TRANSIENT_DATABASE_ERROR_CODES.has(code))) return true

  const cause = errorWithCode.cause
  if (cause instanceof Error && isTransientDatabaseError(cause)) return true

  const message = `${error.message} ${errorWithCode.body?.message ?? ''} ${String(cause ?? '')}`
  const normalizedMessage = message.toLowerCase()
  return (
    [...TRANSIENT_DATABASE_ERROR_CODES].some((code) => message.includes(code)) ||
    TRANSIENT_DATABASE_ERROR_MESSAGES.some((part) => normalizedMessage.includes(part))
  )
}

/** Retries short-lived database and DNS failures without masking permanent errors. */
export async function withDatabaseRetry<T>(operation: () => Promise<T>, attempts = 4): Promise<T> {
  let lastError: unknown

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      if (!isTransientDatabaseError(error) || attempt === attempts - 1) throw error

      // Poolers can briefly reject a burst of new connections. Exponential
      // backoff plus jitter avoids retrying every dashboard request in lockstep.
      const delay = Math.min(2_000, 250 * 2 ** attempt) + Math.floor(Math.random() * 150)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError
}
