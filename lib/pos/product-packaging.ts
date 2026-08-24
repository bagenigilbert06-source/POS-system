export function baseUnitsForSale(saleQuantity: number, baseUnitQuantity = 1) {
  if (!Number.isInteger(saleQuantity) || saleQuantity < 0) throw new Error('Sale quantity must be a non-negative whole number')
  if (!Number.isInteger(baseUnitQuantity) || baseUnitQuantity < 1) throw new Error('Package conversion must be a positive whole number')
  return saleQuantity * baseUnitQuantity
}

export function availablePackageQuantity(baseUnitsInStock: number, baseUnitQuantity = 1) {
  if (!Number.isFinite(baseUnitsInStock) || baseUnitsInStock < 0) return 0
  if (!Number.isInteger(baseUnitQuantity) || baseUnitQuantity < 1) return 0
  return Math.floor(baseUnitsInStock / baseUnitQuantity)
}
