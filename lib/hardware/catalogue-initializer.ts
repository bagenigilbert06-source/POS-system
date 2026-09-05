import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { auditEvent, category, inventoryBalance, product } from '@/lib/db/schema';
import { hardwareTemplate } from '@/lib/templates/retail/hardware';
import { generateId, slugify } from '@/lib/utils';

type DatabaseTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type HardwareCatalogueInitializationResult = {
  categoriesCreated: number;
  productsCreated: number;
  balancesCreated: number;
};

/**
 * Persists the authoritative Hardware template catalogue for a newly-created
 * organization. The caller owns the surrounding workspace transaction.
 */
export async function initializeHardwareCatalogue(input: {
  tx: DatabaseTransaction;
  organizationId: string;
  branchId: string;
  userId: string;
}): Promise<HardwareCatalogueInitializationResult> {
  const { tx, organizationId, branchId, userId } = input;
  const templateCategories = hardwareTemplate.starterCategories;
  const templateProducts = hardwareTemplate.starterProducts;
  const slugs = templateCategories.map((item) => slugify(item.name));
  const skus = templateProducts.map((item) => item.sku.trim().toUpperCase());

  // This also protects explicit internal re-runs from racing one another.
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtext(${`${organizationId}:hardware-catalogue`}))`
  );

  const existingCategories = slugs.length
    ? await tx
        .select({ id: category.id, slug: category.slug })
        .from(category)
        .where(and(eq(category.orgId, organizationId), inArray(category.slug, slugs)))
    : [];
  const existingCategorySlugs = new Set(existingCategories.map((item) => item.slug));
  const categoryRows = templateCategories
    .map((item) => ({ item, slug: slugify(item.name) }))
    .filter(({ slug }) => !existingCategorySlugs.has(slug))
    .map(({ item, slug }) => ({
      id: generateId(),
      name: item.name,
      slug,
      description: item.description ?? null,
      isActive: true,
      lifecycleStatus: 'ACTIVE',
      userId,
      orgId: organizationId,
    }));

  const insertedCategories = categoryRows.length
    ? await tx.insert(category).values(categoryRows).onConflictDoNothing().returning({ id: category.id })
    : [];

  const persistedCategories = slugs.length
    ? await tx
        .select({ id: category.id, name: category.name, slug: category.slug })
        .from(category)
        .where(and(eq(category.orgId, organizationId), inArray(category.slug, slugs)))
    : [];
  const categoryIdBySlug = new Map(
    persistedCategories.map((item) => [item.slug, item.id])
  );

  const existingProducts = skus.length
    ? await tx
        .select({ id: product.id, sku: product.sku })
        .from(product)
        .where(and(eq(product.orgId, organizationId), inArray(product.sku, skus)))
    : [];
  const existingProductSkus = new Set(
    existingProducts.flatMap((item) => (item.sku ? [item.sku.toUpperCase()] : []))
  );
  const productRows = templateProducts
    .filter((item) => !existingProductSkus.has(item.sku.trim().toUpperCase()))
    .map((item) => {
      const categoryId = categoryIdBySlug.get(slugify(item.category));
      if (!categoryId) {
        throw new Error(`Hardware starter category is missing: ${item.category}`);
      }
      return {
        id: generateId(),
        name: item.name,
        sku: item.sku.trim().toUpperCase(),
        categoryId,
        buyingPrice: String(item.buyingPrice),
        sellingPrice: String(item.sellingPrice),
        stock: 0,
        minStock: hardwareTemplate.settings.inventory.lowStockThreshold,
        unit: item.unit,
        trackingMode: 'none',
        costingMethod: 'weighted_average',
        isActive: true,
        userId,
        orgId: organizationId,
      };
    });

  const insertedProducts = productRows.length
    ? await tx
        .insert(product)
        .values(productRows)
        .onConflictDoNothing()
        .returning({ id: product.id })
    : [];

  const persistedProducts = skus.length
    ? await tx
        .select({ id: product.id })
        .from(product)
        .where(and(eq(product.orgId, organizationId), inArray(product.sku, skus)))
    : [];
  const existingBalances = persistedProducts.length
    ? await tx
        .select({ productId: inventoryBalance.productId })
        .from(inventoryBalance)
        .where(
          and(
            eq(inventoryBalance.orgId, organizationId),
            eq(inventoryBalance.branchId, branchId),
            inArray(
              inventoryBalance.productId,
              persistedProducts.map((item) => item.id)
            )
          )
        )
    : [];
  const balancedProductIds = new Set(existingBalances.map((item) => item.productId));
  const balanceRows = persistedProducts
    .filter((item) => !balancedProductIds.has(item.id))
    .map((item) => ({
      id: generateId(),
      productId: item.id,
      branchId,
      onHand: '0',
      reserved: '0',
      unavailable: '0',
      incoming: '0',
      reorderPoint: String(hardwareTemplate.settings.inventory.lowStockThreshold),
      safetyStock: '0',
      orgId: organizationId,
    }));
  const insertedBalances = balanceRows.length
    ? await tx
        .insert(inventoryBalance)
        .values(balanceRows)
        .onConflictDoNothing()
        .returning({ id: inventoryBalance.id })
    : [];

  if (
    insertedCategories.length > 0 ||
    insertedProducts.length > 0 ||
    insertedBalances.length > 0
  ) {
    await tx.insert(auditEvent).values({
      id: generateId(),
      organizationId,
      userId,
      action: 'hardware_catalogue_initialized',
      metadata: {
        templateId: hardwareTemplate.id,
        templateVersion: hardwareTemplate.version,
        categoriesCreated: insertedCategories.length,
        productsCreated: insertedProducts.length,
        balancesCreated: insertedBalances.length,
      },
    });
  }

  return {
    categoriesCreated: insertedCategories.length,
    productsCreated: insertedProducts.length,
    balancesCreated: insertedBalances.length,
  };
}
