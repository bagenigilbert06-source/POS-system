'use server';

import { revalidatePath } from 'next/cache';
import { and, desc, eq, gte, ilike, inArray, lte, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import {
  auditEvent,
  branch,
  category,
  inventoryBalance,
  product,
  sale,
  saleItem,
  stockAdjustment,
  stockAdjustmentItem,
  stockMovement,
  user,
} from '@/lib/db/schema';
import { requirePermission } from '@/lib/auth/authorization';
import { invalidateProductReadCache } from '@/lib/cache/redis-cache';
import { WorkspaceService } from '@/lib/services/workspace-service';
import { PermissionEnum } from '@/lib/types/permissions';
import { generateId } from '@/lib/utils';
import { stockVariance } from '@/lib/inventory/rules';
import { applyInventoryMovement } from '@/lib/inventory/inventory-service';

const adjustmentSchema = z.object({
  branchId: z.string().min(1),
  type: z.enum([
    'stocktake',
    'breakage',
    'damage',
    'missing',
    'theft_loss',
    'expired_unsellable',
    'promotional_use',
    'staff_use',
    'correction',
    'data_entry',
    'other',
  ]),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantityAfter: z.coerce.number().int().nonnegative().max(10_000_000),
      })
    )
    .min(1)
    .max(500),
  notes: z.string().trim().min(3).max(500),
});

const reorderSchema = z.object({
  productId: z.string().min(1),
  branchId: z.string().min(1),
  minStock: z.coerce.number().int().nonnegative().max(10_000_000),
});

const productMovementFiltersSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce
    .number()
    .int()
    .refine((value) => [10, 20, 50].includes(value))
    .default(10),
  movementType: z.string().trim().max(60).optional(),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  reference: z.string().trim().max(120).optional(),
});

const startCountSessionSchema = z.object({
  branchId: z.string().min(1),
  name: z.string().trim().min(3).max(120),
  countMode: z.enum(['full', 'cycle']).default('full'),
  blindCount: z.boolean().default(false),
  notes: z.string().trim().max(500).optional(),
});

const saveCountLineSchema = z.object({
  sessionId: z.string().min(1),
  productId: z.string().min(1),
  physicalQuantity: z.coerce.number().int().nonnegative().max(10_000_000),
  notes: z.string().trim().max(300).optional(),
});

const countSessionPageSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce
    .number()
    .int()
    .refine((value) => [10, 25, 50].includes(value))
    .default(25),
  search: z.string().trim().max(100).optional(),
});

const countSessionListSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce
    .number()
    .int()
    .refine((value) => [10, 20, 50].includes(value))
    .default(20),
  status: z.string().trim().max(40).optional(),
  branchId: z.string().trim().max(100).optional(),
});

const movementLedgerSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce
    .number()
    .int()
    .refine((value) => [10, 25, 50].includes(value))
    .default(25),
  search: z.string().trim().max(120).optional(),
  branchId: z.string().trim().max(100).optional(),
  movementType: z.string().trim().max(60).optional(),
  userId: z.string().trim().max(100).optional(),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

async function inventoryContext(permission: PermissionEnum) {
  const authorization = await requirePermission(permission);
  const workspace = await WorkspaceService.getWorkspaceConfig(
    authorization.organizationId,
    authorization.userId
  );
  if (!workspace?.enabledModules.includes('inventory'))
    throw new Error('Inventory module unavailable');
  return {
    userId: authorization.userId,
    orgId: authorization.organizationId,
    authorization,
  };
}

async function refreshInventory(orgId: string) {
  await invalidateProductReadCache(orgId);
  [
    '/dashboard',
    '/dashboard/inventory',
    '/dashboard/products',
    '/dashboard/purchases',
    '/dashboard/reports',
  ].forEach((path) => revalidatePath(path));
}

export async function authorizeInventoryExport() {
  await inventoryContext(PermissionEnum.INVENTORY_EXPORT);
  return true;
}

