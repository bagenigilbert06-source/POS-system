'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  branch,
  category,
  organizationMembership,
  product,
  sale,
  saleItem,
  stockMovement,
} from '@/lib/db/schema';
import { and, desc, eq, gte, ilike, inArray, or, sql } from 'drizzle-orm';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { generateId, normalizeBarcode, slugify } from '@/lib/utils';
import { OrganizationService } from '@/lib/services/organization-service';
import { WorkspaceService } from '@/lib/services/workspace-service';
import { getPosAuthorizationContext } from '@/lib/pos/pos-auth';
import {
  invalidateCategoryCache,
  invalidateProductCache,
  invalidateProductReadCache,
  readThroughRedis,
} from '@/lib/cache/redis-cache';
import {
  addCostLayer,
  applyInventoryMovement,
} from '@/lib/inventory/inventory-service';
import { requirePermission } from '@/lib/auth/authorization';
import { PermissionEnum } from '@/lib/types/permissions';

async function getUserId() {
  const pos = await getPosAuthorizationContext();
  if (pos) return pos.userId;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) throw new Error('Unauthorized');
  return session.user.id;
}

async function getOrgId(userId: string) {
  const pos = await getPosAuthorizationContext();
  const organization = pos
    ? await OrganizationService.getOrganization(pos.organizationId, userId)
    : await OrganizationService.getPrimaryOrganization(userId);
  if (!organization) throw new Error('No organization available');
  const config = await WorkspaceService.getWorkspaceConfig(
    organization.id,
    userId
  );
  if (!config?.enabledModules.includes('products'))
    throw new Error('Products are not enabled for this workspace');
  return organization.id;
}

async function requireProductManager(userId: string, orgId: string) {
  const [membership] = await db
    .select({ role: organizationMembership.role })
    .from(organizationMembership)
    .where(
      and(
        eq(organizationMembership.organizationId, orgId),
        eq(organizationMembership.userId, userId)
      )
    )
    .limit(1);
  if (!membership || !['owner', 'admin', 'manager'].includes(membership.role))
    throw new Error('You do not have permission to manage products');
}

export async function getProducts(search?: string, includeInactive = false) {
  const userId = await getUserId();
  const orgId = await getOrgId(userId);
  return getProductsForOrg(orgId, search, includeInactive);
}

async function getProductsForOrg(
  orgId: string,
  search?: string,
  includeInactive = false
) {
  const normalizedSearch = search?.trim().toLowerCase().slice(0, 80) ?? '';
  return readThroughRedis({
    namespace: 'products',
    organizationId: orgId,
    variant: `list:${includeInactive ? 'all' : 'active'}:${normalizedSearch}`,
    ttlSeconds: 120,
    load: async () => {
      const conditions = [eq(product.orgId, orgId)];
      if (!includeInactive) conditions.push(eq(product.isActive, true));
      if (normalizedSearch) {
        conditions.push(
          or(
            ilike(product.name, `%${normalizedSearch}%`),
            ilike(product.sku, `%${normalizedSearch}%`),
            ilike(product.barcode, `%${normalizedSearch}%`)
          )!
        );
      }
      return db
        .select()
        .from(product)
        .where(and(...conditions))
        .orderBy(desc(product.createdAt));
    },
  });
}

export async function getProductMonthlySales() {
  const userId = await getUserId();
  const orgId = await getOrgId(userId);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  return db
    .select({
      productId: saleItem.productId,
      unitsSoldMonth: sql<number>`coalesce(sum(${saleItem.quantity}), 0)`,
    })
    .from(saleItem)
    .innerJoin(sale, eq(sale.id, saleItem.saleId))
    .where(
      and(
        eq(saleItem.orgId, orgId),
        eq(sale.orgId, orgId),
        eq(sale.status, 'completed'),
        gte(sale.createdAt, monthStart)
      )
    )
    .groupBy(saleItem.productId);
}

