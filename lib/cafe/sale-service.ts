import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
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
  cafeRecipeComponent,
  cafeTable,
  inventoryBalance,
  product,
  productPackage,
} from '@/lib/db/schema';
import type { InventoryTransaction } from '@/lib/inventory/inventory-service';
import {
  applyInventoryMovement,
  consumeInventoryCost,
} from '@/lib/inventory/inventory-service';
import { generateId } from '@/lib/utils';
import {
  CAFE_ORDER_TYPES,
  aggregateRecipeRequirements,
  recipeAvailability,
  validateCafeModifierSelections,
  type CafeOrderType,
  type RecipeRequirement,
} from './rules';

export type CafeCheckoutLineInput = {
  productId: string;
  packageId?: string;
  quantity: number;
  modifierOptionIds?: string[];
  notes?: string;
};

export type CafeCheckoutInput = {
  orderType: CafeOrderType;
  tableId?: string;
  orderId?: string;
  notes?: string;
  lines: CafeCheckoutLineInput[];
};

export type ResolvedCafeLine = {
  productId: string;
  packageId?: string;
  productName: string;
  displayName: string;
  sizeName?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  inventoryMode: 'product' | 'recipe' | 'none';
  preparationRequired: boolean;
  stationId: string | null;
  notes?: string;
  modifiers: Array<{
    groupId: string;
    groupName: string;
    optionId: string;
    optionName: string;
    priceAdjustment: number;
  }>;
  recipeRequirements: RecipeRequirement[];
};

export type ResolvedCafeCheckout = {
  orderType: CafeOrderType;
  tableId?: string;
  orderId?: string;
  notes?: string;
  preparationEnabled: boolean;
  lines: ResolvedCafeLine[];
};

export const DEFAULT_CAFE_CONFIGURATION = {
  enabledOrderTypes: ['takeaway'] as CafeOrderType[],
  defaultOrderType: 'takeaway' as CafeOrderType,
  tablesEnabled: false,
  preparationEnabled: false,
  stationsEnabled: false,
  tipsEnabled: false,
  kitchenPrintingEnabled: false,
};

