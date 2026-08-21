const TRANSIENT_DATABASE_ERROR_CODES = new Set([
  'EAI_AGAIN',
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'ENOTFOUND',
])

function isTransientDatabaseError(error: unknown) {
  if (!(error instanceof Error)) return false

  const errorWithCode = error as Error & { code?: string; cause?: unknown }
  if (errorWithCode.code && TRANSIENT_DATABASE_ERROR_CODES.has(errorWithCode.code)) return true

  const message = `${error.message} ${String(errorWithCode.cause ?? '')}`
  return [...TRANSIENT_DATABASE_ERROR_CODES].some((code) => message.includes(code))
}

/** Retries short-lived database and DNS failures without masking permanent errors. */
export async function withDatabaseRetry<T>(operation: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      if (!isTransientDatabaseError(error) || attempt === attempts - 1) throw error

      await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1)))
    }
  }

  throw lastError
}
