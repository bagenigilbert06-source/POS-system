import type { EtimsStatus } from './types'

export function etimsRequired(configuration: { enabled: boolean; invoiceSubmissionEnabled: boolean } | null | undefined) {
  return Boolean(configuration?.enabled && configuration.invoiceSubmissionEnabled)
}

export function retryDisposition(input: { retryable: boolean; automaticRetryEnabled: boolean; attempt: number; maximumAttempts: number }) {
  const retry = input.retryable && input.automaticRetryEnabled && input.attempt < input.maximumAttempts
  return { status: retry ? 'RETRYING' as const : 'FAILED' as const, retry }
}

export function canVoidWithEtimsStatus(status: EtimsStatus | null) {
  return status !== 'ACCEPTED' && status !== 'CREDITED'
}

export function cashierEtimsLabel(status: EtimsStatus | null) {
  if (!status || status === 'NOT_REQUIRED') return null
  if (status === 'ACCEPTED' || status === 'CREDITED') return 'eTIMS: Accepted'
  if (status === 'FAILED') return 'eTIMS: Action required'
  return 'eTIMS: Pending submission'
}
