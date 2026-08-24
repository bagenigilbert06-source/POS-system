'use server';

import { revalidatePath } from 'next/cache';
import { and, desc, eq, gte, inArray, isNull, lt, sql } from 'drizzle-orm';
import Decimal from 'decimal.js';
import { z } from 'zod';
import { db } from '@/lib/db';
import {
  auditEvent,
  branch,
  businessSettings,
  cashMovement,
  inventoryBalance,
  inventoryLoss,
  mpesaPaymentRequest,
  offlineSaleSync,
  posSession,
  posTerminal,
  product,
  sale,
  saleItem,
  salesReturn,
  salesReturnItem,
  stockMovement,
  user,
} from '@/lib/db/schema';
import { generateId } from '@/lib/utils';
import {
  getAuthorizationContext,
  requirePermission,
} from '@/lib/auth/authorization';
import { PermissionEnum } from '@/lib/types/permissions';
import { getPosAuthorizationContext } from '@/lib/pos/pos-auth';
import { invalidateProductReadCache } from '@/lib/cache/redis-cache';
import { applyInventoryMovement } from '@/lib/inventory/inventory-service';

async function posOperator(permission: PermissionEnum) {
  const pos = await getPosAuthorizationContext();
  if (pos) {
    if (!pos.permissions.includes(permission))
      throw new Error('Permission denied');
    return {
      userId: pos.userId,
      orgId: pos.organizationId,
      permissions: pos.permissions,
      branchIds: [pos.branchId],
      isOrganizationWide: false,
      terminalId: pos.terminalId,
    };
  }
  const full = await requirePermission(permission);
  return {
    userId: full.userId,
    orgId: full.organizationId,
    permissions: full.permissions,
    branchIds: full.branchIds,
    isOrganizationWide: full.isOrganizationWide,
    terminalId: null,
  };
}
const refresh = () =>
  [
    '/dashboard',
    '/dashboard/pos',
    '/dashboard/pos/history',
    '/dashboard/operations',
    '/dashboard/inventory',
    '/dashboard/sales',
    '/dashboard/reports',
  ].forEach((path) => revalidatePath(path));

function localDateParts(date: Date, timeZone: string) {
  const values = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(values.find((value) => value.type === type)?.value ?? 0);
  return {
    year: part('year'),
    month: part('month'),
    day: part('day'),
    hour: part('hour'),
    minute: part('minute'),
    second: part('second'),
  };
}

function zonedMidnight(
  year: number,
  month: number,
  day: number,
  timeZone: string
) {
  const desired = Date.UTC(year, month - 1, day);
  let candidate = desired;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const actual = localDateParts(new Date(candidate), timeZone);
    candidate +=
      desired -
      Date.UTC(
        actual.year,
        actual.month - 1,
        actual.day,
        actual.hour,
        actual.minute,
        actual.second
      );
  }
  return new Date(candidate);
}