export async function getProductsPageData() {
  const userId = await getUserId();
  const orgId = await getOrgId(userId);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const [products, monthlySales, categories] = await Promise.all([
    getProductsForOrg(orgId, undefined, true),
    db
      .select({
        productId: saleItem.productId,
        unitsSoldMonth: sql<number>`coalesce(sum(${saleItem.quantity}), 0)`,
      })
      .from(saleItem)
      .innerJoin(sale, eq(sale.id, saleItem.saleId))
      .where(
        and(
          eq(saleItem.orgId, orgId),
          eq(sale.orgId, orgId),
          eq(sale.status, 'completed'),
          gte(sale.createdAt, monthStart)
        )
      )
      .groupBy(saleItem.productId),
    db
      .select({ id: category.id, name: category.name })
      .from(category)
      .where(eq(category.orgId, orgId)),
  ]);
  const unitsSoldByProduct = new Map(
    monthlySales.map((item) => [item.productId, Number(item.unitsSoldMonth)])
  );
  const categoryNameById = new Map(
    categories.map((item) => [item.id, item.name])
  );
  return products.map((item) => ({
    ...item,
    unitsSoldMonth: unitsSoldByProduct.get(item.id) ?? 0,
    categoryName: item.categoryId
      ? (categoryNameById.get(item.categoryId) ?? null)
      : null,
  }));
}

export async function updateProductPricesByPercent(
  productIds: string[],
  percent: number
) {
  const userId = await getUserId();
  const orgId = await getOrgId(userId);
  await requireProductManager(userId, orgId);
  if (!Array.isArray(productIds) || productIds.length === 0)
    throw new Error('Select at least one product');
  if (!Number.isFinite(percent) || percent < -100 || percent > 1_000)
    throw new Error('Enter a price adjustment between -100% and 1000%');
  const ids = [...new Set(productIds)].slice(0, 250);
  const selected = await db
    .select({
      id: product.id,
      sellingPrice: product.sellingPrice,
      buyingPrice: product.buyingPrice,
    })
    .from(product)
    .where(and(eq(product.orgId, orgId), inArray(product.id, ids)));
  if (
    selected.some(
      (item) =>
        Number(item.sellingPrice) * (1 + percent / 100) <
        Number(item.buyingPrice)
    )
  )
    throw new Error(
      'This adjustment would price at least one selected product below cost'
    );
  await db.transaction(async (tx) => {
    for (const item of selected) {
      const next = Math.max(0, Number(item.sellingPrice) * (1 + percent / 100));
      await tx
        .update(product)
        .set({ sellingPrice: next.toFixed(2), updatedAt: new Date() })
        .where(and(eq(product.id, item.id), eq(product.orgId, orgId)));
    }
  });
  await invalidateProductCache(orgId);
  revalidatePath('/dashboard/products');
  return { updated: selected.length };
}

export async function restockProducts(
  productIds: string[],
  quantity: number,
  unitCost: number
) {
  const authorization = await requirePermission(
    PermissionEnum.INVENTORY_ADJUST
  );
  const { userId, organizationId: orgId } = authorization;
  if (!Array.isArray(productIds) || productIds.length === 0)
    throw new Error('Select at least one product');
  if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 10_000_000)
    throw new Error('Restock quantity must be a positive whole number');
  if (!Number.isFinite(unitCost) || unitCost <= 0)
    throw new Error('Unit cost must be greater than zero');
  const ids = [...new Set(productIds)].slice(0, 250);
  const locations = await db
    .select({ id: branch.id })
    .from(branch)
    .where(
      and(
        eq(branch.organizationId, orgId),
        authorization.isOrganizationWide
          ? undefined
          : inArray(
              branch.id,
              authorization.branchIds.length ? authorization.branchIds : ['']
            )
      )
    )
    .orderBy(desc(branch.isMain), branch.createdAt)
    .limit(1);
  const location = locations[0];
  if (!location)
    throw new Error('No inventory location is available for your account');
  const selected = await db
    .select({ id: product.id, name: product.name })
    .from(product)
    .where(
      and(
        eq(product.orgId, orgId),
        inArray(product.id, ids),
        eq(product.isActive, true)
      )
    );
  await db.transaction(async (tx) => {
    for (const item of selected) {
      const referenceId = generateId();
      await applyInventoryMovement(tx, {
        productId: item.id,
        productName: item.name,
        branchId: location.id,
        quantity,
        type: 'restock',
        referenceType: 'bulk_restock',
        referenceId,
        reason: 'Bulk restock from Products',
        userId,
        orgId,
        unitCost,
      });
      await addCostLayer(tx, {
        productId: item.id,
        branchId: location.id,
        sourceType: 'restock',
        sourceId: referenceId,
        quantity,
        unitCost,
        orgId,
      });
      await tx
        .update(product)
        .set({ buyingPrice: String(unitCost), updatedAt: new Date() })
        .where(and(eq(product.id, item.id), eq(product.orgId, orgId)));
    }
  });
  await invalidateProductCache(orgId);
  revalidatePath('/dashboard/products');
  revalidatePath('/dashboard/inventory');
  return { updated: selected.length };
}