export async function getInventoryMovements(
  input: z.input<typeof movementLedgerSchema> = {}
) {
  const filters = movementLedgerSchema.parse(input);
  const { orgId, authorization } = await inventoryContext(
    PermissionEnum.INVENTORY_VIEW
  );
  const allowedBranchIds = authorization.branchIds.length
    ? authorization.branchIds
    : [''];
  if (
    filters.branchId &&
    !authorization.isOrganizationWide &&
    !allowedBranchIds.includes(filters.branchId)
  )
    throw new Error('You do not have access to this inventory location');
  const from = filters.from
    ? new Date(`${filters.from}T00:00:00.000`)
    : undefined;
  const to = filters.to ? new Date(`${filters.to}T23:59:59.999`) : undefined;
  const where = and(
    eq(stockMovement.orgId, orgId),
    filters.branchId
      ? eq(stockMovement.branchId, filters.branchId)
      : authorization.isOrganizationWide
        ? undefined
        : inArray(stockMovement.branchId, allowedBranchIds),
    filters.movementType
      ? eq(stockMovement.type, filters.movementType)
      : undefined,
    filters.userId ? eq(stockMovement.userId, filters.userId) : undefined,
    from ? gte(stockMovement.createdAt, from) : undefined,
    to ? lte(stockMovement.createdAt, to) : undefined,
    filters.search
      ? or(
          ilike(stockMovement.productName, `%${filters.search}%`),
          ilike(product.sku, `%${filters.search}%`),
          ilike(product.barcode, `%${filters.search}%`),
          ilike(stockMovement.referenceId, `%${filters.search}%`),
          ilike(stockMovement.reason, `%${filters.search}%`)
        )
      : undefined
  );
  const [[totalRow], branches, typeRows, userRows] = await Promise.all([
    db
      .select({ value: sql<number>`count(*)` })
      .from(stockMovement)
      .innerJoin(product, eq(product.id, stockMovement.productId))
      .where(where),
    db
      .select()
      .from(branch)
      .where(
        and(
          eq(branch.organizationId, orgId),
          authorization.isOrganizationWide
            ? undefined
            : inArray(branch.id, allowedBranchIds)
        )
      )
      .orderBy(desc(branch.isMain), branch.name),
    db
      .selectDistinct({ type: stockMovement.type })
      .from(stockMovement)
      .where(
        and(
          eq(stockMovement.orgId, orgId),
          authorization.isOrganizationWide
            ? undefined
            : inArray(stockMovement.branchId, allowedBranchIds)
        )
      )
      .orderBy(stockMovement.type),
    db
      .selectDistinct({ id: user.id, name: user.name })
      .from(stockMovement)
      .innerJoin(user, eq(user.id, stockMovement.userId))
      .where(
        and(
          eq(stockMovement.orgId, orgId),
          authorization.isOrganizationWide
            ? undefined
            : inArray(stockMovement.branchId, allowedBranchIds)
        )
      )
      .orderBy(user.name),
  ]);
  const total = Number(totalRow?.value ?? 0);
  const pageCount = Math.max(1, Math.ceil(total / filters.pageSize));
  const page = Math.min(filters.page, pageCount);
  const rows = await db
    .select({
      movement: stockMovement,
      sku: product.sku,
      barcode: product.barcode,
      branchName: branch.name,
      userName: user.name,
    })
    .from(stockMovement)
    .innerJoin(product, eq(product.id, stockMovement.productId))
    .leftJoin(branch, eq(branch.id, stockMovement.branchId))
    .leftJoin(user, eq(user.id, stockMovement.userId))
    .where(where)
    .orderBy(desc(stockMovement.createdAt), desc(stockMovement.id))
    .limit(filters.pageSize)
    .offset((page - 1) * filters.pageSize);
  return {
    rows,
    branches,
    movementTypes: typeRows.map((row) => row.type),
    users: userRows,
    pagination: { page, pageSize: filters.pageSize, pageCount, total },
    canExport: authorization.permissions.includes(
      PermissionEnum.INVENTORY_EXPORT
    ),
  };
}

export async function exportInventoryMovementsCsv(
  input: Omit<z.input<typeof movementLedgerSchema>, 'page' | 'pageSize'> = {}
) {
  const filters = movementLedgerSchema.parse({
    ...input,
    page: 1,
    pageSize: 50,
  });
  const { orgId, authorization } = await inventoryContext(
    PermissionEnum.INVENTORY_EXPORT
  );
  const allowedBranchIds = authorization.branchIds.length
    ? authorization.branchIds
    : [''];
  if (
    filters.branchId &&
    !authorization.isOrganizationWide &&
    !allowedBranchIds.includes(filters.branchId)
  )
    throw new Error('You do not have access to this inventory location');
  const from = filters.from
    ? new Date(`${filters.from}T00:00:00.000`)
    : undefined;
  const to = filters.to ? new Date(`${filters.to}T23:59:59.999`) : undefined;
  const rows = await db
    .select({
      movement: stockMovement,
      sku: product.sku,
      barcode: product.barcode,
      branchName: branch.name,
      userName: user.name,
    })
    .from(stockMovement)
    .innerJoin(product, eq(product.id, stockMovement.productId))
    .leftJoin(branch, eq(branch.id, stockMovement.branchId))
    .leftJoin(user, eq(user.id, stockMovement.userId))
    .where(
      and(
        eq(stockMovement.orgId, orgId),
        filters.branchId
          ? eq(stockMovement.branchId, filters.branchId)
          : authorization.isOrganizationWide
            ? undefined
            : inArray(stockMovement.branchId, allowedBranchIds),
        filters.movementType
          ? eq(stockMovement.type, filters.movementType)
          : undefined,
        filters.userId ? eq(stockMovement.userId, filters.userId) : undefined,
        from ? gte(stockMovement.createdAt, from) : undefined,
        to ? lte(stockMovement.createdAt, to) : undefined,
        filters.search
          ? or(
              ilike(stockMovement.productName, `%${filters.search}%`),
              ilike(product.sku, `%${filters.search}%`),
              ilike(product.barcode, `%${filters.search}%`),
              ilike(stockMovement.referenceId, `%${filters.search}%`),
              ilike(stockMovement.reason, `%${filters.search}%`)
            )
          : undefined
      )
    )
    .orderBy(desc(stockMovement.createdAt), desc(stockMovement.id))
    .limit(10_000);
  const cell = (value: unknown) =>
    `"${String(value ?? '').replaceAll('"', '""')}"`;
  const header = [
    'Date',
    'Product',
    'SKU',
    'Barcode',
    'Location',
    'Movement',
    'Change',
    'Before',
    'After',
    'User',
    'Reference type',
    'Reference',
    'Reason',
  ];
  const lines = rows.map(({ movement, sku, barcode, branchName, userName }) =>
    [
      movement.createdAt.toISOString(),
      movement.productName,
      sku,
      barcode,
      branchName,
      movement.type,
      movement.quantity,
      movement.stockBefore,
      movement.stockAfter,
      userName,
      movement.referenceType,
      movement.referenceId,
      movement.reason,
    ]
      .map(cell)
      .join(',')
  );
  return {
    filename: `inventory-movements-${new Date().toISOString().slice(0, 10)}.csv`,
    csv: [header.map(cell).join(','), ...lines].join('\n'),
  };
}

