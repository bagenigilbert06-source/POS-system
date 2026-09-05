'use server';

import { revalidatePath } from 'next/cache';
import { and, asc, desc, eq, gte, ilike, inArray, lte, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth/authorization';
import { invalidateProductReadCache } from '@/lib/cache/redis-cache';
import {
  cafeConfiguration,
  cafeMenuItem,
  cafeMenuItemModifierGroup,
  cafeModifierGroup,
  cafeModifierOption,
  cafeOrder,
  cafeOrderLine,
  cafeOrderLineModifier,
  cafeOrderSequence,
  cafePreparationEvent,
  cafePreparationStation,
  cafeRecipeComponent,
  cafeTable,
  cafeWastage,
  inventoryBalance,
  inventoryLoss,
  product,
  productPackage,
  sale,
  user,
  branch,
} from '@/lib/db/schema';
import { db } from '@/lib/db';
import { applyInventoryMovement } from '@/lib/inventory/inventory-service';
import { isCafeBusiness } from '@/lib/hospitality/rules';
import { WorkspaceService } from '@/lib/services/workspace-service';
import { PermissionEnum } from '@/lib/types/permissions';
import { generateId } from '@/lib/utils';
import {
  CAFE_ORDER_TYPES,
  CAFE_PREPARATION_STATUSES,
  CAFE_WASTAGE_REASONS,
  convertCafeQuantityToBase,
  nextCafePreparationStatus,
  type CafeOrderType,
  type CafePreparationStatus,
} from '@/lib/cafe/rules';
import { getCafeConfiguration } from '@/lib/cafe/sale-service';
import {
  cafeSchemaIsReady,
  requireCafeSchema,
} from '@/lib/db/schema-capabilities';

async function requireCafe(permission: PermissionEnum) {
  const authorization = await requirePermission(permission);
  const workspace = await WorkspaceService.getWorkspaceConfig(
    authorization.organizationId,
    authorization.userId
  );
  if (
    !workspace ||
    !isCafeBusiness(workspace.businessType, workspace.businessCategory)
  )
    throw new Error('Café operations are only available in a café workspace');
  return authorization;
}

const configurationSchema = z.object({
  enabledOrderTypes: z.array(z.enum(CAFE_ORDER_TYPES)).min(1),
  defaultOrderType: z.enum(CAFE_ORDER_TYPES),
  tablesEnabled: z.boolean(),
  preparationEnabled: z.boolean(),
  stationsEnabled: z.boolean(),
  tipsEnabled: z.boolean(),
  kitchenPrintingEnabled: z.boolean(),
});

export async function getCafeConfigurationData() {
  const authorization = await requireCafe(PermissionEnum.SETTINGS_VIEW);
  const orgId = authorization.organizationId;
  const branchScope = authorization.isOrganizationWide
    ? undefined
    : authorization.branchIds.length
      ? inArray(branch.id, authorization.branchIds)
      : sql`false`;
  const [configuration, branches, stations, tables] = await Promise.all([
    getCafeConfiguration(orgId),
    db
      .select({ id: branch.id, name: branch.name, isMain: branch.isMain })
      .from(branch)
      .where(and(eq(branch.organizationId, orgId), branchScope))
      .orderBy(desc(branch.isMain), branch.name),
    db
      .select()
      .from(cafePreparationStation)
      .where(eq(cafePreparationStation.organizationId, orgId))
      .orderBy(cafePreparationStation.sortOrder, cafePreparationStation.name),
    db
      .select()
      .from(cafeTable)
      .where(
        and(
          eq(cafeTable.organizationId, orgId),
          authorization.isOrganizationWide
            ? undefined
            : authorization.branchIds.length
              ? inArray(cafeTable.branchId, authorization.branchIds)
              : sql`false`
        )
      )
      .orderBy(cafeTable.sortOrder, cafeTable.name),
  ]);
  return { configuration, branches, stations, tables };
}

export async function saveCafeConfiguration(
  input: z.input<typeof configurationSchema>
) {
  const data = configurationSchema.parse(input);
  const authorization = await requireCafe(PermissionEnum.SETTINGS_EDIT);
  if (!data.enabledOrderTypes.includes(data.defaultOrderType))
    throw new Error('The default order type must be enabled');
  if (data.tablesEnabled && !data.enabledOrderTypes.includes('dine_in'))
    throw new Error('Enable dine-in before enabling tables');
  if (data.stationsEnabled && !data.preparationEnabled)
    throw new Error('Preparation must be enabled before stations');
  if (data.kitchenPrintingEnabled && !data.preparationEnabled)
    throw new Error('Preparation must be enabled before kitchen printing');
  await db
    .insert(cafeConfiguration)
    .values({
      organizationId: authorization.organizationId,
      enabledOrderTypes: data.enabledOrderTypes,
      defaultOrderType: data.defaultOrderType,
      tablesEnabled: data.tablesEnabled,
      preparationEnabled: data.preparationEnabled,
      stationsEnabled: data.stationsEnabled,
      tipsEnabled: data.tipsEnabled,
      kitchenPrintingEnabled: data.kitchenPrintingEnabled,
      updatedBy: authorization.userId,
    })
    .onConflictDoUpdate({
      target: cafeConfiguration.organizationId,
      set: {
        ...data,
        enabledOrderTypes: data.enabledOrderTypes,
        updatedBy: authorization.userId,
        updatedAt: new Date(),
      },
    });
  revalidatePath('/dashboard/admin/profile');
  revalidatePath('/dashboard/pos');
  revalidatePath('/dashboard/cafe/preparation');
  return { success: true };
}

const stationSchema = z.object({
  id: z.string().optional(),
  branchId: z.string().optional(),
  name: z.string().trim().min(1).max(80),
  printerIdentifier: z.string().trim().max(240).optional(),
  isActive: z.boolean().default(true),
});

export async function saveCafeStation(input: z.input<typeof stationSchema>) {
  const data = stationSchema.parse(input);
  const authorization = await requireCafe(PermissionEnum.SETTINGS_EDIT);
  if (
    data.branchId &&
    !authorization.isOrganizationWide &&
    !authorization.branchIds.includes(data.branchId)
  )
    throw new Error('This branch is outside your access');
  const id = data.id ?? generateId();
  const values = {
    organizationId: authorization.organizationId,
    branchId: data.branchId || null,
    name: data.name,
    printerIdentifier: data.printerIdentifier || null,
    isActive: data.isActive,
    updatedAt: new Date(),
  };
  if (data.id)
    await db
      .update(cafePreparationStation)
      .set(values)
      .where(
        and(
          eq(cafePreparationStation.id, id),
          eq(
            cafePreparationStation.organizationId,
            authorization.organizationId
          )
        )
      );
  else await db.insert(cafePreparationStation).values({ id, ...values });
  revalidatePath('/dashboard/admin/profile');
  revalidatePath('/dashboard/products');
  return { id };
}

const tableSchema = z.object({
  id: z.string().optional(),
  branchId: z.string().min(1),
  name: z.string().trim().min(1).max(80),
  isActive: z.boolean().default(true),
});

export async function saveCafeTable(input: z.input<typeof tableSchema>) {
  const data = tableSchema.parse(input);
  const authorization = await requireCafe(PermissionEnum.TABLE_EDIT);
  if (
    !authorization.isOrganizationWide &&
    !authorization.branchIds.includes(data.branchId)
  )
    throw new Error('This branch is outside your access');
  const id = data.id ?? generateId();
  const values = {
    organizationId: authorization.organizationId,
    branchId: data.branchId,
    name: data.name,
    isActive: data.isActive,
    updatedAt: new Date(),
  };
  if (data.id)
    await db
      .update(cafeTable)
      .set(values)
      .where(
        and(
          eq(cafeTable.id, id),
          eq(cafeTable.organizationId, authorization.organizationId),
          eq(cafeTable.status, 'available')
        )
      );
  else await db.insert(cafeTable).values({ id, ...values });
  revalidatePath('/dashboard/cafe/tables');
  revalidatePath('/dashboard/admin/profile');
  return { id };
}

export async function getCafeMenuConfiguration(productId: string) {
  const authorization = await requireCafe(PermissionEnum.PRODUCT_VIEW);
  const orgId = authorization.organizationId;
  const [
    [item],
    [menu],
    packages,
    stations,
    groups,
    links,
    options,
    recipes,
    ingredients,
  ] = await Promise.all([
    db
      .select()
      .from(product)
      .where(and(eq(product.id, productId), eq(product.orgId, orgId)))
      .limit(1),
    db
      .select()
      .from(cafeMenuItem)
      .where(
        and(
          eq(cafeMenuItem.productId, productId),
          eq(cafeMenuItem.organizationId, orgId)
        )
      )
      .limit(1),
    db
      .select()
      .from(productPackage)
      .where(
        and(
          eq(productPackage.productId, productId),
          eq(productPackage.organizationId, orgId),
          eq(productPackage.isActive, true)
        )
      )
      .orderBy(productPackage.baseUnitQuantity),
    db
      .select()
      .from(cafePreparationStation)
      .where(
        and(
          eq(cafePreparationStation.organizationId, orgId),
          eq(cafePreparationStation.isActive, true)
        )
      )
      .orderBy(cafePreparationStation.name),
    db
      .select()
      .from(cafeModifierGroup)
      .where(eq(cafeModifierGroup.organizationId, orgId))
      .orderBy(cafeModifierGroup.sortOrder, cafeModifierGroup.name),
    db
      .select()
      .from(cafeMenuItemModifierGroup)
      .where(
        and(
          eq(cafeMenuItemModifierGroup.organizationId, orgId),
          eq(cafeMenuItemModifierGroup.productId, productId)
        )
      )
      .orderBy(cafeMenuItemModifierGroup.sortOrder),
    db
      .select()
      .from(cafeModifierOption)
      .where(eq(cafeModifierOption.organizationId, orgId))
      .orderBy(cafeModifierOption.sortOrder, cafeModifierOption.name),
    db
      .select()
      .from(cafeRecipeComponent)
      .where(
        and(
          eq(cafeRecipeComponent.organizationId, orgId),
          eq(cafeRecipeComponent.menuProductId, productId)
        )
      ),
    db
      .select({
        id: product.id,
        name: product.name,
        unit: product.unit,
        buyingPrice: product.buyingPrice,
      })
      .from(product)
      .where(
        and(
          eq(product.orgId, orgId),
          eq(product.isActive, true),
          sql`${product.id} <> ${productId}`
        )
      )
      .orderBy(product.name),
  ]);
  if (!item) throw new Error('Menu item not found');
  return {
    item,
    menu,
    packages,
    stations,
    groups,
    links,
    options,
    recipes,
    ingredients,
  };
}

const menuSettingsSchema = z.object({
  productId: z.string().min(1),
  inventoryMode: z.enum(['product', 'recipe', 'none']),
  preparationRequired: z.boolean(),
  stationId: z.string().optional(),
  manualAvailability: z.enum(['available', 'unavailable']),
  availabilityReason: z.string().trim().max(200).optional(),
});

export async function saveCafeMenuSettings(
  input: z.input<typeof menuSettingsSchema>
) {
  const data = menuSettingsSchema.parse(input);
  const authorization = await requireCafe(PermissionEnum.PRODUCT_EDIT);
  const orgId = authorization.organizationId;
  const [owned] = await db
    .select({ id: product.id })
    .from(product)
    .where(and(eq(product.id, data.productId), eq(product.orgId, orgId)))
    .limit(1);
  if (!owned) throw new Error('Menu item not found');
  if (data.stationId) {
    const [station] = await db
      .select({ id: cafePreparationStation.id })
      .from(cafePreparationStation)
      .where(
        and(
          eq(cafePreparationStation.id, data.stationId),
          eq(cafePreparationStation.organizationId, orgId),
          eq(cafePreparationStation.isActive, true)
        )
      )
      .limit(1);
    if (!station) throw new Error('Preparation station not found');
  }
  await db
    .insert(cafeMenuItem)
    .values({
      productId: data.productId,
      organizationId: orgId,
      inventoryMode: data.inventoryMode,
      preparationRequired: data.preparationRequired,
      stationId: data.stationId || null,
      manualAvailability: data.manualAvailability,
      availabilityReason: data.availabilityReason || null,
    })
    .onConflictDoUpdate({
      target: cafeMenuItem.productId,
      set: {
        inventoryMode: data.inventoryMode,
        preparationRequired: data.preparationRequired,
        stationId: data.stationId || null,
        manualAvailability: data.manualAvailability,
        availabilityReason: data.availabilityReason || null,
        updatedAt: new Date(),
      },
    });
  await invalidateProductReadCache(orgId);
  revalidatePath(`/dashboard/products/${data.productId}`);
  revalidatePath('/dashboard/pos');
  return { success: true };
}

const modifierGroupSchema = z.object({
  id: z.string().optional(),
  productId: z.string().min(1),
  name: z.string().trim().min(1).max(80),
  selectionType: z.enum(['single', 'multiple']),
  minimumSelections: z.number().int().min(0).max(20),
  maximumSelections: z.number().int().min(1).max(20),
  options: z
    .array(
      z.object({
        id: z.string().optional(),
        name: z.string().trim().min(1).max(80),
        priceAdjustment: z.number().min(-1_000_000).max(1_000_000),
        isActive: z.boolean().default(true),
      })
    )
    .min(1)
    .max(30),
});

export async function saveCafeModifierGroup(
  input: z.input<typeof modifierGroupSchema>
) {
  const data = modifierGroupSchema.parse(input);
  const authorization = await requireCafe(PermissionEnum.PRODUCT_EDIT);
  const orgId = authorization.organizationId;
  if (data.minimumSelections > data.maximumSelections)
    throw new Error('Minimum selections cannot exceed maximum selections');
  if (data.selectionType === 'single' && data.maximumSelections !== 1)
    throw new Error('Single-choice groups can allow only one selection');
  const [owned] = await db
    .select({ id: product.id })
    .from(product)
    .where(and(eq(product.id, data.productId), eq(product.orgId, orgId)))
    .limit(1);
  if (!owned) throw new Error('Menu item not found');
  const groupId = data.id ?? generateId();
  await db.transaction(async (tx) => {
    if (data.id)
      await tx
        .update(cafeModifierGroup)
        .set({
          name: data.name,
          selectionType: data.selectionType,
          minimumSelections: data.minimumSelections,
          maximumSelections: data.maximumSelections,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(cafeModifierGroup.id, groupId),
            eq(cafeModifierGroup.organizationId, orgId)
          )
        );
    else
      await tx.insert(cafeModifierGroup).values({
        id: groupId,
        organizationId: orgId,
        name: data.name,
        selectionType: data.selectionType,
        minimumSelections: data.minimumSelections,
        maximumSelections: data.maximumSelections,
      });
    await tx
      .insert(cafeMenuItemModifierGroup)
      .values({
        id: generateId(),
        organizationId: orgId,
        productId: data.productId,
        groupId,
      })
      .onConflictDoNothing({
        target: [
          cafeMenuItemModifierGroup.productId,
          cafeMenuItemModifierGroup.groupId,
        ],
      });
    for (const option of data.options) {
      if (option.id)
        await tx
          .update(cafeModifierOption)
          .set({
            name: option.name,
            priceAdjustment: String(option.priceAdjustment),
            isActive: option.isActive,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(cafeModifierOption.id, option.id),
              eq(cafeModifierOption.organizationId, orgId),
              eq(cafeModifierOption.groupId, groupId)
            )
          );
      else
        await tx.insert(cafeModifierOption).values({
          id: generateId(),
          organizationId: orgId,
          groupId,
          name: option.name,
          priceAdjustment: String(option.priceAdjustment),
          isActive: option.isActive,
        });
    }
  });
  await invalidateProductReadCache(orgId);
  revalidatePath(`/dashboard/products/${data.productId}`);
  revalidatePath('/dashboard/pos');
  return { id: groupId };
}

const recipeSchema = z.object({
  productId: z.string().min(1),
  rows: z
    .array(
      z
        .object({
          id: z.string().optional(),
          packageId: z.string().optional(),
          modifierOptionId: z.string().optional(),
          ingredientProductId: z.string().min(1),
          quantityBase: z
            .number()
            .int()
            .min(-100_000_000)
            .max(100_000_000)
            .refine((value) => value !== 0, 'Recipe quantity cannot be zero'),
        })
        .refine(
          (row) => !(row.packageId && row.modifierOptionId),
          'A recipe row cannot target a size and modifier together'
        )
    )
    .max(250),
});

export async function saveCafeRecipe(input: z.input<typeof recipeSchema>) {
  const data = recipeSchema.parse(input);
  const authorization = await requireCafe(PermissionEnum.PRODUCT_EDIT);
  const orgId = authorization.organizationId;
  const ingredientIds = [
    ...new Set(data.rows.map((row) => row.ingredientProductId)),
  ];
  if (ingredientIds.includes(data.productId))
    throw new Error('A menu item cannot be its own ingredient');
  const [ownedMenu, ingredients] = await Promise.all([
    db
      .select({ id: product.id })
      .from(product)
      .where(and(eq(product.id, data.productId), eq(product.orgId, orgId)))
      .limit(1),
    ingredientIds.length
      ? db
          .select({ id: product.id })
          .from(product)
          .where(
            and(
              eq(product.orgId, orgId),
              inArray(product.id, ingredientIds),
              eq(product.isActive, true)
            )
          )
      : [],
  ]);
  if (!ownedMenu[0] || ingredients.length !== ingredientIds.length)
    throw new Error('One or more recipe items are unavailable');
  for (const row of data.rows)
    if (!Number.isSafeInteger(row.quantityBase))
      throw new Error(
        'Recipe quantities must use whole base units such as g, ml or pieces'
      );
  await db.transaction(async (tx) => {
    await tx
      .delete(cafeRecipeComponent)
      .where(
        and(
          eq(cafeRecipeComponent.organizationId, orgId),
          eq(cafeRecipeComponent.menuProductId, data.productId)
        )
      );
    if (data.rows.length)
      await tx.insert(cafeRecipeComponent).values(
        data.rows.map((row) => ({
          id: generateId(),
          organizationId: orgId,
          menuProductId: data.productId,
          packageId: row.packageId || null,
          modifierOptionId: row.modifierOptionId || null,
          ingredientProductId: row.ingredientProductId,
          quantityBase: String(row.quantityBase),
        }))
      );
    await tx
      .insert(cafeMenuItem)
      .values({
        productId: data.productId,
        organizationId: orgId,
        inventoryMode: 'recipe',
      })
      .onConflictDoUpdate({
        target: cafeMenuItem.productId,
        set: { inventoryMode: 'recipe', updatedAt: new Date() },
      });
  });
  await invalidateProductReadCache(orgId);
  revalidatePath(`/dashboard/products/${data.productId}`);
  revalidatePath('/dashboard/pos');
  return { success: true };
}

export async function getCafeTablesData() {
  const authorization = await requireCafe(PermissionEnum.TABLE_VIEW);
  const scope = authorization.isOrganizationWide
    ? undefined
    : authorization.branchIds.length
      ? inArray(cafeTable.branchId, authorization.branchIds)
      : sql`false`;
  const [configuration, tables, branches, openOrders] = await Promise.all([
    getCafeConfiguration(authorization.organizationId),
    db
      .select()
      .from(cafeTable)
      .where(
        and(
          eq(cafeTable.organizationId, authorization.organizationId),
          scope,
          eq(cafeTable.isActive, true)
        )
      )
      .orderBy(cafeTable.sortOrder, cafeTable.name),
    db
      .select({ id: branch.id, name: branch.name })
      .from(branch)
      .where(
        and(
          eq(branch.organizationId, authorization.organizationId),
          authorization.isOrganizationWide
            ? undefined
            : authorization.branchIds.length
              ? inArray(branch.id, authorization.branchIds)
              : sql`false`
        )
      )
      .orderBy(branch.name),
    db
      .select()
      .from(cafeOrder)
      .where(
        and(
          eq(cafeOrder.organizationId, authorization.organizationId),
          inArray(cafeOrder.status, ['open', 'awaiting_payment'])
        )
      )
      .orderBy(desc(cafeOrder.createdAt)),
  ]);
  return { configuration, tables, branches, openOrders };
}

export async function openCafeTableOrder(input: {
  tableId: string;
  idempotencyKey: string;
}) {
  const authorization = await requireCafe(PermissionEnum.ORDER_CREATE);
  if (!input.idempotencyKey || input.idempotencyKey.length > 160)
    throw new Error('A valid order transaction ID is required');
  const orgId = authorization.organizationId;
  return db.transaction(async (tx) => {
    const [table] = await tx
      .select()
      .from(cafeTable)
      .where(
        and(
          eq(cafeTable.id, input.tableId),
          eq(cafeTable.organizationId, orgId),
          eq(cafeTable.isActive, true)
        )
      )
      .limit(1)
      .for('update');
    if (
      !table ||
      (!authorization.isOrganizationWide &&
        !authorization.branchIds.includes(table.branchId))
    )
      throw new Error('Table not found');
    if (table.status !== 'available') {
      const [existing] = await tx
        .select()
        .from(cafeOrder)
        .where(
          and(
            eq(cafeOrder.organizationId, orgId),
            eq(cafeOrder.tableId, table.id),
            inArray(cafeOrder.status, ['open', 'awaiting_payment'])
          )
        )
        .limit(1);
      if (existing?.idempotencyKey === input.idempotencyKey) return existing;
      throw new Error(
        `${table.name} is already ${table.status.replace('_', ' ')}`
      );
    }
    const [sequence] = await tx
      .insert(cafeOrderSequence)
      .values({ organizationId: orgId, lastNumber: 1001 })
      .onConflictDoUpdate({
        target: cafeOrderSequence.organizationId,
        set: {
          lastNumber: sql`${cafeOrderSequence.lastNumber} + 1`,
          updatedAt: new Date(),
        },
      })
      .returning({ orderNumber: cafeOrderSequence.lastNumber });
    const orderId = generateId();
    const [created] = await tx
      .insert(cafeOrder)
      .values({
        id: orderId,
        organizationId: orgId,
        branchId: table.branchId,
        orderNumber: sequence.orderNumber,
        orderType: 'dine_in',
        tableId: table.id,
        status: 'open',
        preparationStatus: 'completed',
        idempotencyKey: input.idempotencyKey,
        createdBy: authorization.userId,
      })
      .returning();
    await tx
      .update(cafeTable)
      .set({ status: 'occupied', updatedAt: new Date() })
      .where(eq(cafeTable.id, table.id));
    return created;
  });
}

export async function markCafeOrderAwaitingPayment(orderId: string) {
  const authorization = await requireCafe(PermissionEnum.ORDER_EDIT);
  await db.transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(cafeOrder)
      .where(
        and(
          eq(cafeOrder.id, orderId),
          eq(cafeOrder.organizationId, authorization.organizationId),
          eq(cafeOrder.status, 'open')
        )
      )
      .limit(1)
      .for('update');
    if (
      !order ||
      (!authorization.isOrganizationWide &&
        !authorization.branchIds.includes(order.branchId))
    )
      throw new Error('Open order not found');
    await tx
      .update(cafeOrder)
      .set({ status: 'awaiting_payment', updatedAt: new Date() })
      .where(eq(cafeOrder.id, order.id));
    if (order.tableId)
      await tx
        .update(cafeTable)
        .set({ status: 'awaiting_payment', updatedAt: new Date() })
        .where(eq(cafeTable.id, order.tableId));
  });
  revalidatePath('/dashboard/cafe/tables');
  return { success: true };
}

