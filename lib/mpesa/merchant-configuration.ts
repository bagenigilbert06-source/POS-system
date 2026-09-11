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
  return merchant ?? null
}

export function assertManualTillEnabled(merchant: BranchMpesaMerchant | null): BranchMpesaMerchant & { tillNumber: string } {
  if (!merchant?.manualTillEnabled || !merchant.tillNumber)
    throw new Error('Manual Buy Goods Till is not configured for this branch')
  return { ...merchant, tillNumber: merchant.tillNumber }
}

export function assertStkEnabled(merchant: BranchMpesaMerchant | null): BranchMpesaMerchant & { businessShortCode: string } {
  if (!merchant?.stkEnabled || !merchant.businessShortCode)
    throw new Error('STK Push is not configured for this branch')
  return { ...merchant, businessShortCode: merchant.businessShortCode }
}