export async function getOperationsData(timeZone = 'Africa/Nairobi') {
  const authorization = await requirePermission(PermissionEnum.SHIFT_MANAGE);
  const orgId = authorization.organizationId;
  let safeTimeZone = timeZone;
  try {
    new Intl.DateTimeFormat('en', { timeZone: safeTimeZone }).format();
  } catch {
    safeTimeZone = 'Africa/Nairobi';
  }
  const currentDate = localDateParts(new Date(), safeTimeZone);
  const nextDate = new Date(
    Date.UTC(currentDate.year, currentDate.month - 1, currentDate.day + 1)
  );
  const today = zonedMidnight(
    currentDate.year,
    currentDate.month,
    currentDate.day,
    safeTimeZone
  );
  const tomorrow = zonedMidnight(
    nextDate.getUTCFullYear(),
    nextDate.getUTCMonth() + 1,
    nextDate.getUTCDate(),
    safeTimeZone
  );

  const sessionBranchScope = authorization.isOrganizationWide
    ? undefined
    : authorization.branchIds.length
      ? inArray(posSession.branchId, authorization.branchIds)
      : sql`false`;
  const saleBranchScope = authorization.isOrganizationWide
    ? undefined
    : authorization.branchIds.length
      ? inArray(sale.branchId, authorization.branchIds)
      : sql`false`;
  const lossBranchScope = authorization.isOrganizationWide
    ? undefined
    : authorization.branchIds.length
      ? inArray(inventoryLoss.branchId, authorization.branchIds)
      : sql`false`;
  const scopedSaleIds = db
    .select({ id: sale.id })
    .from(sale)
    .where(and(eq(sale.orgId, orgId), saleBranchScope));
  const [
    sessions,
    openSessions,
    returns,
    losses,
    products,
    sales,
    [salesToday],
    [refundsToday],
    [lossesToday],
    [varianceToday],
    [settings],
    pendingPayments,
    recentCashMovements,
  ] = await Promise.all([
    db
      .select()
      .from(posSession)
      .where(and(eq(posSession.orgId, orgId), sessionBranchScope))
      .orderBy(desc(posSession.openedAt))
      .limit(30),
    db
      .select()
      .from(posSession)
      .where(
        and(
          eq(posSession.orgId, orgId),
          sessionBranchScope,
          inArray(posSession.status, ['open', 'closing'])
        )
      )
      .orderBy(desc(posSession.openedAt))
      .limit(100),
    db
      .select()
      .from(salesReturn)
      .where(
        and(
          eq(salesReturn.orgId, orgId),
          authorization.isOrganizationWide
            ? undefined
            : inArray(salesReturn.saleId, scopedSaleIds)
        )
      )
      .orderBy(desc(salesReturn.createdAt))
      .limit(50),
    db
      .select()
      .from(inventoryLoss)
      .where(and(eq(inventoryLoss.orgId, orgId), lossBranchScope))
      .orderBy(desc(inventoryLoss.createdAt))
      .limit(50),
    db
      .select()
      .from(product)
      .where(and(eq(product.orgId, orgId), eq(product.isActive, true)))
      .orderBy(product.name),
    db
      .select()
      .from(sale)
      .where(
        and(
          eq(sale.orgId, orgId),
          saleBranchScope,
          eq(sale.status, 'completed')
        )
      )
      .orderBy(desc(sale.createdAt))
      .limit(100),
    db
      .select({
        total: sql<string>`coalesce(sum(${sale.total}), 0)`,
        count: sql<number>`count(*)`,
      })
      .from(sale)
      .where(
        and(
          eq(sale.orgId, orgId),
          saleBranchScope,
          eq(sale.status, 'completed'),
          gte(sale.createdAt, today),
          lt(sale.createdAt, tomorrow)
        )
      ),
    db
      .select({
        total: sql<string>`coalesce(sum(${salesReturn.amount}), 0)`,
        count: sql<number>`count(*)`,
      })
      .from(salesReturn)
      .where(
        and(
          eq(salesReturn.orgId, orgId),
          authorization.isOrganizationWide
            ? undefined
            : inArray(salesReturn.saleId, scopedSaleIds),
          eq(salesReturn.status, 'completed'),
          gte(salesReturn.createdAt, today),
          lt(salesReturn.createdAt, tomorrow)
        )
      ),
    db
      .select({
        totalCost: sql<string>`coalesce(sum(${inventoryLoss.totalCost}), 0)`,
        quantity: sql<number>`coalesce(sum(${inventoryLoss.quantity}), 0)`,
        count: sql<number>`count(*)`,
      })
      .from(inventoryLoss)
      .where(
        and(
          eq(inventoryLoss.orgId, orgId),
          lossBranchScope,
          gte(inventoryLoss.createdAt, today),
          lt(inventoryLoss.createdAt, tomorrow)
        )
      ),
    db
      .select({
        total: sql<string>`coalesce(sum(${posSession.variance}), 0)`,
        count: sql<number>`count(*) filter (where abs(coalesce(${posSession.variance}, 0)) > 0)`,
      })
      .from(posSession)
      .where(
        and(
          eq(posSession.orgId, orgId),
          sessionBranchScope,
          eq(posSession.status, 'closed'),
          gte(posSession.closedAt, today),
          lt(posSession.closedAt, tomorrow)
        )
      ),
    db
      .select({ cashVarianceTolerance: businessSettings.cashVarianceTolerance })
      .from(businessSettings)
      .where(eq(businessSettings.organizationId, orgId))
      .limit(1),
    db
      .select()
      .from(mpesaPaymentRequest)
      .where(
        and(
          eq(mpesaPaymentRequest.organizationId, orgId),
          inArray(mpesaPaymentRequest.status, [
            'SENDING_STK',
            'AWAITING_CUSTOMER',
            'AWAITING_CONFIRMATION',
            'CONFIRMED',
          ]),
          isNull(mpesaPaymentRequest.saleId)
        )
      )
      .orderBy(desc(mpesaPaymentRequest.createdAt))
      .limit(20),
    db
      .select()
      .from(cashMovement)
      .where(
        and(
          eq(cashMovement.orgId, orgId),
          authorization.isOrganizationWide
            ? undefined
            : authorization.branchIds.length
              ? inArray(cashMovement.branchId, authorization.branchIds)
              : sql`false`
        )
      )
      .orderBy(desc(cashMovement.createdAt))
      .limit(50),
  ]);
  const sessionIds = sessions.map((record) => record.id);
  const actorIds = [
    ...new Set(
      [
        ...sessions.flatMap((record) => [record.openedBy, record.closedBy]),
        ...returns.map((record) => record.userId),
        ...losses.map((record) => record.userId),
        ...recentCashMovements.map((record) => record.userId),
      ].filter((id): id is string => Boolean(id))
    ),
  ];
  const [cashiers, locations, returnLocations] = await Promise.all([
    actorIds.length
      ? db
          .select({ id: user.id, name: user.name })
          .from(user)
          .where(inArray(user.id, actorIds))
      : [],
    db
      .select({ id: branch.id, name: branch.name })
      .from(branch)
      .where(
        and(
          eq(branch.organizationId, orgId),
          authorization.isOrganizationWide
            ? undefined
            : authorization.branchIds.length
              ? inArray(branch.id, authorization.branchIds)
              : sql`false`
        )
      )
      .orderBy(desc(branch.isMain), branch.name),
    returns.length
      ? db
          .select({ saleId: sale.id, branchId: sale.branchId })
          .from(sale)
          .where(
            and(
              eq(sale.orgId, orgId),
              inArray(
                sale.id,
                returns.map((record) => record.saleId)
              )
            )
          )
      : [],
  ]);
  const [
    terminals,
    sessionSales,
    sessionRefunds,
    sessionMovements,
    sessionAudits,
  ] = sessionIds.length
    ? await Promise.all([
        db
          .select({ id: posTerminal.id, name: posTerminal.name })
          .from(posTerminal)
          .where(
            inArray(
              posTerminal.id,
              sessions
                .map((record) => record.terminalId)
                .filter((id): id is string => Boolean(id))
            )
          ),
        db
          .select({
            sessionId: sale.posSessionId,
            method: sale.paymentMethod,
            total: sql<string>`coalesce(sum(${sale.total}),0)`,
            count: sql<number>`count(*)`,
          })
          .from(sale)
          .where(
            and(
              eq(sale.orgId, orgId),
              inArray(sale.posSessionId, sessionIds),
              inArray(sale.status, [
                'completed',
                'partially_refunded',
                'refunded',
              ])
            )
          )
          .groupBy(sale.posSessionId, sale.paymentMethod),
        db
          .select({
            sessionId: salesReturn.posSessionId,
            method: salesReturn.refundMethod,
            total: sql<string>`coalesce(sum(${salesReturn.amount}),0)`,
            count: sql<number>`count(*)`,
          })
          .from(salesReturn)
          .where(
            and(
              eq(salesReturn.orgId, orgId),
              inArray(salesReturn.posSessionId, sessionIds),
              eq(salesReturn.status, 'completed')
            )
          )
          .groupBy(salesReturn.posSessionId, salesReturn.refundMethod),
        db
          .select({
            sessionId: cashMovement.sessionId,
            type: cashMovement.type,
            total: sql<string>`coalesce(sum(${cashMovement.amount}),0)`,
            count: sql<number>`count(*)`,
          })
          .from(cashMovement)
          .where(
            and(
              eq(cashMovement.orgId, orgId),
              inArray(cashMovement.sessionId, sessionIds)
            )
          )
          .groupBy(cashMovement.sessionId, cashMovement.type),
        db
          .select()
          .from(auditEvent)
          .where(eq(auditEvent.organizationId, orgId))
          .orderBy(desc(auditEvent.createdAt))
          .limit(500),
      ])
    : [[], [], [], [], []];
  const cashierNames = new Map(
    cashiers.map((record) => [record.id, record.name])
  );
  const locationNames = new Map(
    locations.map((record) => [record.id, record.name])
  );
  const terminalNames = new Map(
    terminals.map((record) => [record.id, record.name])
  );
  const returnBranchIds = new Map(
    returnLocations.map((record) => [record.saleId, record.branchId])
  );
  const shiftHistory = sessions.map((record) => ({
    ...record,
    cashierName: cashierNames.get(record.openedBy) ?? record.openedBy,
    terminalName: record.terminalId
      ? (terminalNames.get(record.terminalId) ??
        `Terminal ${record.terminalId.slice(0, 8)}`)
      : 'Legacy / unknown terminal',
    locationName: record.branchId
      ? (locationNames.get(record.branchId) ?? record.branchId)
      : 'Unassigned location',
    sales: sessionSales
      .filter((row) => row.sessionId === record.id)
      .map((row) => ({
        method: row.method,
        total: Number(row.total),
        count: Number(row.count),
      })),
    refunds: sessionRefunds
      .filter((row) => row.sessionId === record.id)
      .map((row) => ({
        method: row.method,
        total: Number(row.total),
        count: Number(row.count),
      })),
    movements: sessionMovements
      .filter((row) => row.sessionId === record.id)
      .map((row) => ({
        type: row.type,
        total: Number(row.total),
        count: Number(row.count),
      })),
    auditEvents: sessionAudits.filter(
      (event) =>
        (event.metadata as { sessionId?: string } | null)?.sessionId ===
        record.id
    ),
  }));
  return {
    sessions,
    openSessions,
    shiftHistory,
    returns: returns.map((record) => ({
      ...record,
      branchId: returnBranchIds.get(record.saleId) ?? null,
    })),
    losses,
    products,
    sales,
    pendingPayments,
    recentCashMovements,
    actorNames: Object.fromEntries(cashierNames),
    locations,
    terminals,
    cashVarianceTolerance: Number(settings?.cashVarianceTolerance ?? 0),
    summary: { salesToday, refundsToday, lossesToday, varianceToday },
  };
}