export async function cancelCafeOpenOrder(orderId: string) {
  const authorization = await requireCafe(PermissionEnum.ORDER_DELETE);
  await db.transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(cafeOrder)
      .where(
        and(
          eq(cafeOrder.id, orderId),
          eq(cafeOrder.organizationId, authorization.organizationId),
          inArray(cafeOrder.status, ['open', 'awaiting_payment'])
        )
      )
      .limit(1)
      .for('update');
    if (
      !order ||
      (!authorization.isOrganizationWide &&
        !authorization.branchIds.includes(order.branchId))
    )
      throw new Error('Open order not found');
    await tx
      .update(cafeOrder)
      .set({
        status: 'cancelled',
        updatedAt: new Date(),
        completedAt: new Date(),
      })
      .where(eq(cafeOrder.id, order.id));
    if (order.tableId)
      await tx
        .update(cafeTable)
        .set({ status: 'available', updatedAt: new Date() })
        .where(eq(cafeTable.id, order.tableId));
  });
  revalidatePath('/dashboard/cafe/tables');
  return { success: true };
}

export async function getCafePreparationQueue() {
  const authorization = await requireCafe(PermissionEnum.KITCHEN_QUEUE_VIEW);
  const branchScope = authorization.isOrganizationWide
    ? undefined
    : authorization.branchIds.length
      ? inArray(cafeOrder.branchId, authorization.branchIds)
      : sql`false`;
  const orders = await db
    .select({
      order: cafeOrder,
      tableName: cafeTable.name,
      receiptNo: sale.receiptNo,
    })
    .from(cafeOrder)
    .leftJoin(cafeTable, eq(cafeTable.id, cafeOrder.tableId))
    .leftJoin(sale, eq(sale.id, cafeOrder.saleId))
    .where(
      and(
        eq(cafeOrder.organizationId, authorization.organizationId),
        branchScope,
        inArray(cafeOrder.preparationStatus, ['new', 'preparing', 'ready'])
      )
    )
    .orderBy(asc(cafeOrder.createdAt))
    .limit(200);
  const orderIds = orders.map(({ order }) => order.id);
  const lines = orderIds.length
    ? await db
        .select({
          line: cafeOrderLine,
          stationName: cafePreparationStation.name,
          stationPrinterIdentifier: cafePreparationStation.printerIdentifier,
        })
        .from(cafeOrderLine)
        .leftJoin(
          cafePreparationStation,
          eq(cafePreparationStation.id, cafeOrderLine.stationId)
        )
        .where(
          and(
            eq(cafeOrderLine.organizationId, authorization.organizationId),
            inArray(cafeOrderLine.orderId, orderIds),
            eq(cafeOrderLine.preparationRequired, true)
          )
        )
        .orderBy(cafeOrderLine.createdAt)
    : [];
  const lineIds = lines.map(({ line }) => line.id);
  const modifiers = lineIds.length
    ? await db
        .select()
        .from(cafeOrderLineModifier)
        .where(
          and(
            eq(
              cafeOrderLineModifier.organizationId,
              authorization.organizationId
            ),
            inArray(cafeOrderLineModifier.orderLineId, lineIds)
          )
        )
    : [];
  return { orders, lines, modifiers };
}

