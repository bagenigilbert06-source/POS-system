export type PharmacyExpiryStatus = 'normal' | 'expiring_soon' | 'near_expiry' | 'expired'

const DAY_MS = 86_400_000

export function isPharmacyBusiness(businessFamily?: string | null, businessCategory?: string | null) {
  const family = businessFamily?.trim().toLowerCase() ?? ''
  const category = businessCategory?.trim().toLowerCase() ?? ''
  return family === 'pharmacy' || ['health_pharmacy', 'retail_pharmacy', 'community_pharmacy', 'hospital_pharmacy', 'wholesale_pharmacy', 'other_pharmacy'].includes(category)
}

export function filterPharmacyCatalog<T extends { id: string }>(products: T[], medicineProductIds: Iterable<string>, pharmacyWorkspace: boolean) {
  if (!pharmacyWorkspace) return products
  const medicines = new Set(medicineProductIds)
  return products.filter((item) => medicines.has(item.id))
}

export function normalizeExpiryWarningDays(days: number[]) {
  const valid = [...new Set(days.filter((day) => Number.isInteger(day) && day > 0 && day <= 730))]
  return (valid.length ? valid : [90, 60, 30, 7]).sort((left, right) => right - left)
}

export function pharmacyExpiryState(expiresAt: Date, now = new Date(), warningDays = [90, 60, 30, 7]) {
  const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / DAY_MS)
  const thresholds = normalizeExpiryWarningDays(warningDays)
  const nearExpiryDays = Math.min(...thresholds)
  const warningWindow = Math.max(...thresholds)
  const status: PharmacyExpiryStatus = expiresAt.getTime() <= now.getTime()
    ? 'expired'
    : daysRemaining <= nearExpiryDays
      ? 'near_expiry'
      : daysRemaining <= warningWindow
        ? 'expiring_soon'
        : 'normal'
  return { status, daysRemaining }
}

export type FefoLot = {
  id: string
  quantity: number
  expiresAt: Date | null
  status: string
}

/** Deterministic FEFO plan used for previews and tests. Database checkout uses
 * the same ordering while locking rows transactionally. */
export function planFefoAllocation(lots: FefoLot[], requestedQuantity: number, now = new Date()) {
  if (!Number.isFinite(requestedQuantity) || requestedQuantity <= 0) throw new Error('Requested quantity must be greater than zero')
  const eligible = lots
    .filter((lot) => lot.status === 'available' && lot.quantity > 0 && Boolean(lot.expiresAt && lot.expiresAt > now))
    .sort((left, right) => {
      const leftExpiry = left.expiresAt!.getTime()
      const rightExpiry = right.expiresAt!.getTime()
      return leftExpiry - rightExpiry || left.id.localeCompare(right.id)
    })
  let remaining = requestedQuantity
  const allocations: Array<{ lotId: string; quantity: number }> = []
  for (const lot of eligible) {
    const quantity = Math.min(remaining, lot.quantity)
    if (quantity > 0) allocations.push({ lotId: lot.id, quantity })
    remaining -= quantity
    if (remaining <= 0) break
  }
  if (remaining > 0) throw new Error('Insufficient unexpired batch stock')
  return allocations
}

export function planReturnedLotTrace(
  allocations: Array<{ id: string; quantity: number; alreadyReturned: number }>,
  returnedQuantity: number,
) {
  if (!Number.isSafeInteger(returnedQuantity) || returnedQuantity <= 0) throw new Error('Returned quantity must be a positive whole number')
  let remaining = returnedQuantity
  const traced: Array<{ allocationId: string; quantity: number }> = []
  for (const allocation of allocations) {
    const available = Math.max(0, allocation.quantity - allocation.alreadyReturned)
    const quantity = Math.min(remaining, available)
    if (quantity > 0) traced.push({ allocationId: allocation.id, quantity })
    remaining -= quantity
    if (!remaining) break
  }
  return { traced, untracedQuantity: remaining }
}