export async function getProductsForCategory(categoryId: string) {
  const userId = await getUserId();
  const orgId = await getOrgId(userId);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const [products, monthlySales] = await Promise.all([
    readThroughRedis({
      namespace: 'products',
      organizationId: orgId,
      variant: `category:${categoryId}`,
      ttlSeconds: 120,
      load: () =>
        db
          .select()
          .from(product)
          .where(
            and(eq(product.orgId, orgId), eq(product.categoryId, categoryId))
          )
          .orderBy(desc(product.createdAt)),
    }),
    db
      .select({
        productId: saleItem.productId,
        unitsSoldMonth: sql<number>`coalesce(sum(${saleItem.quantity}), 0)`,
      })
      .from(saleItem)
      .innerJoin(sale, eq(sale.id, saleItem.saleId))
      .where(
        and(
          eq(saleItem.orgId, orgId),
          eq(sale.orgId, orgId),
          eq(sale.status, 'completed'),
          gte(sale.createdAt, monthStart)
        )
      )
      .groupBy(saleItem.productId),
  ]);
  const unitsSoldByProduct = new Map(
    monthlySales.map((item) => [item.productId, Number(item.unitsSoldMonth)])
  );
  return products.map((item) => ({
    ...item,
    unitsSoldMonth: unitsSoldByProduct.get(item.id) ?? 0,
  }));
}

export async function getProductById(id: string) {
  const userId = await getUserId();
  const orgId = await getOrgId(userId);
  const [item] = await db
    .select()
    .from(product)
    .where(and(eq(product.id, id), eq(product.orgId, orgId)))
    .limit(1);
  return item ?? null;
}

export async function findProductByBarcode(
  barcode: string,
  excludeId?: string
) {
  const userId = await getUserId();
  const orgId = await getOrgId(userId);
  const normalized = normalizeBarcode(barcode);
  if (!normalized) return null;
  const conditions = [
    eq(product.orgId, orgId),
    eq(product.barcode, normalized),
    eq(product.isActive, true),
  ];
  if (excludeId) conditions.push(sql`${product.id} <> ${excludeId}`);
  const [match] = await db
    .select({ id: product.id, name: product.name })
    .from(product)
    .where(and(...conditions))
    .limit(1);
  return match ?? null;
}

export async function generateProductSku(input: {
  brand?: string;
  name: string;
  volume?: string | number;
  volumeUnit?: string;
  unit?: string;
  unitsPerPack?: string | number;
  excludeId?: string;
}) {
  const userId = await getUserId();
  const orgId = await getOrgId(userId);
  const words = (value: string) =>
    slugify(value)
      .split('-')
      .filter(Boolean)
      .map((part) => part.slice(0, 8).toUpperCase());
  const brand = words(input.brand || input.name)
    .slice(0, 3)
    .join('');
  const namePart = words(input.name).slice(0, 2).join('-') || 'PRODUCT';
  const numericVolume = input.volume
    ? Number(input.volume) * (input.volumeUnit === 'litre' ? 1000 : 1)
    : 0;
  const volume = numericVolume > 0 ? String(Math.round(numericVolume)) : 'UNIT';
  const unitMap: Record<string, string> = {
    bottle: 'BTL',
    can: 'CAN',
    carton: 'CTN',
    crate: 'CRT',
    pack: 'PK',
    keg: 'KEG',
    piece: 'PCS',
    other: 'UNIT',
  };
  const unit =
    unitMap[input.unit || ''] ||
    String(input.unit || 'UNIT')
      .slice(0, 4)
      .toUpperCase();
  const pack =
    input.unitsPerPack && Number(input.unitsPerPack) > 1
      ? `${unit}${Number(input.unitsPerPack)}`
      : unit;
  const base = `${brand}-${namePart}-${volume}-${pack}`.slice(0, 60);
  for (let suffix = 0; suffix < 1000; suffix++) {
    const candidate = suffix === 0 ? base : `${base}-${suffix + 1}`;
    const conditions = [eq(product.orgId, orgId), eq(product.sku, candidate)];
    if (input.excludeId)
      conditions.push(sql`${product.id} <> ${input.excludeId}`);
    const [existing] = await db
      .select({ id: product.id })
      .from(product)
      .where(and(...conditions))
      .limit(1);
    if (!existing) return candidate;
  }
  throw new Error('Could not generate a unique product code');
}