export async function getInventoryControlData() {
  const { orgId, authorization } = await inventoryContext(
    PermissionEnum.INVENTORY_VIEW
  );
  const [movements, adjustments, balances, branches] = await Promise.all([
    db
      .select()
      .from(stockMovement)
      .where(eq(stockMovement.orgId, orgId))
      .orderBy(desc(stockMovement.createdAt))
      .limit(25),
    db
      .select()
      .from(stockAdjustment)
      .where(eq(stockAdjustment.orgId, orgId))
      .orderBy(desc(stockAdjustment.createdAt))
      .limit(25),
    db
      .select()
      .from(inventoryBalance)
      .where(
        and(
          eq(inventoryBalance.orgId, orgId),
          authorization.isOrganizationWide
            ? undefined
            : inArray(
                inventoryBalance.branchId,
                authorization.branchIds.length ? authorization.branchIds : ['']
              )
        )
      ),
    db
      .select()
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
      .orderBy(desc(branch.isMain), branch.name),
  ]);
  const adjustmentIds = adjustments.map((item) => item.id);
  const adjustmentItems = adjustmentIds.length
    ? await db
        .select()
        .from(stockAdjustmentItem)
        .where(
          and(
            eq(stockAdjustmentItem.orgId, orgId),
            inArray(stockAdjustmentItem.adjustmentId, adjustmentIds)
          )
        )
    : [];
  return { movements, adjustments, adjustmentItems, balances, branches };
}

export async function getInventoryProductDetails(
  productId: string,
  input: z.input<typeof productMovementFiltersSchema> = {}
) {
  const id = z.string().min(1).parse(productId);
  const filters = productMovementFiltersSchema.parse(input);
  const { orgId, authorization } = await inventoryContext(
    PermissionEnum.INVENTORY_VIEW
  );
  const branchScope = authorization.isOrganizationWide
    ? undefined
    : inArray(
        branch.id,
        authorization.branchIds.length ? authorization.branchIds : ['']
      );
  const balanceBranchScope = authorization.isOrganizationWide
    ? undefined
    : inArray(
        inventoryBalance.branchId,
        authorization.branchIds.length ? authorization.branchIds : ['']
      );
  const movementBranchScope = authorization.isOrganizationWide
    ? undefined
    : inArray(
        stockMovement.branchId,
        authorization.branchIds.length ? authorization.branchIds : ['']
      );
  const saleBranchScope = authorization.isOrganizationWide
    ? undefined
    : inArray(
        sale.branchId,
        authorization.branchIds.length ? authorization.branchIds : ['']
      );
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const movementFrom = filters.from
    ? new Date(`${filters.from}T00:00:00.000`)
    : undefined;
  const movementTo = filters.to
    ? new Date(`${filters.to}T23:59:59.999`)
    : undefined;
  const movementWhere = and(
    eq(stockMovement.productId, id),
    eq(stockMovement.orgId, orgId),
    movementBranchScope,
    filters.movementType
      ? eq(stockMovement.type, filters.movementType)
      : undefined,
    movementFrom ? gte(stockMovement.createdAt, movementFrom) : undefined,
    movementTo ? lte(stockMovement.createdAt, movementTo) : undefined,
    filters.reference
      ? or(
          ilike(stockMovement.referenceId, `%${filters.reference}%`),
          ilike(stockMovement.reason, `%${filters.reference}%`)
        )
      : undefined
  );

  const [
    [item],
    locations,
    balances,
    [demand],
    [movementTotal],
    movementTypeRows,
  ] = await Promise.all([
    db
      .select({ product, categoryName: category.name })
      .from(product)
      .leftJoin(
        category,
        and(eq(category.id, product.categoryId), eq(category.orgId, orgId))
      )
      .where(and(eq(product.id, id), eq(product.orgId, orgId)))
      .limit(1),
    db
      .select()
      .from(branch)
      .where(and(eq(branch.organizationId, orgId), branchScope))
      .orderBy(desc(branch.isMain), branch.name),
    db
      .select()
      .from(inventoryBalance)
      .where(
        and(
          eq(inventoryBalance.productId, id),
          eq(inventoryBalance.orgId, orgId),
          balanceBranchScope
        )
      ),
    db
      .select({ units: sql<number>`coalesce(sum(${saleItem.quantity}), 0)` })
      .from(saleItem)
      .innerJoin(sale, eq(sale.id, saleItem.saleId))
      .where(
        and(
          eq(saleItem.productId, id),
          eq(saleItem.orgId, orgId),
          eq(sale.orgId, orgId),
          eq(sale.status, 'completed'),
          gte(sale.createdAt, since),
          saleBranchScope
        )
      ),
    db
      .select({ value: sql<number>`count(*)` })
      .from(stockMovement)
      .where(movementWhere),
    db
      .selectDistinct({ type: stockMovement.type })
      .from(stockMovement)
      .where(
        and(
          eq(stockMovement.productId, id),
          eq(stockMovement.orgId, orgId),
          movementBranchScope
        )
      )
      .orderBy(stockMovement.type),
  ]);
  if (!item) return null;
  const totalMovements = Number(movementTotal?.value ?? 0);
  const pageCount = Math.max(1, Math.ceil(totalMovements / filters.pageSize));
  const page = Math.min(filters.page, pageCount);
  const movements = await db
    .select()
    .from(stockMovement)
    .where(movementWhere)
    .orderBy(desc(stockMovement.createdAt), desc(stockMovement.id))
    .limit(filters.pageSize)
    .offset((page - 1) * filters.pageSize);
  return {
    product: item.product,
    categoryName: item.categoryName,
    locations,
    balances,
    movements,
    movementTypes: movementTypeRows.map((row) => row.type),
    movementPagination: {
      page,
      pageSize: filters.pageSize,
      pageCount,
      total: totalMovements,
    },
    demand30Days: Number(demand?.units ?? 0),
    canReceive: authorization.permissions.includes(
      PermissionEnum.INVENTORY_RECEIVE
    ),
    canEditProduct: authorization.permissions.includes(
      PermissionEnum.PRODUCT_EDIT
    ),
  };
}