export async function advanceCafePreparation(orderId: string) {
  const authorization = await requireCafe(PermissionEnum.KITCHEN_QUEUE_MANAGE);
  const orgId = authorization.organizationId;
  const result = await db.transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(cafeOrder)
      .where(
        and(
          eq(cafeOrder.id, orderId),
          eq(cafeOrder.organizationId, orgId),
          inArray(cafeOrder.preparationStatus, CAFE_PREPARATION_STATUSES)
        )
      )
      .limit(1)
      .for('update');
    if (
      !order ||
      (!authorization.isOrganizationWide &&
        !authorization.branchIds.includes(order.branchId))
    )
      throw new Error('Preparation order not found');
    const next = nextCafePreparationStatus(
      order.preparationStatus as CafePreparationStatus
    );
    await tx
      .update(cafeOrder)
      .set({
        preparationStatus: next,
        status: next === 'completed' ? 'completed' : order.status,
        updatedAt: new Date(),
        completedAt: next === 'completed' ? new Date() : order.completedAt,
      })
      .where(eq(cafeOrder.id, order.id));
    await tx
      .update(cafeOrderLine)
      .set({ preparationStatus: next })
      .where(
        and(
          eq(cafeOrderLine.orderId, order.id),
          eq(cafeOrderLine.organizationId, orgId),
          eq(cafeOrderLine.preparationRequired, true)
        )
      );
    await tx.insert(cafePreparationEvent).values({
      id: generateId(),
      organizationId: orgId,
      branchId: order.branchId,
      orderId: order.id,
      fromStatus: order.preparationStatus,
      toStatus: next,
      userId: authorization.userId,
    });
    if (next === 'completed' && order.tableId)
      await tx
        .update(cafeTable)
        .set({ status: 'available', updatedAt: new Date() })
        .where(eq(cafeTable.id, order.tableId));
    return { status: next };
  });
  revalidatePath('/dashboard/cafe/preparation');
  revalidatePath('/dashboard/cafe/tables');
  revalidatePath('/dashboard/sales');
  return result;
}