export async function getProductOverview(id: string) {
  const userId = await getUserId();
  const orgId = await getOrgId(userId);
  const [item] = await db
    .select()
    .from(product)
    .where(and(eq(product.id, id), eq(product.orgId, orgId)))
    .limit(1);
  if (!item) return null;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const completedSales = and(
    eq(saleItem.productId, item.id),
    eq(saleItem.orgId, orgId),
    eq(sale.orgId, orgId),
    eq(sale.status, 'completed')
  );
  const [[categoryRecord], [todayMetrics], [monthMetrics], movements] =
    await Promise.all([
      item.categoryId
        ? db
            .select({ name: category.name })
            .from(category)
            .where(
              and(eq(category.id, item.categoryId), eq(category.orgId, orgId))
            )
            .limit(1)
        : Promise.resolve([]),
      db
        .select({
          units: sql<number>`coalesce(sum(${saleItem.quantity}), 0)`,
          revenue: sql<string>`coalesce(sum(${saleItem.totalPrice}), 0)`,
        })
        .from(saleItem)
        .innerJoin(sale, eq(sale.id, saleItem.saleId))
        .where(and(completedSales, gte(sale.createdAt, today))),
      db
        .select({
          units: sql<number>`coalesce(sum(${saleItem.quantity}), 0)`,
          revenue: sql<string>`coalesce(sum(${saleItem.totalPrice}), 0)`,
          cost: sql<string>`coalesce(sum(${saleItem.totalCost}), 0)`,
        })
        .from(saleItem)
        .innerJoin(sale, eq(sale.id, saleItem.saleId))
        .where(and(completedSales, gte(sale.createdAt, monthStart))),
      db
        .select()
        .from(stockMovement)
        .where(
          and(
            eq(stockMovement.productId, item.id),
            eq(stockMovement.orgId, orgId)
          )
        )
        .orderBy(desc(stockMovement.createdAt))
        .limit(20),
    ]);
  const monthlyUnits = Number(monthMetrics?.units ?? 0);
  const monthlyRevenue = Number(monthMetrics?.revenue ?? 0);
  const unitCost = Number(item.buyingPrice);
  const grossProfit = monthlyRevenue - Number(monthMetrics?.cost ?? 0);
  const daysElapsed = Math.max(
    1,
    Math.ceil((now.getTime() - monthStart.getTime()) / 86_400_000) + 1
  );
  const averageDailySales = monthlyUnits / daysElapsed;

  return {
    product: item,
    categoryName: categoryRecord?.name ?? null,
    metrics: {
      unitsSoldToday: Number(todayMetrics?.units ?? 0),
      unitsSoldMonth: monthlyUnits,
      revenueMonth: monthlyRevenue,
      grossProfitMonth: grossProfit,
      averageDailySales,
      stockValue: item.stock * unitCost,
      estimatedStockDays:
        averageDailySales > 0 ? item.stock / averageDailySales : null,
    },
    movements,
  };
}

/** Categories for POS filters. Kept separate from products so the register can
 * render human-readable category buttons without exposing raw IDs. */
