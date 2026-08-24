import type { CartItem, OfflineSaleSyncInput } from '@/app/actions/sales'
import type { OfflineQueueStatus } from './offline-policy'

const DATABASE_NAME = 'pesaby-pos-offline'
const DATABASE_VERSION = 2
const SALES_STORE = 'sales'
const CACHE_STORE = 'cache'

export type OfflineSaleRecord = {
  id: string
  organizationId: string
  status: OfflineQueueStatus
  payload: OfflineSaleSyncInput
  provisionalReceiptNo: string
  createdAt: string
  updatedAt: string
  attemptCount: number
  lastError?: string
  official?: {
    saleId: string
    receiptNo: string
    tax: number
    rounding: number
    total: number
    items: Array<{ saleItemId: string; productId: string }>
  }
}

export type OfflineCatalogueSnapshot<TProduct, TCategory, TCustomer, TSettings> = {
  id: string
  organizationId: string
  products: TProduct[]
  categories: TCategory[]
  customers: TCustomer[]
  settings: TSettings
  cachedAt: string
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('Offline storage is unavailable in this browser'))
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(SALES_STORE)) {
        const sales = database.createObjectStore(SALES_STORE, { keyPath: 'id' })
        sales.createIndex('status', 'status')
        sales.createIndex('createdAt', 'createdAt')
        sales.createIndex('organizationId', 'organizationId')
      } else {
        const sales = request.transaction!.objectStore(SALES_STORE)
        if (!sales.indexNames.contains('organizationId')) sales.createIndex('organizationId', 'organizationId')
      }
      if (!database.objectStoreNames.contains(CACHE_STORE)) database.createObjectStore(CACHE_STORE, { keyPath: 'id' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Could not open offline storage'))
    request.onblocked = () => reject(new Error('Offline storage upgrade is blocked by another Pesaby tab'))
  })
}

async function requestResult<T>(mode: IDBTransactionMode, storeName: string, execute: (store: IDBObjectStore) => IDBRequest<T>) {
  const database = await openDatabase()
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(storeName, mode)
      const request = execute(transaction.objectStore(storeName))
      let result: T
      request.onsuccess = () => { result = request.result }
      request.onerror = () => reject(request.error ?? new Error('Offline storage request failed'))
      // A successful IDB request can still be followed by a failed transaction.
      // Only report success after the write (or read transaction) has committed.
      transaction.oncomplete = () => resolve(result)
      transaction.onabort = () => reject(transaction.error ?? new Error('Offline storage transaction was cancelled'))
      transaction.onerror = () => reject(transaction.error ?? new Error('Offline storage transaction failed'))
    })
  } finally {
    database.close()
  }
}

export async function saveOfflineSale(record: OfflineSaleRecord) {
  if (!record.organizationId) throw new Error('Offline sale workspace is required')
  await requestResult('readwrite', SALES_STORE, (store) => store.put(record))
}

export async function getOfflineSale(id: string, organizationId: string) {
  const record = await requestResult<OfflineSaleRecord | undefined>('readonly', SALES_STORE, (store) => store.get(id))
  return record?.organizationId === organizationId ? record : undefined
}

export async function listOfflineSales(organizationId: string) {
  const records = await requestResult<OfflineSaleRecord[]>('readonly', SALES_STORE, (store) => store.getAll())
  const scoped = records.filter((record) => record.organizationId === organizationId)
  return scoped.sort((left, right) => left.createdAt.localeCompare(right.createdAt))
}

/** One-time, evidence-based upgrade for queues created before workspace scoping.
 * UUID product ownership makes the claim safe: every queued item must belong to
 * the currently loaded server catalogue before the legacy record is adopted. */
export async function adoptLegacyOfflineSales(organizationId: string, allowedProductIds: string[]) {
  const allowed = new Set(allowedProductIds)
  if (!allowed.size) return 0
  const records = await requestResult<OfflineSaleRecord[]>('readonly', SALES_STORE, (store) => store.getAll())
  const legacy = records.filter((record) => !record.organizationId && record.payload.items.length > 0 && record.payload.items.every((item) => allowed.has(item.productId)))
  for (const record of legacy) await saveOfflineSale({ ...record, organizationId })
  return legacy.length
}

export async function updateOfflineSale(id: string, organizationId: string, changes: Partial<Omit<OfflineSaleRecord, 'id' | 'organizationId' | 'payload'>>) {
  const current = await getOfflineSale(id, organizationId)
  if (!current) throw new Error('Offline sale is missing from this terminal')
  const updated: OfflineSaleRecord = { ...current, ...changes, id, updatedAt: new Date().toISOString() }
  await saveOfflineSale(updated)
  return updated
}

export async function cacheOfflineCatalogue<TProduct, TCategory, TCustomer, TSettings>(organizationId: string, snapshot: Omit<OfflineCatalogueSnapshot<TProduct, TCategory, TCustomer, TSettings>, 'id' | 'organizationId' | 'cachedAt'>) {
  await requestResult('readwrite', CACHE_STORE, (store) => store.put({ ...snapshot, id: `catalogue:${organizationId}`, organizationId, cachedAt: new Date().toISOString() }))
}

export async function readOfflineCatalogue<TProduct, TCategory, TCustomer, TSettings>(organizationId: string) {
  const snapshot = await requestResult<OfflineCatalogueSnapshot<TProduct, TCategory, TCustomer, TSettings> | undefined>('readonly', CACHE_STORE, (store) => store.get(`catalogue:${organizationId}`))
  return snapshot?.organizationId === organizationId ? snapshot : undefined
}

export type OfflineCartSnapshot = CartItem[]
