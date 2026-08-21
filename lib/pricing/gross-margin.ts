export type GrossMargin =
  | { valid: true; percent: number }
  | { valid: false; reason: 'missing-cost' | 'invalid-cost' | 'invalid-price' | 'unlikely-loss' }

/**
 * Gross margin is profit as a share of selling price. Markup divides by cost
 * and may legitimately exceed 100%, so it must never be labelled as margin.
 */
export function getGrossMargin(sellingPrice: number, costPrice: number): GrossMargin {
  if (!Number.isFinite(sellingPrice) || sellingPrice <= 0) return { valid: false, reason: 'invalid-price' }
  if (!Number.isFinite(costPrice) || costPrice <= 0) return { valid: false, reason: 'missing-cost' }
  const percent = ((sellingPrice - costPrice) / sellingPrice) * 100
  if (!Number.isFinite(percent) || percent > 100) return { valid: false, reason: 'invalid-cost' }
  if (percent < -20) return { valid: false, reason: 'unlikely-loss' }
  return { valid: true, percent }
}