export async function updateCashVarianceTolerance(value: number) {
  const tolerance = z.coerce
    .number()
    .finite()
    .nonnegative()
    .max(999999999)
    .parse(value);
  const authorization = await requirePermission(PermissionEnum.ADMIN_ACCESS);
  const { organizationId: orgId, userId } = authorization;
  await db.transaction(async (tx) => {
    await tx
      .insert(businessSettings)
      .values({
        organizationId: orgId,
        cashVarianceTolerance: new Decimal(tolerance).toFixed(2),
      })
      .onConflictDoUpdate({
        target: businessSettings.organizationId,
        set: {
          cashVarianceTolerance: new Decimal(tolerance).toFixed(2),
          updatedAt: new Date(),
        },
      });
    await tx.insert(auditEvent).values({
      id: generateId(),
      organizationId: orgId,
      userId,
      action: 'shift.variance_policy_updated',
      metadata: { cashVarianceTolerance: new Decimal(tolerance).toFixed(2) },
    });
  });
  refresh();
  return { cashVarianceTolerance: tolerance };
}

/** Cashier-safe data: no organization-wide sales, financials, or other users' shifts. */
export async function getCashierWorkspace() {
  const pos = await getPosAuthorizationContext(),
    authorization = pos ?? (await requirePermission(PermissionEnum.POS_VIEW));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [[session], [summary], [refundSummary], recentSales] =
    await Promise.all([
      db
        .select()
        .from(posSession)
        .where(
          and(
            eq(posSession.orgId, authorization.organizationId),
            eq(posSession.openedBy, authorization.userId),
            eq(posSession.status, 'open')
          )
        )
        .orderBy(desc(posSession.openedAt))
        .limit(1),
      db
        .select({
          total: sql<string>`coalesce(sum(${sale.total}),0)`,
          count: sql<number>`count(*)`,
        })
        .from(sale)
        .where(
          and(
            eq(sale.orgId, authorization.organizationId),
            eq(sale.userId, authorization.userId),
            inArray(sale.status, [
              'completed',
              'partially_refunded',
              'refunded',
            ]),
            gte(sale.createdAt, today)
          )
        ),
      db
        .select({ total: sql<string>`coalesce(sum(${salesReturn.amount}),0)` })
        .from(salesReturn)
        .where(
          and(
            eq(salesReturn.orgId, authorization.organizationId),
            eq(salesReturn.userId, authorization.userId),
            eq(salesReturn.status, 'completed'),
            gte(salesReturn.createdAt, today)
          )
        ),
      db
        .select({
          id: sale.id,
          receiptNo: sale.receiptNo,
          total: sale.total,
          createdAt: sale.createdAt,
        })
        .from(sale)
        .where(
          and(
            eq(sale.orgId, authorization.organizationId),
            eq(sale.userId, authorization.userId)
          )
        )
        .orderBy(desc(sale.createdAt))
        .limit(5),
    ]);
  return {
    session: session ?? null,
    todaySales: Number(summary.total) - Number(refundSummary.total),
    transactionCount: Number(summary.count),
    recentSales,
  };
}

