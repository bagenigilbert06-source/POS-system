'use server'

import { and, eq, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db'
import { businessSettings, product, productPackage } from '@/lib/db/schema'
import { getPosAuthorizationContext } from '@/lib/pos/pos-auth'
import { requireAnyPermission } from '@/lib/auth/authorization'
import { PermissionEnum } from '@/lib/types/permissions'
import { getRewardCheckoutQuote, getRewardSummary } from '@/lib/services/rewards-service'
import { preTaxRewardAmount } from '@/lib/rewards/rules'

const lineSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
  packageId: z.string().min(1).optional(),
})

const quoteSchema = z.object({
  customerId: z.string().min(1),
  lines: z.array(lineSchema).min(1).max(250),
  discountAmount: z.number().finite().min(0),
})

async function rewardAuthorization() {
  const pos = await getPosAuthorizationContext()
  const authorization = pos ?? await requireAnyPermission([PermissionEnum.POS_SELL, PermissionEnum.SALE_CREATE])
  if (!authorization.permissions.includes(PermissionEnum.POS_SELL) && !authorization.permissions.includes(PermissionEnum.SALE_CREATE)) throw new Error('POS sale permission denied')
  const branchId = pos?.branchId ?? authorization.branchIds[0]
  if (!branchId) throw new Error('No authorized POS branch is available')
  return { authorization, branchId }
}

export async function quoteCheckoutRewards(input: z.input<typeof quoteSchema>) {
  const data = quoteSchema.parse(input)
  const { authorization, branchId } = await rewardAuthorization()
  const [settings] = await db.select({ taxEnabled: businessSettings.taxEnabled, taxRate: businessSettings.taxRate, pricesIncludeTax: businessSettings.pricesIncludeTax })
    .from(businessSettings).where(eq(businessSettings.organizationId, authorization.organizationId)).limit(1)
  const rewardTax = { enabled: settings?.taxEnabled ?? false, ratePercent: Number(settings?.taxRate ?? 0), pricesIncludeTax: settings?.pricesIncludeTax ?? false }
  const productIds = Array.from(new Set(data.lines.map((line) => line.productId)))
  const products = await db.select({ id: product.id, price: product.sellingPrice, categoryId: product.categoryId, active: product.isActive })
    .from(product).where(and(eq(product.orgId, authorization.organizationId), inArray(product.id, productIds)))
  const byId = new Map(products.map((item) => [item.id, item]))
  const packageIds = data.lines.map((line) => line.packageId).filter((id): id is string => Boolean(id))
  const packages = packageIds.length ? await db.select().from(productPackage).where(and(eq(productPackage.organizationId, authorization.organizationId), inArray(productPackage.id, packageIds), eq(productPackage.isActive, true))) : []
  const packageById = new Map(packages.map((item) => [item.id, item]))
  const lines = data.lines.map((line) => {
    const item = byId.get(line.productId)
    const selectedPackage = line.packageId ? packageById.get(line.packageId) : null
    if (!item?.active || (line.packageId && (!selectedPackage || selectedPackage.productId !== line.productId))) throw new Error('A basket item is unavailable')
    return { productId: line.productId, categoryId: item.categoryId, amount: preTaxRewardAmount(Number(selectedPackage?.sellingPrice ?? item.price) * line.quantity, rewardTax), discounted: data.discountAmount > 0 }
  })
  return getRewardCheckoutQuote({ organizationId: authorization.organizationId, customerId: data.customerId, branchId, lines, ordinaryDiscount: preTaxRewardAmount(data.discountAmount, rewardTax) })
}

export async function refreshCustomerRewards(customerId: string) {
  const { authorization } = await rewardAuthorization()
  return getRewardSummary(authorization.organizationId, z.string().min(1).parse(customerId))
}
