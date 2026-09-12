import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { mpesaMerchantConfiguration } from '@/lib/db/schema'

export type BranchMpesaMerchant = {
  id: string; organizationId: string; branchId: string; businessName: string
  headOfficeNumber: string | null; storeNumber: string | null; tillNumber: string | null
  businessShortCode: string | null; environment: string; stkEnabled: boolean; manualTillEnabled: boolean
}

export async function getBranchMpesaMerchant(organizationId: string, branchId: string): Promise<BranchMpesaMerchant | null> {
  const [merchant] = await db.select().from(mpesaMerchantConfiguration).where(and(
    eq(mpesaMerchantConfiguration.organizationId, organizationId),
    eq(mpesaMerchantConfiguration.branchId, branchId),
  )).limit(1)
  if ((process.env.MPESA_ENV || 'sandbox').trim().toLowerCase() !== 'sandbox')
    return merchant ?? null

  // Daraja's sandbox merchant belongs to the developer application, not to a
  // real branch. Let the explicit sandbox environment configure that test
  // merchant while retaining the branch row for receipt/display metadata.
  const tillNumber = process.env.MPESA_TILL_NUMBER?.trim() || merchant?.tillNumber || null
  const businessShortCode = (process.env.MPESA_BUSINESS_SHORTCODE || process.env.MPESA_SHORTCODE)?.trim() || merchant?.businessShortCode || null
  return {
    id: merchant?.id ?? `sandbox-${branchId}`,
    organizationId,
    branchId,
    businessName: process.env.MPESA_BUSINESS_NAME?.trim() || merchant?.businessName || 'M-Pesa Sandbox',
    headOfficeNumber: process.env.MPESA_HEAD_OFFICE_NUMBER?.trim() || merchant?.headOfficeNumber || null,
    storeNumber: process.env.MPESA_STORE_NUMBER?.trim() || merchant?.storeNumber || null,
    tillNumber,
    businessShortCode,
    environment: 'sandbox',
    stkEnabled: Boolean(businessShortCode),
    manualTillEnabled: Boolean(tillNumber),
  }
}

export function assertManualTillEnabled(merchant: BranchMpesaMerchant | null): BranchMpesaMerchant & { tillNumber: string } {
  if (!merchant?.manualTillEnabled || !merchant.tillNumber)
    throw new Error('Manual Buy Goods Till is not configured for this branch')
  return { ...merchant, tillNumber: merchant.tillNumber }
}

export function assertStkEnabled(merchant: BranchMpesaMerchant | null): BranchMpesaMerchant {
  if (!merchant?.stkEnabled)
    throw new Error('STK Push is not configured for this branch')
  return merchant
}