export async function recordInventoryLoss(input: {
  productId: string;
  branchId?: string;
  quantity: number;
  type: string;
  reason: string;
  note?: string;
}) {
  const data = z
    .object({
      productId: z.string().min(1),
      branchId: z.string().min(1).optional(),
      quantity: z.coerce.number().int().positive(),
      type: z.enum(['damaged', 'expired', 'lost', 'theft', 'count_adjustment']),
      reason: z.string().trim().min(3).max(300),
      note: z.string().trim().max(300).optional(),
    })
    .parse(input);
  const authorization = await requirePermission(
    PermissionEnum.INVENTORY_ADJUST
  );
  const { userId, organizationId: orgId } = authorization;
  await db.transaction(async (tx) => {
    const [item] = await tx
      .select()
      .from(product)
      .where(and(eq(product.id, data.productId), eq(product.orgId, orgId)))
      .limit(1);
    if (
      data.branchId &&
      !authorization.isOrganizationWide &&
      !authorization.branchIds.includes(data.branchId)
    )
      throw new Error(
        'This inventory location is outside your assigned branches'
      );
    const [location] = await tx
      .select({ id: branch.id })
      .from(branch)
      .where(
        and(
          eq(branch.organizationId, orgId),
          data.branchId
            ? eq(branch.id, data.branchId)
            : authorization.isOrganizationWide
              ? undefined
              : eq(branch.id, authorization.branchIds[0] ?? '')
        )
      )
      .orderBy(desc(branch.isMain), branch.createdAt)
      .limit(1);
    if (!item || !location)
      throw new Error('Product or inventory location not found');
    const id = generateId(),
      lossNo = `LOSS-${Date.now().toString().slice(-8)}`;
    const recordedReason = data.note
      ? `${data.reason} · Evidence: ${data.note}`.slice(0, 300)
      : data.reason;
    await tx.insert(inventoryLoss).values({
      id,
      lossNo,
      productId: item.id,
      productName: item.name,
      quantity: data.quantity,
      type: data.type,
      unitCost: item.buyingPrice,
      totalCost: String(Number(item.buyingPrice) * data.quantity),
      reason: recordedReason,
      userId,
      orgId,
      branchId: location.id,
    });
    await applyInventoryMovement(tx, {
      productId: item.id,
      productName: item.name,
      branchId: location.id,
      quantity: -data.quantity,
      type: `loss_${data.type}`,
      referenceType: 'inventory_loss',
      referenceId: id,
      reason: recordedReason,
      userId,
      orgId,
      unitCost: Number(item.buyingPrice),
    });
  });
  await invalidateProductReadCache(orgId);
  refresh();
}

