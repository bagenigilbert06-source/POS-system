'use server';

import { revalidatePath } from 'next/cache';
import { and, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth/authorization';
import { invalidateProductReadCache } from '@/lib/cache/redis-cache';
import { db } from '@/lib/db';
import { auditEvent, category, product, productPackage } from '@/lib/db/schema';
import { PermissionEnum } from '@/lib/types/permissions';
import { generateId } from '@/lib/utils';

const rowSchema = z.object({ id: z.string().min(1), kind: z.enum(['product', 'package']), retailPrice: z.number().nonnegative(), wholesalePrice: z.number().nonnegative().nullable() });

export async function getPriceBook() {
  const auth = await requirePermission(PermissionEnum.CATALOG_VIEW);
  const products = await db.select({ id: product.id, name: product.name, sku: product.sku, barcode: product.barcode, costPrice: product.buyingPrice, retailPrice: product.sellingPrice, wholesalePrice: product.wholesalePrice, categoryId: product.categoryId, categoryName: category.name })
    .from(product).leftJoin(category, and(eq(category.id, product.categoryId), eq(category.orgId, auth.organizationId)))
    .where(and(eq(product.orgId, auth.organizationId), eq(product.isActive, true)));
  const productIds = products.map((row) => row.id);
  const packages = productIds.length ? await db.select({ id: productPackage.id, productId: productPackage.productId, name: productPackage.name, barcode: productPackage.barcode, retailPrice: productPackage.sellingPrice, wholesalePrice: productPackage.wholesalePrice })
    .from(productPackage).where(and(eq(productPackage.organizationId, auth.organizationId), eq(productPackage.isActive, true), inArray(productPackage.productId, productIds))) : [];
  const byId = new Map(products.map((row) => [row.id, row]));
  return [
    ...products.map((row) => ({ ...row, kind: 'product' as const, unitLabel: 'Base product' })),
    ...packages.map((row) => { const parent = byId.get(row.productId)!; return { id: row.id, kind: 'package' as const, name: parent.name, unitLabel: row.name, sku: parent.sku, barcode: row.barcode, costPrice: parent.costPrice, retailPrice: row.retailPrice, wholesalePrice: row.wholesalePrice, categoryId: parent.categoryId, categoryName: parent.categoryName }; }),
  ];
}

export async function updatePriceBook(input: unknown) {
  const auth = await requirePermission(PermissionEnum.CATALOG_EDIT);
  const rows = z.array(rowSchema).max(1000).parse(input);
  if (!rows.length) return { updated: 0 };
  const productRows = rows.filter((row) => row.kind === 'product');
  const packageRows = rows.filter((row) => row.kind === 'package');
  const [existingProducts, existingPackages] = await Promise.all([
    productRows.length ? db.select({ id: product.id, retailPrice: product.sellingPrice, wholesalePrice: product.wholesalePrice }).from(product).where(and(eq(product.orgId, auth.organizationId), inArray(product.id, productRows.map((row) => row.id)))) : [],
    packageRows.length ? db.select({ id: productPackage.id, productId: productPackage.productId, retailPrice: productPackage.sellingPrice, wholesalePrice: productPackage.wholesalePrice }).from(productPackage).where(and(eq(productPackage.organizationId, auth.organizationId), inArray(productPackage.id, packageRows.map((row) => row.id)))) : [],
  ]);
  if (existingProducts.length !== new Set(productRows.map((row) => row.id)).size || existingPackages.length !== new Set(packageRows.map((row) => row.id)).size) throw new Error('One or more products or packages are unavailable in this workspace');
  const before = new Map([...existingProducts, ...existingPackages].map((row) => [row.id, row]));
  const changed = rows.filter((row) => { const old = before.get(row.id); return Number(old?.retailPrice) !== row.retailPrice || (old?.wholesalePrice === null ? null : Number(old?.wholesalePrice)) !== row.wholesalePrice; });
  await db.transaction(async (tx) => {
    for (const row of changed) {
      const values = { sellingPrice: row.retailPrice.toFixed(2), wholesalePrice: row.wholesalePrice === null ? null : row.wholesalePrice.toFixed(2), updatedAt: new Date() };
      if (row.kind === 'product') await tx.update(product).set(values).where(and(eq(product.id, row.id), eq(product.orgId, auth.organizationId)));
      else await tx.update(productPackage).set(values).where(and(eq(productPackage.id, row.id), eq(productPackage.organizationId, auth.organizationId)));
    }
    if (changed.length) await tx.insert(auditEvent).values({ id: generateId(), organizationId: auth.organizationId, userId: auth.userId, action: 'price_book.updated', metadata: { source: 'PRICE_BOOK', changes: changed.map((row) => ({ kind: row.kind, productId: row.kind === 'product' ? row.id : existingPackages.find((item) => item.id === row.id)?.productId, packageId: row.kind === 'package' ? row.id : null, oldRetail: before.get(row.id)?.retailPrice, newRetail: row.retailPrice, oldWholesale: before.get(row.id)?.wholesalePrice, newWholesale: row.wholesalePrice })) } });
  });
  if (changed.length) await invalidateProductReadCache(auth.organizationId);
  revalidatePath('/dashboard/products'); revalidatePath('/dashboard/products/price-book'); revalidatePath('/dashboard/pos');
  return { updated: changed.length };
}
