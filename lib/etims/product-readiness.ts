export type FiscalProduct = {
  etimsItemCode: string | null; etimsItemClassificationCode: string | null; etimsItemTypeCode: string | null
  etimsOriginCountryCode: string | null; etimsPackagingUnitCode: string | null; etimsQuantityUnitCode: string | null
  etimsTaxCategory: string | null; etimsRegistrationStatus: string | null
}
export type FiscalReadiness = { status: 'READY' | 'INCOMPLETE' | 'REGISTRATION_REQUIRED' | 'REGISTRATION_ERROR'; missing: string[]; message: string }

const required: Array<[keyof FiscalProduct, string]> = [
  ['etimsItemCode', 'item code'], ['etimsItemClassificationCode', 'classification'], ['etimsItemTypeCode', 'item type'],
  ['etimsOriginCountryCode', 'origin'], ['etimsPackagingUnitCode', 'packaging unit'], ['etimsQuantityUnitCode', 'quantity unit'], ['etimsTaxCategory', 'tax type'],
]
export function getProductFiscalReadiness(item: FiscalProduct): FiscalReadiness {
  const missing = required.filter(([field]) => !item[field]?.trim()).map(([, label]) => label)
  if (missing.length) return { status: 'INCOMPLETE', missing, message: `Missing ${missing.join(', ')}.` }
  if (item.etimsRegistrationStatus === 'ERROR') return { status: 'REGISTRATION_ERROR', missing: [], message: 'The last KRA item registration failed. Review and register again.' }
  if (item.etimsRegistrationStatus !== 'REGISTERED') return { status: 'REGISTRATION_REQUIRED', missing: [], message: 'Fiscal mapping is complete; KRA item registration is required.' }
  return { status: 'READY', missing: [], message: 'Ready for OSCU fiscalization.' }
}