export async function getProductCategories() {
  const userId = await getUserId();
  const orgId = await getOrgId(userId);
  return readThroughRedis({
    namespace: 'categories',
    organizationId: orgId,
    variant: 'pos-filter-list',
    ttlSeconds: 600,
    load: () =>
      db
        .select({
          id: category.id,
          name: category.name,
          parentCategoryId: category.parentCategoryId,
          isActive: category.isActive,
        })
        .from(category)
        .where(eq(category.orgId, orgId))
        .orderBy(category.name),
  });
}

export async function getLowStockProducts() {
  const userId = await getUserId();
  const orgId = await getOrgId(userId);
  return db
    .select()
    .from(product)
    .where(
      and(
        eq(product.orgId, orgId),
        eq(product.isActive, true),
        sql`${product.stock} <= ${product.minStock}`
      )
    )
    .orderBy(product.stock)
    .limit(10);
}

export async function createCategory(name: string) {
  const trimmedName = name.trim();
  if (trimmedName.length < 2 || trimmedName.length > 80)
    throw new Error('Category name must be between 2 and 80 characters');
  const userId = await getUserId();
  const orgId = await getOrgId(userId);
  const [existing] = await db
    .select({ id: category.id })
    .from(category)
    .where(and(eq(category.orgId, orgId), eq(category.name, trimmedName)))
    .limit(1);
  if (existing) return existing;
  const id = generateId();
  await db.insert(category).values({
    id,
    name: trimmedName,
    slug: `${trimmedName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')}-${id.slice(0, 8)}`,
    userId,
    orgId,
    updatedAt: new Date(),
  });
  await invalidateCategoryCache(orgId);
  revalidatePath('/dashboard/products');
  return { id };
}