export async function startStockCountSession(
  input: z.input<typeof startCountSessionSchema>
) {
  const data = startCountSessionSchema.parse(input);
  const { userId, orgId, authorization } = await inventoryContext(
    PermissionEnum.INVENTORY_COUNT_START
  );
  if (
    !authorization.isOrganizationWide &&
    !authorization.branchIds.includes(data.branchId)
  )
    throw new Error('You do not have access to this inventory location');
  const [[location], products, balances] = await Promise.all([
    db
      .select({ id: branch.id, name: branch.name })
      .from(branch)
      .where(
        and(eq(branch.id, data.branchId), eq(branch.organizationId, orgId))
      )
      .limit(1),
    db
      .select()
      .from(product)
      .where(and(eq(product.orgId, orgId), eq(product.isActive, true)))
      .orderBy(product.name),
    db
      .select()
      .from(inventoryBalance)
      .where(
        and(
          eq(inventoryBalance.orgId, orgId),
          eq(inventoryBalance.branchId, data.branchId)
        )
      ),
  ]);
  if (!location) throw new Error('Inventory location not found');
  if (!products.length)
    throw new Error('There are no active products to count');
  const balancesByProduct = new Map(
    balances.map((item) => [item.productId, Number(item.onHand)])
  );
  const sessionId = generateId();
  const countNo = `COUNT-${Date.now().toString().slice(-8)}`;
  const startedAt = new Date();
  await db.transaction(async (tx) => {
    await tx.insert(stockAdjustment).values({
      id: sessionId,
      adjustmentNo: countNo,
      type: 'stocktake',
      status: 'in_progress',
      countName: data.name,
      countMode: data.countMode,
      blindCount: data.blindCount,
      assignedTo: userId,
      startedAt,
      notes: data.notes || null,
      branchId: data.branchId,
      userId,
      orgId,
    });
    await tx.insert(stockAdjustmentItem).values(
      products.map((item) => {
        const expected = balancesByProduct.get(item.id) ?? 0;
        return {
          id: generateId(),
          adjustmentId: sessionId,
          productId: item.id,
          productName: item.name,
          quantityBefore: expected,
          quantityAfter: expected,
          variance: 0,
          orgId,
        };
      })
    );
    await tx.insert(auditEvent).values({
      id: generateId(),
      organizationId: orgId,
      userId,
      action: 'inventory.count_session_started',
      metadata: {
        sessionId,
        countNo,
        name: data.name,
        branchId: data.branchId,
        products: products.length,
        blindCount: data.blindCount,
      },
    });
  });
  revalidatePath('/dashboard/inventory');
  return { sessionId, countNo };
}

export async function saveStockCountLine(
  input: z.input<typeof saveCountLineSchema>
) {
  const data = saveCountLineSchema.parse(input);
  const { userId, orgId, authorization } = await inventoryContext(
    PermissionEnum.INVENTORY_COUNT_SUBMIT
  );
  const [session] = await db
    .select()
    .from(stockAdjustment)
    .where(
      and(
        eq(stockAdjustment.id, data.sessionId),
        eq(stockAdjustment.orgId, orgId),
        eq(stockAdjustment.type, 'stocktake')
      )
    )
    .limit(1);
  if (!session) throw new Error('Stock count session not found');
  if (!['draft', 'in_progress'].includes(session.status))
    throw new Error('This count session is no longer editable');
  if (
    session.branchId &&
    !authorization.isOrganizationWide &&
    !authorization.branchIds.includes(session.branchId)
  )
    throw new Error('You do not have access to this inventory location');
  if (
    session.assignedTo &&
    session.assignedTo !== userId &&
    !authorization.permissions.includes(PermissionEnum.INVENTORY_COUNT_APPROVE)
  )
    throw new Error('This stock count is assigned to another staff member');
  const [line] = await db
    .select()
    .from(stockAdjustmentItem)
    .where(
      and(
        eq(stockAdjustmentItem.adjustmentId, session.id),
        eq(stockAdjustmentItem.productId, data.productId),
        eq(stockAdjustmentItem.orgId, orgId)
      )
    )
    .limit(1);
  if (!line) throw new Error('Count line not found');
  await db
    .update(stockAdjustmentItem)
    .set({
      quantityAfter: data.physicalQuantity,
      variance: stockVariance(line.quantityBefore, data.physicalQuantity),
      countedAt: new Date(),
      countedBy: userId,
      notes: data.notes || null,
    })
    .where(eq(stockAdjustmentItem.id, line.id));
  revalidatePath(`/dashboard/inventory/counts/${session.id}`);
  return { saved: true };
}