export async function refundSale(input: {
  saleId: string;
  refundMethod: string;
  reason: string;
  disposition: string;
}) {
  const data = z
    .object({
      saleId: z.string().min(1),
      refundMethod: z.enum(['cash', 'mpesa', 'card', 'store_credit']),
      reason: z.string().trim().min(3).max(300),
      disposition: z.enum(['restock', 'damaged']),
    })
    .parse(input);
  const authorization = await requirePermission(PermissionEnum.SALE_REFUND);
  const { userId, organizationId: orgId } = authorization;
  await db.transaction(async (tx) => {
    const [[record], prior, items] = await Promise.all([
      tx
        .select()
        .from(sale)
        .where(and(eq(sale.id, data.saleId), eq(sale.orgId, orgId)))
        .limit(1),
      tx
        .select()
        .from(salesReturn)
        .where(
          and(eq(salesReturn.saleId, data.saleId), eq(salesReturn.orgId, orgId))
        )
        .limit(1),
      tx
        .select()
        .from(saleItem)
        .where(
          and(eq(saleItem.saleId, data.saleId), eq(saleItem.orgId, orgId))
        ),
    ]);
    if (!record?.branchId)
      throw new Error('Sale or inventory location not found');
    if (
      !authorization.isOrganizationWide &&
      !authorization.branchIds.includes(record.branchId)
    )
      throw new Error('This sale is outside your assigned branches');
    if (prior.length) throw new Error('This sale has already been refunded');
    let refundSessionId: string | null = null;
    if (data.refundMethod === 'cash') {
      const [activeShift] = await tx
        .select({ id: posSession.id })
        .from(posSession)
        .where(
          and(
            eq(posSession.orgId, orgId),
            eq(posSession.openedBy, userId),
            eq(posSession.branchId, record.branchId),
            eq(posSession.status, 'open')
          )
        )
        .limit(1)
        .for('update');
      if (!activeShift)
        throw new Error('Open a shift before issuing a cash refund');
      refundSessionId = activeShift.id;
    }
    const returnId = generateId(),
      returnNo = `CN-${Date.now().toString().slice(-8)}`;
    await tx.insert(salesReturn).values({
      id: returnId,
      returnNo,
      saleId: record.id,
      receiptNo: record.receiptNo,
      amount: record.total,
      refundMethod: data.refundMethod,
      reason: data.reason,
      userId,
      orgId,
      posSessionId: refundSessionId,
    });
    for (const line of items) {
      await tx.insert(salesReturnItem).values({
        id: generateId(),
        returnId,
        productId: line.productId,
        productName: line.productName,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        total: line.totalPrice,
        disposition: data.disposition,
        orgId,
      });
      if (data.disposition === 'restock')
        await applyInventoryMovement(tx, {
          productId: line.productId,
          productName: line.productName,
          branchId: record.branchId,
          quantity: line.quantity * line.baseUnitQuantity,
          type: 'sales_return',
          referenceType: 'credit_note',
          referenceId: returnId,
          reason: returnNo,
          userId,
          orgId,
        });
      else {
        const [balance] = await tx
          .select({ onHand: inventoryBalance.onHand })
          .from(inventoryBalance)
          .where(
            and(
              eq(inventoryBalance.productId, line.productId),
              eq(inventoryBalance.branchId, record.branchId),
              eq(inventoryBalance.orgId, orgId)
            )
          )
          .limit(1);
        const current = Number(balance?.onHand ?? 0);
        await tx.insert(stockMovement).values({
          id: generateId(),
          productId: line.productId,
          productName: line.productName,
          branchId: record.branchId,
          type: 'return_unsellable',
          quantity: 0,
          stockBefore: current,
          stockAfter: current,
          referenceType: 'credit_note',
          referenceId: returnId,
          reason: `${returnNo} · ${data.reason} · Not returned to sellable stock`,
          userId,
          orgId,
        });
      }
    }
    await tx.insert(auditEvent).values({
      id: generateId(),
      organizationId: orgId,
      userId,
      action: 'sales.return_completed',
      metadata: {
        returnId,
        returnNo,
        saleId: record.id,
        disposition: data.disposition,
        itemCount: items.length,
        posSessionId: refundSessionId,
      },
    });
    await tx
      .update(sale)
      .set({ status: 'refunded' })
      .where(and(eq(sale.id, record.id), eq(sale.orgId, orgId)));
  });
  await invalidateProductReadCache(orgId);
  refresh();
}

export async function openPosSession(openingCash: number) {
  const amount = z.coerce
    .number()
    .nonnegative()
    .max(999999999)
    .parse(openingCash);
  const authorization = await posOperator(PermissionEnum.SHIFT_OPEN);
  const { userId, orgId, terminalId } = authorization;
  let branchId = authorization.branchIds[0];
  if (!branchId && authorization.isOrganizationWide) {
    const [mainBranch] = await db
      .select({ id: branch.id })
      .from(branch)
      .where(eq(branch.organizationId, orgId))
      .orderBy(desc(branch.isMain), branch.createdAt)
      .limit(1);
    branchId = mainBranch?.id;
  }
  if (!branchId) throw new Error('No assigned branch is available');
  const [existing] = await db
    .select()
    .from(posSession)
    .where(
      and(
        eq(posSession.orgId, orgId),
        inArray(posSession.status, ['open', 'closing']),
        terminalId
          ? eq(posSession.terminalId, terminalId)
          : eq(posSession.openedBy, userId)
      )
    )
    .limit(1);
  if (existing) throw new Error('Close your current register first');
  try {
    const sessionId = generateId();
    await db.insert(posSession).values({
      id: sessionId,
      sessionNo: `REG-${Date.now().toString().slice(-8)}`,
      openingCash: new Decimal(amount).toFixed(2),
      openedBy: userId,
      orgId,
      branchId,
      terminalId,
    });
    await db.insert(auditEvent).values({
      id: generateId(),
      organizationId: orgId,
      userId,
      action: 'shift.opened',
      metadata: { sessionId, branchId, terminalId, openingCash: amount },
    });
  } catch (error) {
    const databaseError = error as { code?: string; cause?: { code?: string } };
    if (databaseError.code === '23505' || databaseError.cause?.code === '23505')
      throw new Error('This cashier already has an open register');
    throw error;
  }
  refresh();
}

function decimalNumber(value: string | number | null | undefined) {
  return new Decimal(value ?? 0);
}