const wastageSchema = z.object({
  branchId: z.string().min(1),
  productId: z.string().min(1),
  quantity: z.number().positive().max(100_000_000),
  unit: z.string().min(1).max(30),
  packSize: z.number().int().positive().optional(),
  reasonType: z.enum(CAFE_WASTAGE_REASONS),
  notes: z.string().trim().max(500).optional(),
});

export async function recordCafeWastage(input: z.input<typeof wastageSchema>) {
  await requireCafeSchema();
  const data = wastageSchema.parse(input);
  const authorization = await requireCafe(PermissionEnum.INVENTORY_ADJUST);
  const orgId = authorization.organizationId;
  if (
    !authorization.isOrganizationWide &&
    !authorization.branchIds.includes(data.branchId)
  )
    throw new Error('This branch is outside your access');
  const [item] = await db
    .select()
    .from(product)
    .where(
      and(
        eq(product.id, data.productId),
        eq(product.orgId, orgId),
        eq(product.isActive, true)
      )
    )
    .limit(1);
  if (!item) throw new Error('Ingredient or menu item not found');
  const quantityBase = convertCafeQuantityToBase({
    quantity: data.quantity,
    enteredUnit: data.unit,
    productBaseUnit: item.unit,
    packSize: data.packSize,
  });
  const wastageId = generateId();
  const lossId = generateId();
  const lossNo = `WST-${Date.now().toString().slice(-8)}-${wastageId.slice(-4).toUpperCase()}`;
  await db.transaction(async (tx) => {
    await applyInventoryMovement(tx, {
      productId: item.id,
      productName: item.name,
      branchId: data.branchId,
      quantity: -quantityBase,
      type: 'wastage',
      referenceType: 'cafe_wastage',
      referenceId: wastageId,
      reason: `${data.reasonType.replaceAll('_', ' ')}${data.notes ? ` · ${data.notes}` : ''}`,
      userId: authorization.userId,
      orgId,
      unitCost: Number(item.buyingPrice),
    });
    await tx.insert(inventoryLoss).values({
      id: lossId,
      lossNo,
      productId: item.id,
      productName: item.name,
      quantity: quantityBase,
      type: data.reasonType,
      unitCost: item.buyingPrice,
      totalCost: String(Number(item.buyingPrice) * quantityBase),
      reason: data.notes || data.reasonType.replaceAll('_', ' '),
      userId: authorization.userId,
      orgId,
      branchId: data.branchId,
    });
    await tx.insert(cafeWastage).values({
      id: wastageId,
      organizationId: orgId,
      branchId: data.branchId,
      inventoryLossId: lossId,
      productId: item.id,
      quantityBase: String(quantityBase),
      enteredQuantity: String(data.quantity),
      enteredUnit: data.unit,
      reasonType: data.reasonType,
      notes: data.notes || null,
      recordedBy: authorization.userId,
      approvedBy: authorization.permissions.includes(
        PermissionEnum.INVENTORY_ADJUST_APPROVE
      )
        ? authorization.userId
        : null,
    });
  });
  await invalidateProductReadCache(orgId);
  revalidatePath('/dashboard/cafe/wastage');
  revalidatePath('/dashboard/inventory');
  revalidatePath('/dashboard/reports');
  return { id: wastageId, lossNo };
}