export async function submitStockCountSession(sessionId: string) {
  const id = z.string().min(1).parse(sessionId);
  const { userId, orgId } = await inventoryContext(
    PermissionEnum.INVENTORY_COUNT_SUBMIT
  );
  const [session] = await db
    .select()
    .from(stockAdjustment)
    .where(
      and(
        eq(stockAdjustment.id, id),
        eq(stockAdjustment.orgId, orgId),
        eq(stockAdjustment.type, 'stocktake')
      )
    )
    .limit(1);
  if (!session) throw new Error('Stock count session not found');
  if (!['draft', 'in_progress'].includes(session.status))
    throw new Error('This count session has already been submitted');
  if (session.assignedTo && session.assignedTo !== userId)
    throw new Error('Only the assigned counter can submit this session');
  const [progress] = await db
    .select({
      total: sql<number>`count(*)`,
      counted: sql<number>`count(${stockAdjustmentItem.countedAt})`,
    })
    .from(stockAdjustmentItem)
    .where(
      and(
        eq(stockAdjustmentItem.adjustmentId, id),
        eq(stockAdjustmentItem.orgId, orgId)
      )
    );
  if (Number(progress?.counted ?? 0) !== Number(progress?.total ?? 0))
    throw new Error('Count every product before submitting this session');
  const [submitted] = await db
    .update(stockAdjustment)
    .set({ status: 'submitted', submittedAt: new Date() })
    .where(
      and(
        eq(stockAdjustment.id, id),
        eq(stockAdjustment.orgId, orgId),
        inArray(stockAdjustment.status, ['draft', 'in_progress'])
      )
    )
    .returning({ id: stockAdjustment.id });
  if (!submitted)
    throw new Error('This session changed; refresh and try again');
  await db.insert(auditEvent).values({
    id: generateId(),
    organizationId: orgId,
    userId,
    action: 'inventory.count_session_submitted',
    metadata: { sessionId: id, items: Number(progress?.total ?? 0) },
  });
  revalidatePath('/dashboard/inventory');
  revalidatePath(`/dashboard/inventory/counts/${id}`);
  return { status: 'submitted' as const };
}

export async function getStockCountSessionDetails(
  sessionId: string,
  input: z.input<typeof countSessionPageSchema> = {}
) {
  const id = z.string().min(1).parse(sessionId);
  const filters = countSessionPageSchema.parse(input);
  const { userId, orgId, authorization } = await inventoryContext(
    PermissionEnum.INVENTORY_VIEW
  );
  const [session] = await db
    .select()
    .from(stockAdjustment)
    .where(
      and(
        eq(stockAdjustment.id, id),
        eq(stockAdjustment.orgId, orgId),
        eq(stockAdjustment.type, 'stocktake')
      )
    )
    .limit(1);
  if (!session) return null;
  if (
    session.branchId &&
    !authorization.isOrganizationWide &&
    !authorization.branchIds.includes(session.branchId)
  )
    throw new Error('You do not have access to this inventory location');
  const itemWhere = and(
    eq(stockAdjustmentItem.adjustmentId, id),
    eq(stockAdjustmentItem.orgId, orgId),
    filters.search
      ? or(
          ilike(stockAdjustmentItem.productName, `%${filters.search}%`),
          ilike(product.sku, `%${filters.search}%`),
          ilike(product.barcode, `%${filters.search}%`)
        )
      : undefined
  );
  const [[location], [totals], [filteredTotal]] = await Promise.all([
    session.branchId
      ? db
          .select({ id: branch.id, name: branch.name })
          .from(branch)
          .where(
            and(
              eq(branch.id, session.branchId),
              eq(branch.organizationId, orgId)
            )
          )
          .limit(1)
      : Promise.resolve([]),
    db
      .select({
        total: sql<number>`count(*)`,
        counted: sql<number>`count(${stockAdjustmentItem.countedAt})`,
        variance: sql<number>`coalesce(sum(${stockAdjustmentItem.variance}), 0)`,
      })
      .from(stockAdjustmentItem)
      .where(
        and(
          eq(stockAdjustmentItem.adjustmentId, id),
          eq(stockAdjustmentItem.orgId, orgId)
        )
      ),
    db
      .select({ value: sql<number>`count(*)` })
      .from(stockAdjustmentItem)
      .innerJoin(product, eq(product.id, stockAdjustmentItem.productId))
      .where(itemWhere),
  ]);
  const total = Number(filteredTotal?.value ?? 0);
  const pageCount = Math.max(1, Math.ceil(total / filters.pageSize));
  const page = Math.min(filters.page, pageCount);
  const items = await db
    .select({ item: stockAdjustmentItem, product })
    .from(stockAdjustmentItem)
    .innerJoin(product, eq(product.id, stockAdjustmentItem.productId))
    .where(itemWhere)
    .orderBy(stockAdjustmentItem.productName)
    .limit(filters.pageSize)
    .offset((page - 1) * filters.pageSize);
  return {
    session,
    location: location ?? null,
    items,
    progress: {
      total: Number(totals?.total ?? 0),
      counted: Number(totals?.counted ?? 0),
      variance: Number(totals?.variance ?? 0),
    },
    pagination: { page, pageSize: filters.pageSize, pageCount, total },
    canEdit:
      ['draft', 'in_progress'].includes(session.status) &&
      (session.assignedTo === userId ||
        authorization.permissions.includes(
          PermissionEnum.INVENTORY_COUNT_APPROVE
        )),
    canApprove:
      authorization.permissions.includes(
        PermissionEnum.INVENTORY_COUNT_APPROVE
      ) && session.userId !== userId,
    canExport: authorization.permissions.includes(
      PermissionEnum.INVENTORY_EXPORT
    ),
  };
}