export async function createProduct(data: {
  name: string;
  brand?: string;
  variant?: string;
  sku?: string;
  barcode?: string;
  description?: string;
  imageUrl?: string;
  categoryId?: string;
  buyingPrice: number;
  sellingPrice: number;
  stock: number;
  minStock: number;
  unit: string;
  volume?: number;
  volumeUnit?: string;
  abv?: number;
  countryOfOrigin?: string;
  unitsPerPack?: number;
  preferredSupplierId?: string;
  trackingMode?: 'none' | 'lot' | 'serial';
  costingMethod?: 'weighted_average' | 'fifo' | 'standard';
  shelfLifeDays?: number;
  expiryAlertDays?: number;
  confirmLoss?: boolean;
}) {
  const userId = await getUserId();
  const orgId = await getOrgId(userId);
  await requireProductManager(userId, orgId);
  const id = generateId();
  if (!data.name.trim()) throw new Error('Product name is required');
  if (!data.categoryId) throw new Error('Choose a category for this product');
  if (!Number.isFinite(data.buyingPrice) || data.buyingPrice <= 0)
    throw new Error('Cost price must be greater than zero');
  if (!Number.isFinite(data.sellingPrice) || data.sellingPrice < 0)
    throw new Error('Enter a valid selling price');
  if (!Number.isInteger(data.stock) || data.stock < 0)
    throw new Error('Opening stock must be a whole number of zero or more');
  if (!Number.isInteger(data.minStock) || data.minStock < 0)
    throw new Error('Reorder level must be a whole number of zero or more');
  if (
    data.volume !== undefined &&
    (!Number.isFinite(data.volume) || data.volume <= 0)
  )
    throw new Error('Bottle or package size must be greater than zero');
  if (
    data.unitsPerPack !== undefined &&
    (!Number.isInteger(data.unitsPerPack) || data.unitsPerPack <= 0)
  )
    throw new Error('Units per pack must be a positive whole number');
  if (data.sellingPrice < data.buyingPrice && data.confirmLoss !== true)
    throw new Error(
      'Confirm that this product will be sold at a loss before saving'
    );
  const [selectedCategory] = await db
    .select({ isActive: category.isActive })
    .from(category)
    .where(and(eq(category.id, data.categoryId), eq(category.orgId, orgId)))
    .limit(1);
  if (!selectedCategory || !selectedCategory.isActive)
    throw new Error('Choose an active category');
  const { confirmLoss: _confirmLoss, ...safeData } = data;
  const generatedSku =
    data.sku?.trim().toUpperCase() ||
    (await generateProductSku({
      brand: data.brand,
      name: data.name,
      volume: data.volume,
      volumeUnit: data.volumeUnit,
      unit: data.unit,
      unitsPerPack: data.unitsPerPack,
    }));
  safeData.sku = generatedSku;
  safeData.barcode = normalizeBarcode(data.barcode ?? '') || undefined;
  const [duplicateSku] = await db
    .select({ id: product.id })
    .from(product)
    .where(
      and(
        eq(product.orgId, orgId),
        eq(product.sku, generatedSku),
        eq(product.isActive, true)
      )
    )
    .limit(1);
  if (duplicateSku)
    throw new Error(
      'This product code is already being used by another product.'
    );
  if (safeData.barcode) {
    const [duplicateBarcode] = await db
      .select({ id: product.id })
      .from(product)
      .where(
        and(
          eq(product.orgId, orgId),
          eq(product.barcode, safeData.barcode),
          eq(product.isActive, true)
        )
      )
      .limit(1);
    if (duplicateBarcode)
      throw new Error('A product with this barcode already exists.');
  }
  await db.transaction(async (tx) => {
    await tx.insert(product).values({
      id,
      ...safeData,
      ...(safeData.volume !== undefined
        ? { volume: String(safeData.volume) }
        : {}),
      ...(safeData.abv !== undefined ? { abv: String(safeData.abv) } : {}),
      name: data.name.trim(),
      buyingPrice: String(data.buyingPrice),
      sellingPrice: String(data.sellingPrice),
      userId,
      orgId,
    } as any);
    if (data.stock > 0) {
      const [location] = await tx
        .select({ id: branch.id })
        .from(branch)
        .where(eq(branch.organizationId, orgId))
        .orderBy(desc(branch.isMain), branch.createdAt)
        .limit(1);
      if (!location)
        throw new Error(
          'Create an inventory location before adding opening stock'
        );
      await applyInventoryMovement(tx, {
        productId: id,
        productName: data.name.trim(),
        branchId: location.id,
        quantity: data.stock,
        type: 'opening_stock',
        referenceType: 'product',
        referenceId: id,
        reason: 'Opening stock',
        userId,
        orgId,
        unitCost: data.buyingPrice,
      });
      await addCostLayer(tx, {
        productId: id,
        branchId: location.id,
        sourceType: 'opening_stock',
        sourceId: id,
        quantity: data.stock,
        unitCost: data.buyingPrice,
        orgId,
      });
    }
  });
  await invalidateProductCache(orgId);
  revalidatePath('/dashboard/products');
  revalidatePath('/dashboard/inventory');
  return { id };
}