export async function getCafeWastageData() {
  const authorization = await requireCafe(PermissionEnum.INVENTORY_VIEW);
  const orgId = authorization.organizationId;
  const schemaReady = await cafeSchemaIsReady();
  const branchScope = authorization.isOrganizationWide
    ? undefined
    : authorization.branchIds.length
      ? inArray(branch.id, authorization.branchIds)
      : sql`false`;
  const wastageScope = authorization.isOrganizationWide
    ? undefined
    : authorization.branchIds.length
      ? inArray(cafeWastage.branchId, authorization.branchIds)
      : sql`false`;
  const [branches, products, rows] = await Promise.all([
    db
      .select({ id: branch.id, name: branch.name })
      .from(branch)
      .where(and(eq(branch.organizationId, orgId), branchScope))
      .orderBy(branch.name),
    db
      .select({ id: product.id, name: product.name, unit: product.unit })
      .from(product)
      .where(and(eq(product.orgId, orgId), eq(product.isActive, true)))
      .orderBy(product.name),
    schemaReady
      ? db
          .select({
            wastage: cafeWastage,
            productName: product.name,
            staffName: user.name,
          })
          .from(cafeWastage)
          .innerJoin(product, eq(product.id, cafeWastage.productId))
          .innerJoin(user, eq(user.id, cafeWastage.recordedBy))
          .where(and(eq(cafeWastage.organizationId, orgId), wastageScope))
          .orderBy(desc(cafeWastage.createdAt))
          .limit(250)
      : Promise.resolve([]),
  ]);
  return { branches, products, rows, schemaReady };
}