export async function exportStockCountSessionCsv(sessionId: string) {
  const id = z.string().min(1).parse(sessionId);
  const { orgId } = await inventoryContext(PermissionEnum.INVENTORY_EXPORT);
  const [session] = await db
    .select()
    .from(stockAdjustment)
    .where(
      and(
        eq(stockAdjustment.id, id),
        eq(stockAdjustment.orgId, orgId),
        eq(stockAdjustment.type, 'stocktake')
      )
    )
    .limit(1);
  if (!session) throw new Error('Stock count session not found');
  const rows = await db
    .select({ item: stockAdjustmentItem, product })
    .from(stockAdjustmentItem)
    .innerJoin(product, eq(product.id, stockAdjustmentItem.productId))
    .where(
      and(
        eq(stockAdjustmentItem.adjustmentId, id),
        eq(stockAdjustmentItem.orgId, orgId)
      )
    )
    .orderBy(stockAdjustmentItem.productName);
  const cell = (value: unknown) =>
    `"${String(value ?? '').replaceAll('"', '""')}"`;
  const header = [
    'Count reference',
    'Product',
    'SKU',
    'Barcode',
    'Expected',
    'Physical',
    'Variance',
    'Unit cost',
    'Variance value',
    'Counted at',
    'Notes',
  ];
  const lines = rows.map(({ item, product: itemProduct }) =>
    [
      session.adjustmentNo,
      item.productName,
      itemProduct.sku,
      itemProduct.barcode,
      item.quantityBefore,
      item.countedAt ? item.quantityAfter : '',
      item.countedAt ? item.variance : '',
      itemProduct.buyingPrice,
      item.countedAt ? item.variance * Number(itemProduct.buyingPrice) : '',
      item.countedAt?.toISOString() ?? '',
      item.notes,
    ]
      .map(cell)
      .join(',')
  );
  return {
    filename: `${session.adjustmentNo.toLowerCase()}-results.csv`,
    csv: [header.map(cell).join(','), ...lines].join('\n'),
  };
}

export async function getStockCountSessions(
  input: z.input<typeof countSessionListSchema> = {}
) {
  const filters = countSessionListSchema.parse(input);
  const { orgId, authorization } = await inventoryContext(
    PermissionEnum.INVENTORY_VIEW
  );
  const allowedBranchIds = authorization.branchIds.length
    ? authorization.branchIds
    : [''];
  if (
    filters.branchId &&
    !authorization.isOrganizationWide &&
    !allowedBranchIds.includes(filters.branchId)
  )
    throw new Error('You do not have access to this inventory location');
  const where = and(
    eq(stockAdjustment.orgId, orgId),
    eq(stockAdjustment.type, 'stocktake'),
    filters.status ? eq(stockAdjustment.status, filters.status) : undefined,
    filters.branchId
      ? eq(stockAdjustment.branchId, filters.branchId)
      : authorization.isOrganizationWide
        ? undefined
        : inArray(stockAdjustment.branchId, allowedBranchIds)
  );
  const [[totalRow], branches] = await Promise.all([
    db
      .select({ value: sql<number>`count(*)` })
      .from(stockAdjustment)
      .where(where),
    db
      .select()
      .from(branch)
      .where(
        and(
          eq(branch.organizationId, orgId),
          authorization.isOrganizationWide
            ? undefined
            : inArray(branch.id, allowedBranchIds)
        )
      )
      .orderBy(desc(branch.isMain), branch.name),
  ]);
  const total = Number(totalRow?.value ?? 0);
  const pageCount = Math.max(1, Math.ceil(total / filters.pageSize));
  const page = Math.min(filters.page, pageCount);
  const sessions = await db
    .select()
    .from(stockAdjustment)
    .where(where)
    .orderBy(desc(stockAdjustment.createdAt), desc(stockAdjustment.id))
    .limit(filters.pageSize)
    .offset((page - 1) * filters.pageSize);
  const ids = sessions.map((session) => session.id);
  const progressRows = ids.length
    ? await db
        .select({
          sessionId: stockAdjustmentItem.adjustmentId,
          total: sql<number>`count(*)`,
          counted: sql<number>`count(${stockAdjustmentItem.countedAt})`,
          variance: sql<number>`coalesce(sum(${stockAdjustmentItem.variance}), 0)`,
        })
        .from(stockAdjustmentItem)
        .where(
          and(
            eq(stockAdjustmentItem.orgId, orgId),
            inArray(stockAdjustmentItem.adjustmentId, ids)
          )
        )
        .groupBy(stockAdjustmentItem.adjustmentId)
    : [];
  return {
    sessions,
    progress: Object.fromEntries(
      progressRows.map((row) => [
        row.sessionId,
        {
          total: Number(row.total),
          counted: Number(row.counted),
          variance: Number(row.variance),
        },
      ])
    ),
    branches,
    pagination: { page, pageSize: filters.pageSize, pageCount, total },
    canStart: authorization.permissions.includes(
      PermissionEnum.INVENTORY_COUNT_START
    ),
  };
}

