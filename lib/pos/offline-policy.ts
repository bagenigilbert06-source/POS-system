export type OfflineQueueStatus = 'PENDING' | 'SYNCING' | 'FAILED' | 'SYNCED'

export function offlineWorkspaceStorageKey(organizationId: string, key: 'cart' | 'checkout-id' | 'mpesa') {
  if (!organizationId.trim()) throw new Error('POS workspace is required')
  return `pesaby-pos:${organizationId}:${key}`
}

export function createProvisionalReceiptNo(now: Date, id: string) {
  const stamp = [
    String(now.getFullYear()).slice(-2),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0'),
  ].join('')
  return `OFF-${stamp}-${id.replaceAll('-', '').slice(0, 6).toUpperCase()}`
}

export function offlinePaymentAllowed(method: string) {
  return method === 'cash'
}

export function summarizeOfflineQueue(statuses: OfflineQueueStatus[]) {
  return statuses.reduce((summary, status) => {
    if (status === 'PENDING') summary.pending += 1
    if (status === 'SYNCING') summary.syncing += 1
    if (status === 'FAILED') summary.failed += 1
    if (status === 'SYNCED') summary.synced += 1
    return summary
  }, { pending: 0, syncing: 0, failed: 0, synced: 0 })
}

export function shouldSynchronizeOfflineSale(status: OfflineQueueStatus) {
  return status === 'PENDING' || status === 'FAILED' || status === 'SYNCING'
}

/** Binds the POS connectivity state and starts queue replay in the same online event turn. */
export function bindPosConnectivityEvents(target: Window, setOnline: (online: boolean) => void, synchronize: () => void | Promise<void>) {
  const online = () => {
    setOnline(true)
    void synchronize()
  }
  const offline = () => setOnline(false)
  target.addEventListener('online', online)
  target.addEventListener('offline', offline)
  return () => {
    target.removeEventListener('online', online)
    target.removeEventListener('offline', offline)
  }
}

export function checkoutAlreadyQueued(activeCheckoutId: string | null, queuedIds: string[]) {
  return Boolean(activeCheckoutId && queuedIds.includes(activeCheckoutId))
}

export function offlineAmountConflicts(cached: number, authoritative: number, tolerance = 0.01) {
  return !Number.isFinite(cached) || !Number.isFinite(authoritative) || Math.abs(cached - authoritative) > tolerance
}

export function classifyOfflineSyncError(message: string) {
  if (/stock|available/i.test(message)) return 'STOCK_CONFLICT'
  if (/shift|register/i.test(message)) return 'SHIFT_CONFLICT'
  if (/price|tax|total/i.test(message)) return 'PRICE_CONFLICT'
  return 'SYNC_FAILED'
}

/** Only transport failures may fall back to the durable offline queue. */
export function isConnectivityFailure(error: unknown) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true
  const message = error instanceof Error ? error.message : String(error ?? '')
  return /failed to fetch|network(?: request)? failed|networkerror|load failed|connection (?:was )?(?:lost|closed|refused)|fetch failed/i.test(message)
}