export async function getCafeOrderDetails(orderId: string) {
  const authorization = await requireCafe(PermissionEnum.ORDER_VIEW);
  const [record] = await db
    .select({
      order: cafeOrder,
      receiptNo: sale.receiptNo,
      paymentMethod: sale.paymentMethod,
      subtotal: sale.subtotal,
      discountAmount: sale.discountAmount,
      taxAmount: sale.taxAmount,
      total: sale.total,
      cashierName: user.name,
      tableName: cafeTable.name,
    })
    .from(cafeOrder)
    .leftJoin(sale, eq(sale.id, cafeOrder.saleId))
    .leftJoin(user, eq(user.id, cafeOrder.createdBy))
    .leftJoin(cafeTable, eq(cafeTable.id, cafeOrder.tableId))
    .where(
      and(
        eq(cafeOrder.id, orderId),
        eq(cafeOrder.organizationId, authorization.organizationId)
      )
    )
    .limit(1);
  if (
    !record ||
    (!authorization.isOrganizationWide &&
      !authorization.branchIds.includes(record.order.branchId))
  )
    throw new Error('Order not found');
  const [lines, events] = await Promise.all([
    db
      .select()
      .from(cafeOrderLine)
      .where(
        and(
          eq(cafeOrderLine.orderId, orderId),
          eq(cafeOrderLine.organizationId, authorization.organizationId)
        )
      )
      .orderBy(cafeOrderLine.createdAt),
    db
      .select({ event: cafePreparationEvent, staffName: user.name })
      .from(cafePreparationEvent)
      .innerJoin(user, eq(user.id, cafePreparationEvent.userId))
      .where(
        and(
          eq(cafePreparationEvent.orderId, orderId),
          eq(cafePreparationEvent.organizationId, authorization.organizationId)
        )
      )
      .orderBy(cafePreparationEvent.createdAt),
  ]);
  const modifiers = lines.length
    ? await db
        .select()
        .from(cafeOrderLineModifier)
        .where(
          and(
            eq(
              cafeOrderLineModifier.organizationId,
              authorization.organizationId
            ),
            inArray(
              cafeOrderLineModifier.orderLineId,
              lines.map((line) => line.id)
            )
          )
        )
    : [];
  return { ...record, lines, modifiers, events };
}