export type CafeConfigurationView = typeof DEFAULT_CAFE_CONFIGURATION & {
  organizationId?: string;
  updatedBy?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export async function getCafeConfiguration(
  organizationId: string
): Promise<CafeConfigurationView> {
  const [record] = await db
    .select()
    .from(cafeConfiguration)
    .where(eq(cafeConfiguration.organizationId, organizationId))
    .limit(1);
  if (!record) return DEFAULT_CAFE_CONFIGURATION;
  const enabled = Array.isArray(record.enabledOrderTypes)
    ? record.enabledOrderTypes.filter((value): value is CafeOrderType =>
        CAFE_ORDER_TYPES.includes(value as CafeOrderType)
      )
    : (['takeaway'] as CafeOrderType[]);
  const normalizedEnabled: CafeOrderType[] = enabled.length
    ? enabled
    : ['takeaway'];
  return {
    ...record,
    enabledOrderTypes: normalizedEnabled,
    defaultOrderType: normalizedEnabled.includes(
      record.defaultOrderType as CafeOrderType
    )
      ? (record.defaultOrderType as CafeOrderType)
      : normalizedEnabled[0]!,
  };
}

export async function resolveCafeCheckout(input: {
  organizationId: string;
  branchId: string;
  checkout: CafeCheckoutInput;
}): Promise<ResolvedCafeCheckout> {
  const { organizationId, branchId, checkout } = input;
  if (!checkout.lines.length || checkout.lines.length > 250)
    throw new Error('A café order must contain between 1 and 250 lines');
  const configuration = await getCafeConfiguration(organizationId);
  if (!configuration.enabledOrderTypes.includes(checkout.orderType))
    throw new Error('This order type is not enabled for the café');
  if (checkout.orderType === 'dine_in') {
    if (!configuration.tablesEnabled)
      throw new Error('Dine-in table service is not enabled');
    if (!checkout.tableId)
      throw new Error('Choose a table for a dine-in order');
    const [selectedTable] = await db
      .select({ id: cafeTable.id })
      .from(cafeTable)
      .where(
        and(
          eq(cafeTable.id, checkout.tableId),
          eq(cafeTable.organizationId, organizationId),
          eq(cafeTable.branchId, branchId),
          eq(cafeTable.isActive, true)
        )
      )
      .limit(1);
    if (!selectedTable)
      throw new Error('The selected café table is unavailable');
  } else if (checkout.tableId) {
    throw new Error('Only dine-in orders can be assigned to a table');
  }

  const productIds = [...new Set(checkout.lines.map((line) => line.productId))];
  const packageIds = [
    ...new Set(
      checkout.lines.flatMap((line) => (line.packageId ? [line.packageId] : []))
    ),
  ];
  const [catalogue, menuRows, packages, links, recipeRows] = await Promise.all([
    db
      .select({
        id: product.id,
        name: product.name,
        sellingPrice: product.sellingPrice,
        active: product.isActive,
      })
      .from(product)
      .where(
        and(eq(product.orgId, organizationId), inArray(product.id, productIds))
      ),
    db
      .select()
      .from(cafeMenuItem)
      .where(
        and(
          eq(cafeMenuItem.organizationId, organizationId),
          inArray(cafeMenuItem.productId, productIds)
        )
      ),
    packageIds.length
      ? db
          .select()
          .from(productPackage)
          .where(
            and(
              eq(productPackage.organizationId, organizationId),
              inArray(productPackage.id, packageIds),
              eq(productPackage.isActive, true)
            )
          )
      : [],
    db
      .select()
      .from(cafeMenuItemModifierGroup)
      .where(
        and(
          eq(cafeMenuItemModifierGroup.organizationId, organizationId),
          inArray(cafeMenuItemModifierGroup.productId, productIds)
        )
      ),
    db
      .select({
        id: cafeRecipeComponent.id,
        menuProductId: cafeRecipeComponent.menuProductId,
        packageId: cafeRecipeComponent.packageId,
        modifierOptionId: cafeRecipeComponent.modifierOptionId,
        ingredientProductId: cafeRecipeComponent.ingredientProductId,
        quantityBase: cafeRecipeComponent.quantityBase,
        ingredientName: product.name,
      })
      .from(cafeRecipeComponent)
      .innerJoin(
        product,
        eq(product.id, cafeRecipeComponent.ingredientProductId)
      )
      .where(
        and(
          eq(cafeRecipeComponent.organizationId, organizationId),
          inArray(cafeRecipeComponent.menuProductId, productIds)
        )
      ),
  ]);
  if (catalogue.length !== productIds.length)
    throw new Error('One or more café menu items are unavailable');

  const groupIds = [...new Set(links.map((link) => link.groupId))];
  const [groups, options, balances] = await Promise.all([
    groupIds.length
      ? db
          .select()
          .from(cafeModifierGroup)
          .where(
            and(
              eq(cafeModifierGroup.organizationId, organizationId),
              inArray(cafeModifierGroup.id, groupIds),
              eq(cafeModifierGroup.isActive, true)
            )
          )
      : [],
    groupIds.length
      ? db
          .select()
          .from(cafeModifierOption)
          .where(
            and(
              eq(cafeModifierOption.organizationId, organizationId),
              inArray(cafeModifierOption.groupId, groupIds),
              eq(cafeModifierOption.isActive, true)
            )
          )
      : [],
    recipeRows.length
      ? db
          .select({
            productId: inventoryBalance.productId,
            onHand: inventoryBalance.onHand,
            reserved: inventoryBalance.reserved,
            unavailable: inventoryBalance.unavailable,
          })
          .from(inventoryBalance)
          .where(
            and(
              eq(inventoryBalance.orgId, organizationId),
              eq(inventoryBalance.branchId, branchId),
              inArray(inventoryBalance.productId, [
                ...new Set(recipeRows.map((row) => row.ingredientProductId)),
              ])
            )
          )
      : [],
  ]);
  const catalogueById = new Map(catalogue.map((item) => [item.id, item]));
  const menuById = new Map(menuRows.map((item) => [item.productId, item]));
  const packageById = new Map(packages.map((item) => [item.id, item]));
  const groupById = new Map(groups.map((item) => [item.id, item]));
  const optionsByGroup = new Map<string, typeof options>();
  for (const option of options)
    optionsByGroup.set(option.groupId, [
      ...(optionsByGroup.get(option.groupId) ?? []),
      option,
    ]);
  const optionById = new Map(options.map((item) => [item.id, item]));
  const availableByIngredient = new Map(
    balances.map((item) => [
      item.productId,
      Number(item.onHand) - Number(item.reserved) - Number(item.unavailable),
    ])
  );

  const lines = checkout.lines.map((line): ResolvedCafeLine => {
    if (!Number.isInteger(line.quantity) || line.quantity <= 0)
      throw new Error('Café order quantities must be positive whole numbers');
    const item = catalogueById.get(line.productId);
    if (!item?.active) throw new Error('A selected menu item is unavailable');
    const menu = menuById.get(line.productId);
    if (!menu)
      throw new Error(
        'Only configured café menu items can be sold at Counter POS'
      );
    if (menu?.manualAvailability === 'unavailable')
      throw new Error(
        `${item.name} is sold out${menu.availabilityReason ? `: ${menu.availabilityReason}` : ''}`
      );
    const selectedPackage = line.packageId
      ? packageById.get(line.packageId)
      : null;
    if (
      line.packageId &&
      (!selectedPackage || selectedPackage.productId !== item.id)
    )
      throw new Error(`The selected size for ${item.name} is unavailable`);
    const linkedGroups = links
      .filter((link) => link.productId === item.id)
      .map((link) => groupById.get(link.groupId))
      .filter((group): group is NonNullable<typeof group> => Boolean(group));
    const groupRules = linkedGroups.map((group) => ({
      id: group.id,
      selectionType: group.selectionType,
      minimumSelections: group.minimumSelections,
      maximumSelections: group.maximumSelections,
      optionIds: (optionsByGroup.get(group.id) ?? []).map(
        (option) => option.id
      ),
    }));
    const selectedOptionIds = line.modifierOptionIds ?? [];
    validateCafeModifierSelections(groupRules, selectedOptionIds);
    const selectedOptions = selectedOptionIds.map((id) => {
      const option = optionById.get(id);
      const group = option ? groupById.get(option.groupId) : null;
      if (!option || !group)
        throw new Error('A selected modifier is unavailable');
      return {
        groupId: group.id,
        groupName: group.name,
        optionId: option.id,
        optionName: option.name,
        priceAdjustment: Number(option.priceAdjustment),
      };
    });
    const itemRecipe = recipeRows.filter(
      (row) => row.menuProductId === item.id
    );
    const sizeRows = selectedPackage
      ? itemRecipe.filter(
          (row) => row.packageId === selectedPackage.id && !row.modifierOptionId
        )
      : [];
    const baseRows = sizeRows.length
      ? sizeRows
      : itemRecipe.filter((row) => !row.packageId && !row.modifierOptionId);
    const modifierRows = itemRecipe.filter(
      (row) =>
        row.modifierOptionId && selectedOptionIds.includes(row.modifierOptionId)
    );
    const recipeRequirements = aggregateRecipeRequirements(
      [...baseRows, ...modifierRows].map((row) => ({
        ingredientProductId: row.ingredientProductId,
        ingredientName: row.ingredientName,
        quantityBase: Number(row.quantityBase),
      })),
      line.quantity
    );
    const inventoryMode = (menu?.inventoryMode ??
      'product') as ResolvedCafeLine['inventoryMode'];
    if (inventoryMode === 'recipe') {
      if (!recipeRequirements.length)
        throw new Error(`${item.name} needs a recipe before it can be sold`);
      const availability = recipeAvailability(
        recipeRequirements,
        availableByIngredient
      );
      if (!availability.available)
        throw new Error(
          `${item.name} is unavailable: insufficient ${availability.blockingIngredients.join(', ')}`
        );
    }
    const unitPrice =
      Number(selectedPackage?.sellingPrice ?? item.sellingPrice) +
      selectedOptions.reduce((sum, option) => sum + option.priceAdjustment, 0);
    if (unitPrice < 0)
      throw new Error(`Modifier pricing makes ${item.name} invalid`);
    return {
      productId: item.id,
      packageId: selectedPackage?.id,
      productName: item.name,
      displayName: selectedPackage
        ? `${item.name} (${selectedPackage.name})`
        : item.name,
      sizeName: selectedPackage?.name,
      quantity: line.quantity,
      unitPrice,
      totalPrice: unitPrice * line.quantity,
      inventoryMode,
      preparationRequired: Boolean(menu?.preparationRequired),
      stationId: menu?.stationId ?? null,
      notes: line.notes?.trim().slice(0, 300) || undefined,
      modifiers: selectedOptions,
      recipeRequirements,
    };
  });
  return {
    orderType: checkout.orderType,
    tableId: checkout.tableId,
    orderId: checkout.orderId,
    notes: checkout.notes?.trim().slice(0, 500) || undefined,
    preparationEnabled: configuration.preparationEnabled,
    lines,
  };
}

export async function consumeCafeRecipeInventory(
  tx: InventoryTransaction,
  input: {
    organizationId: string;
    branchId: string;
    userId: string;
    saleId: string;
    receiptNo: string;
    checkout: ResolvedCafeCheckout;
    saleItemIds: string[];
  }
) {
  const costs = new Map<string, { unitCost: number; totalCost: number }>();
  for (const [index, line] of input.checkout.lines.entries()) {
    if (line.inventoryMode !== 'recipe') continue;
    let totalCost = 0;
    for (const requirement of line.recipeRequirements) {
      await applyInventoryMovement(tx, {
        productId: requirement.ingredientProductId,
        productName: requirement.ingredientName,
        branchId: input.branchId,
        quantity: -requirement.quantityBase,
        type: 'recipe_consumption',
        referenceType: 'sale',
        referenceId: input.saleId,
        reason: `${input.receiptNo} · ${line.displayName}`,
        userId: input.userId,
        orgId: input.organizationId,
      });
      const cost = await consumeInventoryCost(tx, {
        productId: requirement.ingredientProductId,
        branchId: input.branchId,
        orgId: input.organizationId,
        quantity: requirement.quantityBase,
      });
      totalCost += cost.totalCost;
    }
    costs.set(input.saleItemIds[index]!, {
      totalCost,
      unitCost: totalCost / line.quantity,
    });
  }
  return costs;
}

export async function createCafeOrderForSale(
  tx: InventoryTransaction,
  input: {
    organizationId: string;
    branchId: string;
    userId: string;
    saleId: string;
    customerId?: string;
    idempotencyKey: string;
    checkout: ResolvedCafeCheckout;
    saleItemIds: string[];
  }
) {
  const preparationRequired =
    input.checkout.preparationEnabled &&
    input.checkout.lines.some((line) => line.preparationRequired);
  let orderId = input.checkout.orderId;
  let orderNumber: number;
  if (orderId) {
    const [existing] = await tx
      .select()
      .from(cafeOrder)
      .where(
        and(
          eq(cafeOrder.id, orderId),
          eq(cafeOrder.organizationId, input.organizationId),
          eq(cafeOrder.branchId, input.branchId),
          eq(cafeOrder.status, 'open')
        )
      )
      .limit(1)
      .for('update');
    if (!existing)
      throw new Error('The open café order is no longer available');
    orderNumber = existing.orderNumber;
    await tx
      .update(cafeOrder)
      .set({
        saleId: input.saleId,
        guestId: input.customerId ?? existing.guestId,
        status: 'paid',
        preparationStatus: preparationRequired ? 'new' : 'completed',
        notes: input.checkout.notes ?? existing.notes,
        updatedAt: new Date(),
        completedAt: preparationRequired ? null : new Date(),
      })
      .where(eq(cafeOrder.id, existing.id));
  } else {
    const [sequence] = await tx
      .insert(cafeOrderSequence)
      .values({
        organizationId: input.organizationId,
        lastNumber: 1001,
      })
      .onConflictDoUpdate({
        target: cafeOrderSequence.organizationId,
        set: {
          lastNumber: sql`${cafeOrderSequence.lastNumber} + 1`,
          updatedAt: new Date(),
        },
      })
      .returning({ orderNumber: cafeOrderSequence.lastNumber });
    orderNumber = sequence.orderNumber;
    orderId = generateId();
    await tx.insert(cafeOrder).values({
      id: orderId,
      organizationId: input.organizationId,
      branchId: input.branchId,
      saleId: input.saleId,
      orderNumber,
      orderType: input.checkout.orderType,
      tableId: input.checkout.tableId ?? null,
      guestId: input.customerId ?? null,
      status: 'paid',
      preparationStatus: preparationRequired ? 'new' : 'completed',
      notes: input.checkout.notes ?? null,
      idempotencyKey: input.idempotencyKey,
      createdBy: input.userId,
      completedAt: preparationRequired ? null : new Date(),
    });
  }
  const orderLines = input.checkout.lines.map((line, index) => ({
    id: generateId(),
    organizationId: input.organizationId,
    orderId: orderId!,
    saleItemId: input.saleItemIds[index]!,
    productId: line.productId,
    packageId: line.packageId ?? null,
    itemName: line.productName,
    sizeName: line.sizeName ?? null,
    quantity: line.quantity,
    unitPrice: String(line.unitPrice),
    totalPrice: String(line.totalPrice),
    preparationRequired:
      input.checkout.preparationEnabled && line.preparationRequired,
    stationId: line.stationId,
    preparationStatus:
      input.checkout.preparationEnabled && line.preparationRequired
        ? 'new'
        : 'completed',
    notes: line.notes ?? null,
  }));
  await tx.insert(cafeOrderLine).values(orderLines);
  const modifierRows = input.checkout.lines.flatMap((line, index) =>
    line.modifiers.map((modifier) => ({
      id: generateId(),
      organizationId: input.organizationId,
      orderLineId: orderLines[index]!.id,
      modifierGroupId: modifier.groupId,
      modifierOptionId: modifier.optionId,
      groupName: modifier.groupName,
      optionName: modifier.optionName,
      priceAdjustment: String(modifier.priceAdjustment),
    }))
  );
  if (modifierRows.length)
    await tx.insert(cafeOrderLineModifier).values(modifierRows);
  if (preparationRequired)
    await tx.insert(cafePreparationEvent).values({
      id: generateId(),
      organizationId: input.organizationId,
      branchId: input.branchId,
      orderId,
      fromStatus: null,
      toStatus: 'new',
      userId: input.userId,
    });
  // Checkout releases a dine-in table. Open tabs use the separate draft-order
  // actions and remain occupied or awaiting payment until this commit succeeds.
  if (input.checkout.tableId)
    await tx
      .update(cafeTable)
      .set({ status: 'available', updatedAt: new Date() })
      .where(
        and(
          eq(cafeTable.id, input.checkout.tableId),
          eq(cafeTable.organizationId, input.organizationId),
          eq(cafeTable.branchId, input.branchId)
        )
      );
  return {
    orderId,
    orderNumber,
    preparationStatus: preparationRequired
      ? ('new' as const)
      : ('completed' as const),
  };
}

/** Compact branch-scoped café payload for the POS. It contains current
 * availability and choice definitions, never inventory history. */
export async function getCafePosExperience(
  organizationId: string,
  branchId: string
) {
  const configuration = await getCafeConfiguration(organizationId);
  const [
    menuItems,
    links,
    groups,
    options,
    recipes,
    ingredients,
    balances,
    packages,
    tables,
  ] = await Promise.all([
    db
      .select()
      .from(cafeMenuItem)
      .where(eq(cafeMenuItem.organizationId, organizationId)),
    db
      .select()
      .from(cafeMenuItemModifierGroup)
      .where(eq(cafeMenuItemModifierGroup.organizationId, organizationId)),
    db
      .select()
      .from(cafeModifierGroup)
      .where(
        and(
          eq(cafeModifierGroup.organizationId, organizationId),
          eq(cafeModifierGroup.isActive, true)
        )
      ),
    db
      .select()
      .from(cafeModifierOption)
      .where(
        and(
          eq(cafeModifierOption.organizationId, organizationId),
          eq(cafeModifierOption.isActive, true)
        )
      ),
    db
      .select()
      .from(cafeRecipeComponent)
      .where(eq(cafeRecipeComponent.organizationId, organizationId)),
    db
      .select({ id: product.id, name: product.name, unit: product.unit })
      .from(product)
      .where(eq(product.orgId, organizationId)),
    db
      .select({
        productId: inventoryBalance.productId,
        onHand: inventoryBalance.onHand,
        reserved: inventoryBalance.reserved,
        unavailable: inventoryBalance.unavailable,
      })
      .from(inventoryBalance)
      .where(
        and(
          eq(inventoryBalance.orgId, organizationId),
          eq(inventoryBalance.branchId, branchId)
        )
      ),
    db
      .select()
      .from(productPackage)
      .where(
        and(
          eq(productPackage.organizationId, organizationId),
          eq(productPackage.isActive, true)
        )
      ),
    configuration.tablesEnabled
      ? db
          .select({
            id: cafeTable.id,
            name: cafeTable.name,
            status: cafeTable.status,
          })
          .from(cafeTable)
          .where(
            and(
              eq(cafeTable.organizationId, organizationId),
              eq(cafeTable.branchId, branchId),
              eq(cafeTable.isActive, true)
            )
          )
          .orderBy(cafeTable.sortOrder, cafeTable.name)
      : [],
  ]);
  const ingredientById = new Map(ingredients.map((item) => [item.id, item]));
  const availableByIngredient = new Map(
    balances.map((item) => [
      item.productId,
      Number(item.onHand) - Number(item.reserved) - Number(item.unavailable),
    ])
  );
  const optionsByGroup = new Map<string, typeof options>();
  for (const option of options)
    optionsByGroup.set(option.groupId, [
      ...(optionsByGroup.get(option.groupId) ?? []),
      option,
    ]);
  const groupById = new Map(groups.map((group) => [group.id, group]));
  const packagesByProduct = new Map<string, typeof packages>();
  for (const item of packages)
    packagesByProduct.set(item.productId, [
      ...(packagesByProduct.get(item.productId) ?? []),
      item,
    ]);

  return {
    configuration,
    tables,
    menuItems: menuItems.map((menu) => {
      const itemRecipes = recipes.filter(
        (row) => row.menuProductId === menu.productId && !row.modifierOptionId
      );
      const variants = [
        null,
        ...(packagesByProduct.get(menu.productId) ?? []).map((item) => item.id),
      ];
      const availabilityBySize = variants.map((packageId) => {
        const sizeRows = packageId
          ? itemRecipes.filter((row) => row.packageId === packageId)
          : [];
        const rows = sizeRows.length
          ? sizeRows
          : itemRecipes.filter((row) => !row.packageId);
        const requirements = rows.map((row) => ({
          ingredientProductId: row.ingredientProductId,
          ingredientName:
            ingredientById.get(row.ingredientProductId)?.name ?? 'ingredient',
          quantityBase: Number(row.quantityBase),
        }));
        const state = recipeAvailability(requirements, availableByIngredient);
        return { packageId, ...state };
      });
      const manuallyAvailable = menu.manualAvailability !== 'unavailable';
      const recipeAvailable =
        menu.inventoryMode !== 'recipe' ||
        availabilityBySize.some(
          (state) => state.available && itemRecipes.length > 0
        );
      return {
        productId: menu.productId,
        inventoryMode: menu.inventoryMode,
        preparationRequired: menu.preparationRequired,
        stationId: menu.stationId,
        manualAvailability: menu.manualAvailability,
        availabilityReason: menu.availabilityReason,
        available: manuallyAvailable && recipeAvailable,
        blockingIngredients: [
          ...new Set(
            availabilityBySize.flatMap((state) => state.blockingIngredients)
          ),
        ],
        availabilityBySize,
        modifierGroups: links
          .filter((link) => link.productId === menu.productId)
          .map((link) => groupById.get(link.groupId))
          .filter((group): group is NonNullable<typeof group> => Boolean(group))
          .map((group) => ({
            id: group.id,
            name: group.name,
            selectionType: group.selectionType,
            minimumSelections: group.minimumSelections,
            maximumSelections: group.maximumSelections,
            options: (optionsByGroup.get(group.id) ?? []).map((option) => ({
              id: option.id,
              name: option.name,
              priceAdjustment: Number(option.priceAdjustment),
            })),
          })),
      };
    }),
  };
}
