export type AgeVerificationStatus = 'VERIFIED' | 'CANCELLED' | 'OVERRIDDEN'

export function maskAgeIdReference(value?: string) {
  const normalized = value?.replace(/\s+/g, '').trim()
  if (!normalized) return null
  return `${'*'.repeat(Math.max(4, normalized.length - 4))}${normalized.slice(-4)}`
}

export function effectiveAgeRestriction(productFlag: boolean | null | undefined, categoryFlag: boolean | null | undefined, legacyLiquorDefault: boolean) {
  return productFlag ?? categoryFlag ?? legacyLiquorDefault
}

export function authorizesRestrictedCheckout(status: AgeVerificationStatus) {
  return status === 'VERIFIED' || status === 'OVERRIDDEN'
}
