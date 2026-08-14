export type InventoryStatus = 'healthy' | 'low' | 'out'

export function inventoryStatus(stock: number, reorderLevel: number): InventoryStatus {
  if (stock <= 0) return 'out'
  if (stock <= reorderLevel) return 'low'
  return 'healthy'
}

export function stockVariance(systemQuantity: number, physicalQuantity: number) {
  return physicalQuantity - systemQuantity
}

/**
 * Replenish low stock to the larger of two sensible targets: twice the
 * configured safety level or the most recent month of unit demand.
 */
export function recommendedOrderQuantity(stock: number, reorderLevel: number, unitsSoldMonth = 0) {
  if (stock > reorderLevel) return 0
  const target = Math.max(reorderLevel * 2, unitsSoldMonth, 1)
  return Math.max(target - stock, 1)
}

export function estimatedStockCoverDays(stock: number, unitsSoldMonth: number) {
  if (unitsSoldMonth <= 0) return null
  return Math.max(0, stock) / (unitsSoldMonth / 30)
}

export function availableStock(onHand: number, reserved = 0, unavailable = 0) {
  return Math.max(0, onHand - reserved - unavailable)
}

export function baseQuantity(quantity: number, quantityInBaseUnit = 1) {
  if (quantity < 0 || quantityInBaseUnit <= 0) throw new Error('Inventory quantities and conversion factors must be positive')
  return quantity * quantityInBaseUnit
}

export function remainingToReceive(ordered: number, received = 0, rejected = 0) {
  return Math.max(0, ordered - received - rejected)
}

export function weightedAverageCost(currentQuantity: number, currentUnitCost: number, receivedQuantity: number, receivedUnitCost: number) {
  const quantity = currentQuantity + receivedQuantity
  if (quantity <= 0) return 0
  return ((currentQuantity * currentUnitCost) + (receivedQuantity * receivedUnitCost)) / quantity
}
