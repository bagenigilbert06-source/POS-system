import { and, asc, eq, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { branch, businessSettings, product } from '@/lib/db/schema'
import type { AuthorizationContext } from '@/lib/auth/authorization'

export async function getBarcodePageData(authorization: AuthorizationContext) {
  const branchScope = authorization.isOrganizationWide
    ? eq(branch.organizationId, authorization.organizationId)
    : and(
        eq(branch.organizationId, authorization.organizationId),
        authorization.branchIds.length
          ? inArray(branch.id, authorization.branchIds)
          : eq(branch.id, '')
      )

  const [locations, products, settings] = await Promise.all([
    db
      .select({ id: branch.id, code: branch.code, name: branch.name, isMain: branch.isMain })
      .from(branch)
      .where(branchScope)
      .orderBy(asc(branch.name)),
    db
      .select({
        id: product.id,
        name: product.name,
        sku: product.sku,
        barcode: product.barcode,
        price: product.sellingPrice,
        imageUrl: product.imageUrl,
      })
      .from(product)
      .where(and(eq(product.orgId, authorization.organizationId), eq(product.isActive, true)))
      .orderBy(asc(product.name)),
    db
      .select({ displayName: businessSettings.displayName })
      .from(businessSettings)
      .where(eq(businessSettings.organizationId, authorization.organizationId))
      .limit(1),
  ])

  return {
    locations,
    products: products.map((item) => ({ ...item, price: Number(item.price) })),
    storeName: settings[0]?.displayName || 'Pesaby',
    currency: 'KES',
  }
}