export async function createStockAdjustment(
  input: z.input<typeof adjustmentSchema>
) {
  const data = adjustmentSchema.parse(input);
  const authorization = await requirePermission(
    data.type === 'stocktake'
      ? PermissionEnum.INVENTORY_COUNT_SUBMIT
      : PermissionEnum.INVENTORY_ADJUST_SUBMIT
  );
  const { userId, organizationId: orgId } = authorization;
  if (
    !authorization.isOrganizationWide &&
    !authorization.branchIds.includes(data.branchId)
  )
    throw new Error('You do not have access to this inventory location');
  const uniqueProductIds = new Set(data.items.map((item) => item.productId));
  if (uniqueProductIds.size !== data.items.length)
    throw new Error('Each product can only appear once in a stock count');

  const [products, balances, locations] = await Promise.all([
    db
      .select()
      .from(product)
      .where(
        and(
          eq(product.orgId, orgId),
          inArray(product.id, [...uniqueProductIds])
        )
      ),
    db
      .select()
      .from(inventoryBalance)
      .where(
        and(
          eq(inventoryBalance.orgId, orgId),
          eq(inventoryBalance.branchId, data.branchId),
          inArray(inventoryBalance.productId, [...uniqueProductIds])
        )
      ),
    db
      .select({ id: branch.id })
      .from(branch)
      .where(
        and(eq(branch.id, data.branchId), eq(branch.organizationId, orgId))
      )
      .limit(1),
  ]);
  if (!locations[0]) throw new Error('Inventory location not found');
  if (products.length !== data.items.length)
    throw new Error('One or more products were not found');
  const productsById = new Map(products.map((item) => [item.id, item]));
  const balanceByProduct = new Map(
    balances.map((item) => [item.productId, Number(item.onHand)])
  );
  const adjustmentId = generateId();
  const adjustmentNo = `ADJ-${Date.now().toString().slice(-8)}`;

  await db.transaction(async (tx) => {
    await tx.insert(stockAdjustment).values({
      id: adjustmentId,
      adjustmentNo,
      type: data.type,
      status: 'pending',
      notes: data.notes,
      branchId: data.branchId,
      submittedAt: new Date(),
      userId,
      orgId,
    });
    await tx.insert(stockAdjustmentItem).values(
      data.items.map((item) => {
        const current = productsById.get(item.productId)!;
        return {
          id: generateId(),
          adjustmentId,
          productId: current.id,
          productName: current.name,
          quantityBefore: balanceByProduct.get(current.id) ?? 0,
          quantityAfter: item.quantityAfter,
          variance: stockVariance(
            balanceByProduct.get(current.id) ?? 0,
            item.quantityAfter
          ),
          orgId,
        };
      })
    );
    await tx.insert(auditEvent).values({
      id: generateId(),
      organizationId: orgId,
      userId,
      action: 'stock_adjustment_created',
      metadata: {
        adjustmentId,
        adjustmentNo,
        type: data.type,
        itemsCount: data.items.length,
      },
    });
  });
  revalidatePath('/dashboard/inventory');
  return { adjustmentId, adjustmentNo, status: 'pending' as const };
}

