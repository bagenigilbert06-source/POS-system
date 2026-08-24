export function canAccessHeldSale(scope: { organizationId: string; branchId: string }, sale: { organizationId: string; branchId: string }) {
  return scope.organizationId === sale.organizationId && scope.branchId === sale.branchId
}

export function heldSaleExpired(expiresAt: Date, now = new Date()) {
  return expiresAt.getTime() <= now.getTime()
}

export function heldSalePriceChanged(savedUnitPrice: number, currentUnitPrice: number) {
  return !Number.isFinite(savedUnitPrice) || !Number.isFinite(currentUnitPrice) || Math.abs(savedUnitPrice - currentUnitPrice) > 0.001
}