export async function getCafeOrdersData(input?: {
  search?: string;
  status?: string;
  orderType?: string;
  payment?: string;
  from?: string;
  to?: string;
}) {
  const authorization = await requireCafe(PermissionEnum.ORDER_VIEW);
  const orgId = authorization.organizationId;
  const parseDate = (value: string | undefined, endOfDay = false) => {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
    const date = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}`);
    return Number.isNaN(date.getTime()) ? undefined : date;
  };
  const start = parseDate(input?.from) ?? new Date();
  if (!input?.from) start.setHours(0, 0, 0, 0);
  const end = parseDate(input?.to, true);
  const search = input?.search?.trim();
  const rows = await db
    .select({
      order: cafeOrder,
      receiptNo: sale.receiptNo,
      paymentMethod: sale.paymentMethod,
      total: sale.total,
      cashierName: user.name,
      tableName: cafeTable.name,
      branchName: branch.name,
    })
    .from(cafeOrder)
    .leftJoin(sale, eq(sale.id, cafeOrder.saleId))
    .leftJoin(user, eq(user.id, cafeOrder.createdBy))
    .leftJoin(cafeTable, eq(cafeTable.id, cafeOrder.tableId))
    .innerJoin(branch, eq(branch.id, cafeOrder.branchId))
    .where(
      and(
        eq(cafeOrder.organizationId, orgId),
        authorization.isOrganizationWide
          ? undefined
          : authorization.branchIds.length
            ? inArray(cafeOrder.branchId, authorization.branchIds)
            : sql`false`,
        gte(cafeOrder.createdAt, start),
        end ? lte(cafeOrder.createdAt, end) : undefined,
        input?.status ? eq(cafeOrder.status, input.status) : undefined,
        input?.orderType ? eq(cafeOrder.orderType, input.orderType) : undefined,
        input?.payment ? eq(sale.paymentMethod, input.payment) : undefined,
        search
          ? or(
              ilike(sale.receiptNo, `%${search}%`),
              sql`cast(${cafeOrder.orderNumber} as text) ilike ${`%${search.replace(/^#/, '')}%`}`
            )
          : undefined
      )
    )
    .orderBy(desc(cafeOrder.createdAt))
    .limit(500);
  const orderIds = rows.map(({ order }) => order.id);
  const counts = orderIds.length
    ? await db
        .select({
          orderId: cafeOrderLine.orderId,
          count: sql<number>`coalesce(sum(${cafeOrderLine.quantity}),0)`,
        })
        .from(cafeOrderLine)
        .where(
          and(
            eq(cafeOrderLine.organizationId, orgId),
            inArray(cafeOrderLine.orderId, orderIds)
          )
        )
        .groupBy(cafeOrderLine.orderId)
    : [];
  const countByOrder = new Map(
    counts.map((row) => [row.orderId, Number(row.count)])
  );
  return rows.map((row) => ({
    ...row,
    itemCount: countByOrder.get(row.order.id) ?? 0,
  }));
}