export async function approveStockAdjustment(adjustmentId: string) {
  const id = z.string().min(1).parse(adjustmentId);
  const { userId, orgId, authorization } = await inventoryContext(
    PermissionEnum.INVENTORY_VIEW
  );
  const [adjustment] = await db
    .select()
    .from(stockAdjustment)
    .where(and(eq(stockAdjustment.id, id), eq(stockAdjustment.orgId, orgId)))
    .limit(1);
  if (!adjustment) throw new Error('Stock count not found');
  const approvalPermission =
    adjustment.type === 'stocktake'
      ? PermissionEnum.INVENTORY_COUNT_APPROVE
      : PermissionEnum.INVENTORY_ADJUST_APPROVE;
  if (!authorization.permissions.includes(approvalPermission))
    throw new Error('You do not have permission to approve this request');
  if (adjustment.userId === userId)
    throw new Error('You cannot approve your own stock adjustment');
  if (
    adjustment.branchId &&
    !authorization.isOrganizationWide &&
    !authorization.branchIds.includes(adjustment.branchId)
  )
    throw new Error('You do not have access to this inventory location');
  if (!['pending', 'submitted', 'under_review'].includes(adjustment.status))
    throw new Error(`This stock count is already ${adjustment.status}`);

  await db.transaction(async (tx) => {
    const [claimed] = await tx
      .update(stockAdjustment)
      .set({ status: 'under_review', approvedBy: userId })
      .where(
        and(
          eq(stockAdjustment.id, id),
          eq(stockAdjustment.orgId, orgId),
          inArray(stockAdjustment.status, [
            'pending',
            'submitted',
            'under_review',
          ])
        )
      )
      .returning({ id: stockAdjustment.id });
    if (!claimed) throw new Error('This stock count has already been reviewed');
    const items = await tx
      .select()
      .from(stockAdjustmentItem)
      .where(
        and(
          eq(stockAdjustmentItem.adjustmentId, id),
          eq(stockAdjustmentItem.orgId, orgId)
        )
      );
    if (!items.length) throw new Error('This stock count has no items');
    const [fallbackBranch] = adjustment.branchId
      ? [{ id: adjustment.branchId }]
      : await tx
          .select({ id: branch.id })
          .from(branch)
          .where(eq(branch.organizationId, orgId))
          .orderBy(desc(branch.isMain), branch.createdAt)
          .limit(1);
    if (!fallbackBranch) throw new Error('Inventory location not found');

    for (const item of items) {
      // Apply the variance captured when the physical count was submitted.
      // This preserves sales and receipts that may happen while approval is pending.
      const variance = item.variance;
      if (variance)
        await applyInventoryMovement(tx, {
          productId: item.productId,
          productName: item.productName,
          branchId: fallbackBranch.id,
          quantity: variance,
          type:
            adjustment.type === 'stocktake'
              ? 'count_adjustment'
              : adjustment.type === 'breakage'
                ? 'breakage'
                : adjustment.type === 'damage'
                  ? 'damage'
                  : ['missing', 'theft_loss'].includes(adjustment.type)
                    ? 'loss'
                    : 'manual_adjustment',
          referenceType: 'adjustment',
          referenceId: id,
          reason: adjustment.notes || `Approved ${adjustment.type}`,
          userId,
          orgId,
        });
    }
    await tx.insert(auditEvent).values({
      id: generateId(),
      organizationId: orgId,
      userId,
      action: 'stock_adjustment_approved',
      metadata: { adjustmentId: id, itemsCount: items.length },
    });
    await tx
      .update(stockAdjustment)
      .set({
        status: 'completed',
        approvedBy: userId,
        approvedAt: new Date(),
        completedAt: new Date(),
      })
      .where(and(eq(stockAdjustment.id, id), eq(stockAdjustment.orgId, orgId)));
  });
  await refreshInventory(orgId);
  return { status: 'approved' as const };
}

export async function rejectStockAdjustment(
  adjustmentId: string,
  reason: string
) {
  const id = z.string().min(1).parse(adjustmentId);
  const rejectionReason = z.string().trim().min(3).max(300).parse(reason);
  const { userId, orgId, authorization } = await inventoryContext(
    PermissionEnum.INVENTORY_VIEW
  );
  const [adjustment] = await db
    .select({ userId: stockAdjustment.userId, type: stockAdjustment.type })
    .from(stockAdjustment)
    .where(and(eq(stockAdjustment.id, id), eq(stockAdjustment.orgId, orgId)))
    .limit(1);
  if (!adjustment) throw new Error('Stock count not found');
  const approvalPermission =
    adjustment.type === 'stocktake'
      ? PermissionEnum.INVENTORY_COUNT_APPROVE
      : PermissionEnum.INVENTORY_ADJUST_APPROVE;
  if (!authorization.permissions.includes(approvalPermission))
    throw new Error('You do not have permission to reject this request');
  if (adjustment.userId === userId)
    throw new Error('You cannot reject your own stock adjustment');
  const [rejected] = await db
    .update(stockAdjustment)
    .set({
      status: 'rejected',
      notes: `Rejected: ${rejectionReason}`,
      approvedBy: userId,
      approvedAt: new Date(),
    })
    .where(
      and(
        eq(stockAdjustment.id, id),
        eq(stockAdjustment.orgId, orgId),
        inArray(stockAdjustment.status, [
          'pending',
          'submitted',
          'under_review',
        ])
      )
    )
    .returning({ id: stockAdjustment.id });
  if (!rejected)
    throw new Error(
      'This stock count is unavailable or has already been reviewed'
    );
  await db.insert(auditEvent).values({
    id: generateId(),
    organizationId: orgId,
    userId,
    action: 'stock_adjustment_rejected',
    metadata: { adjustmentId: id, reason: rejectionReason },
  });
  revalidatePath('/dashboard/inventory');
  return { status: 'rejected' as const };
}

export async function updateReorderLevel(input: z.input<typeof reorderSchema>) {
  const data = reorderSchema.parse(input);
  const { userId, orgId, authorization } = await inventoryContext(
    PermissionEnum.INVENTORY_ADJUST
  );
  if (
    !authorization.isOrganizationWide &&
    !authorization.branchIds.includes(data.branchId)
  )
    throw new Error('You do not have access to this inventory location');
  const [updated] = await db
    .update(product)
    .set({ minStock: data.minStock, updatedAt: new Date() })
    .where(
      and(
        eq(product.id, data.productId),
        eq(product.orgId, orgId),
        eq(product.isActive, true)
      )
    )
    .returning({ id: product.id, name: product.name });
  if (!updated) throw new Error('Product not found');
  await db
    .update(inventoryBalance)
    .set({ reorderPoint: String(data.minStock), updatedAt: new Date() })
    .where(
      and(
        eq(inventoryBalance.productId, data.productId),
        eq(inventoryBalance.branchId, data.branchId),
        eq(inventoryBalance.orgId, orgId)
      )
    );
  await db.insert(auditEvent).values({
    id: generateId(),
    organizationId: orgId,
    userId,
    action: 'inventory.reorder_level_updated',
    metadata: {
      productId: updated.id,
      productName: updated.name,
      minStock: data.minStock,
    },
  });
  await refreshInventory(orgId);
}