export async function updateProduct(
  id: string,
  data: Partial<{
    name: string;
    brand: string;
    variant: string;
    sku: string;
    barcode: string;
    description: string;
    imageUrl: string;
    categoryId: string;
    buyingPrice: number;
    sellingPrice: number;
    minStock: number;
    unit: string;
    volume: number;
    volumeUnit: string;
    abv: number;
    countryOfOrigin: string;
    unitsPerPack: number;
    preferredSupplierId: string;
    trackingMode: 'none' | 'lot' | 'serial';
    costingMethod: 'weighted_average' | 'fifo' | 'standard';
    shelfLifeDays: number;
    expiryAlertDays: number;
    isActive: boolean;
    confirmLoss: boolean;
  }>
) {
  const userId = await getUserId();
  const orgId = await getOrgId(userId);
  await requireProductManager(userId, orgId);
  if ('stock' in data)
    throw new Error(
      'Stock cannot be changed from the product form. Use Adjust stock instead.'
    );
  if (data.name !== undefined && !data.name.trim())
    throw new Error('Product name is required');
  if (
    data.buyingPrice !== undefined &&
    (!Number.isFinite(data.buyingPrice) || data.buyingPrice <= 0)
  )
    throw new Error('Cost price must be greater than zero');
  if (
    data.sellingPrice !== undefined &&
    (!Number.isFinite(data.sellingPrice) || data.sellingPrice < 0)
  )
    throw new Error('Enter a valid selling price');
  if (
    data.minStock !== undefined &&
    (!Number.isInteger(data.minStock) || data.minStock < 0)
  )
    throw new Error('Low-stock alert level cannot be negative');
  if (
    data.volume !== undefined &&
    (!Number.isFinite(data.volume) || data.volume <= 0)
  )
    throw new Error('Bottle or package size must be greater than zero');
  if (
    data.unitsPerPack !== undefined &&
    (!Number.isInteger(data.unitsPerPack) || data.unitsPerPack <= 0)
  )
    throw new Error('Units per pack must be a positive whole number');
  if (
    data.shelfLifeDays !== undefined &&
    (!Number.isInteger(data.shelfLifeDays) || data.shelfLifeDays <= 0)
  )
    throw new Error('Shelf life must be a positive number of days');
  if (
    data.expiryAlertDays !== undefined &&
    (!Number.isInteger(data.expiryAlertDays) || data.expiryAlertDays < 0)
  )
    throw new Error('Expiry alert days cannot be negative');
  const [current] = await db
    .select({
      buyingPrice: product.buyingPrice,
      sellingPrice: product.sellingPrice,
    })
    .from(product)
    .where(and(eq(product.id, id), eq(product.orgId, orgId)))
    .limit(1);
  if (!current) throw new Error('Product not found');
  const buying = data.buyingPrice ?? Number(current.buyingPrice);
  const selling = data.sellingPrice ?? Number(current.sellingPrice);
  if (selling < buying && data.confirmLoss !== true)
    throw new Error(
      'Confirm that this product will be sold at a loss before saving'
    );
  const { confirmLoss: _confirmLoss, ...safeData } = data;
  if (safeData.sku !== undefined) {
    safeData.sku = safeData.sku.trim().toUpperCase();
    if (!safeData.sku)
      throw new Error('Product code cannot be empty when supplied');
    const [duplicate] = await db
      .select({ id: product.id })
      .from(product)
      .where(
        and(
          eq(product.orgId, orgId),
          eq(product.sku, safeData.sku),
          sql`${product.id} <> ${id}`
        )
      )
      .limit(1);
    if (duplicate)
      throw new Error(
        'This product code is already being used by another product.'
      );
  }
  let normalizedBarcode: string | null | undefined;
  if (safeData.barcode !== undefined) {
    normalizedBarcode = normalizeBarcode(safeData.barcode) || null;
    delete safeData.barcode;
    if (normalizedBarcode) {
      const [duplicate] = await db
        .select({ id: product.id })
        .from(product)
        .where(
          and(
            eq(product.orgId, orgId),
            eq(product.barcode, normalizedBarcode),
            eq(product.isActive, true),
            sql`${product.id} <> ${id}`
          )
        )
        .limit(1);
      if (duplicate)
        throw new Error('A product with this barcode already exists.');
    }
  }
  await db
    .update(product)
    .set({
      ...safeData,
      ...(normalizedBarcode !== undefined
        ? { barcode: normalizedBarcode }
        : {}),
      ...(safeData.buyingPrice !== undefined
        ? { buyingPrice: String(safeData.buyingPrice) }
        : {}),
      ...(safeData.sellingPrice !== undefined
        ? { sellingPrice: String(safeData.sellingPrice) }
        : {}),
      updatedAt: new Date(),
    } as any)
    .where(and(eq(product.id, id), eq(product.orgId, orgId)));
  if (data.categoryId !== undefined || data.isActive !== undefined)
    await invalidateProductCache(orgId);
  else await invalidateProductReadCache(orgId);
  revalidatePath('/dashboard/products');
}

export async function deleteProduct(id: string) {
  const userId = await getUserId();
  const orgId = await getOrgId(userId);
  await db
    .delete(product)
    .where(and(eq(product.id, id), eq(product.orgId, orgId)));
  await invalidateProductCache(orgId);
  revalidatePath('/dashboard/products');
}

export async function archiveProduct(id: string) {
  const userId = await getUserId();
  const orgId = await getOrgId(userId);
  await db
    .update(product)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(product.id, id), eq(product.orgId, orgId)));
  await invalidateProductCache(orgId);
  revalidatePath('/dashboard/products');
  revalidatePath('/dashboard/inventory');
}