async function calculateReconciliation(
  orgId: string,
  current: typeof posSession.$inferSelect
) {
  const [[settings], salesByPayment, [cashRefunds], movements] =
    await Promise.all([
      db
        .select({ tolerance: businessSettings.cashVarianceTolerance })
        .from(businessSettings)
        .where(eq(businessSettings.organizationId, orgId))
        .limit(1),
      db
        .select({
          method: sale.paymentMethod,
          total: sql<string>`coalesce(sum(${sale.total}), 0)`,
          count: sql<number>`count(*)`,
        })
        .from(sale)
        .where(
          and(
            eq(sale.orgId, orgId),
            eq(sale.posSessionId, current.id),
            inArray(sale.status, [
              'completed',
              'partially_refunded',
              'refunded',
            ])
          )
        )
        .groupBy(sale.paymentMethod),
      db
        .select({ total: sql<string>`coalesce(sum(${salesReturn.amount}), 0)` })
        .from(salesReturn)
        .where(
          and(
            eq(salesReturn.orgId, orgId),
            eq(salesReturn.posSessionId, current.id),
            eq(salesReturn.status, 'completed'),
            eq(salesReturn.refundMethod, 'cash')
          )
        ),
      db
        .select({
          type: cashMovement.type,
          total: sql<string>`coalesce(sum(${cashMovement.amount}), 0)`,
        })
        .from(cashMovement)
        .where(
          and(
            eq(cashMovement.orgId, orgId),
            eq(cashMovement.sessionId, current.id)
          )
        )
        .groupBy(cashMovement.type),
    ]);
  const paymentTotals = Object.fromEntries(
    salesByPayment.map((row) => [
      row.method,
      decimalNumber(row.total).toFixed(2),
    ])
  );
  const movementTotals = Object.fromEntries(
    movements.map((row) => [row.type, decimalNumber(row.total).toFixed(2)])
  );
  const cashSales = decimalNumber(paymentTotals.cash);
  const cashRefundTotal = decimalNumber(cashRefunds.total);
  const cashIn = decimalNumber(movementTotals.cash_in);
  const cashOut = decimalNumber(movementTotals.cash_out);
  const safeDrops = decimalNumber(movementTotals.safe_drop);
  const expected = decimalNumber(current.openingCash)
    .plus(cashSales)
    .plus(cashIn)
    .minus(cashRefundTotal)
    .minus(cashOut)
    .minus(safeDrops);
  const tolerance = decimalNumber(settings?.tolerance);
  return {
    expected,
    tolerance,
    variance: decimalNumber(current.countedCash).minus(expected),
    summary: {
      openingFloat: decimalNumber(current.openingCash).toFixed(2),
      cashSales: cashSales.toFixed(2),
      cashRefunds: cashRefundTotal.toFixed(2),
      cashIn: cashIn.toFixed(2),
      cashOut: cashOut.toFixed(2),
      safeDrops: safeDrops.toFixed(2),
      varianceTolerance: tolerance.toFixed(2),
      paymentTotals,
      transactionCount: salesByPayment.reduce(
        (total, row) => total + Number(row.count),
        0
      ),
    },
  };
}

async function findClosableSession(
  orgId: string,
  userId: string,
  canManage: boolean,
  branchIds: string[],
  isOrganizationWide: boolean,
  sessionId?: string,
  status: 'open' | 'closing' = 'open'
) {
  const [current] = await db
    .select()
    .from(posSession)
    .where(
      and(
        eq(posSession.orgId, orgId),
        eq(posSession.status, status),
        isOrganizationWide
          ? undefined
          : branchIds.length
            ? inArray(posSession.branchId, branchIds)
            : sql`false`,
        canManage
          ? sessionId
            ? eq(posSession.id, sessionId)
            : undefined
          : eq(posSession.openedBy, userId)
      )
    )
    .orderBy(desc(posSession.openedAt))
    .limit(1);
  return current;
}

export async function beginPosSessionClose(sessionId?: string) {
  const authorization = await posOperator(PermissionEnum.SHIFT_CLOSE);
  const { userId, orgId } = authorization;
  const selectedSessionId = sessionId
    ? z.string().min(1).parse(sessionId)
    : undefined;
  const canManage = authorization.permissions.includes(
    PermissionEnum.SHIFT_MANAGE
  );
  const current = await findClosableSession(
    orgId,
    userId,
    canManage,
    authorization.branchIds,
    authorization.isOrganizationWide,
    selectedSessionId
  );
  if (!current) throw new Error('No open register');
  const started = await db.transaction(async (tx) => {
    const [locked] = await tx
      .select({ id: posSession.id })
      .from(posSession)
      .where(
        and(
          eq(posSession.id, current.id),
          eq(posSession.orgId, orgId),
          eq(posSession.status, 'open')
        )
      )
      .limit(1)
      .for('update');
    if (!locked) return null;
    const [pendingPayment] = await tx
      .select({ id: mpesaPaymentRequest.id })
      .from(mpesaPaymentRequest)
      .where(
        and(
          eq(mpesaPaymentRequest.organizationId, orgId),
          eq(mpesaPaymentRequest.posSessionId, current.id),
          isNull(mpesaPaymentRequest.saleId),
          inArray(mpesaPaymentRequest.status, [
            'SENDING_STK',
            'AWAITING_CUSTOMER',
            'AWAITING_CONFIRMATION',
            'CONFIRMED',
          ])
        )
      )
      .limit(1);
    if (pendingPayment)
      throw new Error(
        'Complete or cancel the pending M-Pesa payment before ending this shift'
      );
    const [unresolvedOfflineSale] = await tx
      .select({ id: offlineSaleSync.id })
      .from(offlineSaleSync)
      .where(
        and(
          eq(offlineSaleSync.organizationId, orgId),
          eq(offlineSaleSync.sessionId, current.id),
          inArray(offlineSaleSync.status, ['RECEIVED', 'SYNCING', 'FAILED'])
        )
      )
      .limit(1);
    if (unresolvedOfflineSale)
      throw new Error(
        'Synchronize or resolve all offline sales before ending this shift'
      );
    const [updated] = await tx
      .update(posSession)
      .set({ status: 'closing', reconciliationStartedAt: new Date() })
      .where(and(eq(posSession.id, current.id), eq(posSession.status, 'open')))
      .returning({ id: posSession.id });
    return updated ?? null;
  });
  if (!started) throw new Error('This register is already being reconciled');
  await db.insert(auditEvent).values({
    id: generateId(),
    organizationId: orgId,
    userId,
    action: 'shift.reconciliation_started',
    metadata: { sessionId: current.id },
  });
  refresh();
  return { sessionId: current.id };
}

export async function cancelPosSessionClose(sessionId?: string) {
  const authorization = await posOperator(PermissionEnum.SHIFT_CLOSE);
  const { userId, orgId } = authorization;
  const canManage = authorization.permissions.includes(
    PermissionEnum.SHIFT_MANAGE
  );
  const current = await findClosableSession(
    orgId,
    userId,
    canManage,
    authorization.branchIds,
    authorization.isOrganizationWide,
    sessionId,
    'closing'
  );
  if (!current) throw new Error('No reconciliation is in progress');
  await db.transaction(async (tx) => {
    const [reopened] = await tx
      .update(posSession)
      .set({
        status: 'open',
        reconciliationStartedAt: null,
        countedCash: null,
        countedVariance: null,
        countedAt: null,
      })
      .where(
        and(eq(posSession.id, current.id), eq(posSession.status, 'closing'))
      )
      .returning({ id: posSession.id });
    if (!reopened)
      throw new Error('This reconciliation has already changed state');
    await tx.insert(auditEvent).values({
      id: generateId(),
      organizationId: orgId,
      userId,
      action: 'shift.reconciliation_cancelled',
      metadata: { sessionId: current.id },
    });
  });
  refresh();
}

export async function submitPosSessionCount(input: {
  countedCash: number;
  sessionId?: string;
}) {
  const data = z
    .object({
      countedCash: z.coerce.number().nonnegative().max(999999999),
      sessionId: z.string().min(1).optional(),
    })
    .parse(input);
  const counted = decimalNumber(data.countedCash);
  const authorization = await posOperator(PermissionEnum.SHIFT_CLOSE);
  const { userId, orgId } = authorization;
  const canManage = authorization.permissions.includes(
    PermissionEnum.SHIFT_MANAGE
  );
  const current = await findClosableSession(
    orgId,
    userId,
    canManage,
    authorization.branchIds,
    authorization.isOrganizationWide,
    data.sessionId,
    'closing'
  );
  if (!current)
    throw new Error('Start closing this register before submitting the count');
  const calculation = await calculateReconciliation(orgId, {
    ...current,
    countedCash: counted.toFixed(2),
  });
  const [saved] = await db
    .update(posSession)
    .set({
      countedCash: counted.toFixed(2),
      countedVariance: calculation.variance.toFixed(2),
      countedAt: new Date(),
    })
    .where(and(eq(posSession.id, current.id), eq(posSession.status, 'closing')))
    .returning({ id: posSession.id });
  if (!saved) throw new Error('This reconciliation has changed state');
  await db.insert(auditEvent).values({
    id: generateId(),
    organizationId: orgId,
    userId,
    action: 'shift.cash_count_submitted',
    metadata: {
      sessionId: current.id,
      countedCash: counted.toFixed(2),
      variance: calculation.variance.toFixed(2),
    },
  });
  refresh();
  return {
    expectedCash: calculation.expected.toNumber(),
    countedCash: counted.toNumber(),
    variance: calculation.variance.toNumber(),
    requiresReason: calculation.variance
      .abs()
      .greaterThan(calculation.tolerance),
    tolerance: calculation.tolerance.toNumber(),
  };
}

export async function getPosSessionReconciliation(sessionId: string) {
  const selectedSessionId = z.string().min(1).parse(sessionId);
  const authorization = await posOperator(PermissionEnum.SHIFT_CLOSE);
  const { userId, orgId } = authorization;
  const canManage = authorization.permissions.includes(
    PermissionEnum.SHIFT_MANAGE
  );
  const current = await findClosableSession(
    orgId,
    userId,
    canManage,
    authorization.branchIds,
    authorization.isOrganizationWide,
    selectedSessionId,
    'closing'
  );
  if (!current?.countedCash)
    throw new Error('Submit a physical drawer count first');
  const calculation = await calculateReconciliation(orgId, current);
  return {
    expectedCash: calculation.expected.toNumber(),
    countedCash: Number(current.countedCash),
    variance: calculation.variance.toNumber(),
    requiresReason: calculation.variance
      .abs()
      .greaterThan(calculation.tolerance),
    tolerance: calculation.tolerance.toNumber(),
  };
}

export async function completePosSessionClose(input: {
  countedCash: number;
  reason?: string;
  notes?: string;
  sessionId?: string;
}) {
  const data = z
    .object({
      countedCash: z.coerce.number().nonnegative().max(999999999),
      reason: z.string().trim().max(300).optional(),
      notes: z.string().trim().max(500).optional(),
      sessionId: z.string().min(1).optional(),
    })
    .parse(input);
  const requestedCount = decimalNumber(data.countedCash);
  const authorization = await posOperator(PermissionEnum.SHIFT_CLOSE);
  const { userId, orgId } = authorization;
  const canManage = authorization.permissions.includes(
    PermissionEnum.SHIFT_MANAGE
  );
  const current = await findClosableSession(
    orgId,
    userId,
    canManage,
    authorization.branchIds,
    authorization.isOrganizationWide,
    data.sessionId,
    'closing'
  );
  if (!current)
    throw new Error('Start closing this register before submitting the count');
  if (current.countedCash == null)
    throw new Error(
      'Submit the physical drawer count before closing the shift'
    );
  if (!requestedCount.equals(decimalNumber(current.countedCash)))
    throw new Error(
      'The drawer count changed. Recount before closing the shift'
    );
  const [unresolvedOfflineSale] = await db
    .select({ id: offlineSaleSync.id })
    .from(offlineSaleSync)
    .where(
      and(
        eq(offlineSaleSync.organizationId, orgId),
        eq(offlineSaleSync.sessionId, current.id),
        inArray(offlineSaleSync.status, ['RECEIVED', 'SYNCING', 'FAILED'])
      )
    )
    .limit(1);
  if (unresolvedOfflineSale)
    throw new Error(
      'Synchronize or resolve all offline sales before closing this shift'
    );
  const calculation = await calculateReconciliation(orgId, current);
  if (
    calculation.variance.abs().greaterThan(calculation.tolerance) &&
    !data.reason
  )
    throw new Error('Enter a reason for the cash variance');
  const summary = calculation.summary;
  const [closed] = await db
    .update(posSession)
    .set({
      status: 'closed',
      expectedCash: calculation.expected.toFixed(2),
      closingCash: current.countedCash,
      variance: calculation.variance.toFixed(2),
      varianceReason: data.reason || null,
      notes: data.notes || null,
      closingSummary: summary,
      closedBy: userId,
      closedAt: new Date(),
    })
    .where(
      and(
        eq(posSession.id, current.id),
        eq(posSession.orgId, orgId),
        eq(posSession.status, 'closing')
      )
    )
    .returning({ id: posSession.id });
  if (!closed) throw new Error('This register has already been closed');
  await db.insert(auditEvent).values({
    id: generateId(),
    organizationId: orgId,
    userId,
    action: 'shift.reconciled',
    metadata: {
      sessionId: current.id,
      expectedCash: calculation.expected.toFixed(2),
      countedCash: current.countedCash,
      variance: calculation.variance.toFixed(2),
      summary,
    },
  });
  refresh();
  return {
    expectedCash: calculation.expected.toNumber(),
    countedCash: Number(current.countedCash),
    variance: calculation.variance.toNumber(),
    summary,
  };
}

/** Backwards-compatible supervisor API. The POS uses the blind close flow above. */
export async function closePosSession(
  closingCash: number,
  notes = '',
  sessionId?: string
) {
  const started = await beginPosSessionClose(sessionId);
  await submitPosSessionCount({
    countedCash: closingCash,
    sessionId: started.sessionId,
  });
  return completePosSessionClose({
    countedCash: closingCash,
    notes,
    sessionId: started.sessionId,
    reason: 'Supervisor reconciliation',
  });
}

export async function recordCashMovement(input: {
  type: 'cash_in' | 'cash_out' | 'safe_drop';
  amount: number;
  reason: string;
  notes?: string;
  idempotencyKey?: string;
}) {
  const data = z
    .object({
      type: z.enum(['cash_in', 'cash_out', 'safe_drop']),
      amount: z.coerce.number().positive().max(999999999),
      reason: z.string().trim().min(3).max(300),
      notes: z.string().trim().max(500).optional(),
      idempotencyKey: z.string().trim().min(8).max(100).optional(),
    })
    .parse(input);
  const movementPermission =
    data.type === 'cash_in'
      ? PermissionEnum.SHIFT_CASH_IN
      : data.type === 'cash_out'
        ? PermissionEnum.SHIFT_CASH_OUT
        : PermissionEnum.SHIFT_SAFE_DROP;
  const authorization = await posOperator(movementPermission);
  const { userId, orgId, terminalId } = authorization;
  const [current] = await db
    .select()
    .from(posSession)
    .where(
      and(
        eq(posSession.orgId, orgId),
        eq(posSession.openedBy, userId),
        terminalId ? eq(posSession.terminalId, terminalId) : undefined,
        eq(posSession.status, 'open')
      )
    )
    .orderBy(desc(posSession.openedAt))
    .limit(1);
  if (!current)
    throw new Error('Open a shift before recording a cash movement');
  if (data.idempotencyKey) {
    const [existing] = await db
      .select({ id: cashMovement.id })
      .from(cashMovement)
      .where(
        and(
          eq(cashMovement.orgId, orgId),
          eq(cashMovement.idempotencyKey, data.idempotencyKey)
        )
      )
      .limit(1);
    if (existing) return { id: existing.id, duplicate: true };
  }
  const id = generateId();
  await db.transaction(async (tx) => {
    const [locked] = await tx
      .select({ id: posSession.id })
      .from(posSession)
      .where(and(eq(posSession.id, current.id), eq(posSession.status, 'open')))
      .limit(1)
      .for('update');
    if (!locked) throw new Error('This shift is no longer open');
    await tx.insert(cashMovement).values({
      id,
      sessionId: current.id,
      type: data.type,
      amount: decimalNumber(data.amount).toFixed(2),
      reason: data.reason,
      notes: data.notes || null,
      userId,
      orgId,
      branchId: current.branchId,
      idempotencyKey: data.idempotencyKey || null,
    });
    await tx.insert(auditEvent).values({
      id: generateId(),
      organizationId: orgId,
      userId,
      action: 'shift.cash_movement_recorded',
      metadata: {
        sessionId: current.id,
        movementId: id,
        type: data.type,
        amount: data.amount,
        reason: data.reason,
      },
    });
  });
  refresh();
  return { id, duplicate: false };
}
