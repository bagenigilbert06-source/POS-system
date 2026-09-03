import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lt,
  or,
  sql,
} from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  ageVerification,
  branch,
  businessSettings,
  cashMovement,
  category,
  customer,
  etimsConfiguration,
  etimsSubmission,
  expense,
  inventoryBalance,
  inventoryLoss,
  mpesaPaymentRequest,
  posSession,
  posTerminal,
  product,
  sale,
  saleItem,
  salesReturn,
  salesReturnItem,
  user,
} from '@/lib/db/schema';
import { fiscalYearLabel, fiscalYearStart } from '@/lib/finance/fiscal-year';
import {
  calculateNetSales,
  calculateReportComparison,
  previousPeriod,
} from '@/lib/reports/report-rules';

export interface ReportsOverview {
  period: { from: Date; to: Date; label: string };
  totals: {
    revenue: number;
    grossSales: number;
    refunds: number;
    transactions: number;
    tax: number;
    discounts: number;
    averageSale: number;
    costOfGoods: number;
    grossProfit: number;
    expenses: number;
    netProfit: number;
    grossMargin: number | null;
    costDataComplete: boolean;
  };
  comparison: {
    revenuePercent: number | null;
    transactionsPercent: number | null;
  };
  inventory: {
    cost: number;
    retailValue: number;
    products: number;
    units: number;
    lowStock: number;
    outOfStock: number;
    reorderValue: number;
  };
  monthly: Array<{
    month: string;
    revenue: number;
    refunds: number;
    expenses: number;
    netProfit: number;
    count: number;
  }>;
  daily: Array<{
    date: string;
    label: string;
    revenue: number;
    refunds: number;
    expenses: number;
    netProfit: number;
    count: number;
  }>;
  payments: Array<{ method: string; amount: number; transactions: number }>;
  topProducts: Array<{
    name: string;
    quantity: number;
    revenue: number;
    profit: number | null;
  }>;
}

export async function getAgeVerificationReport(
  organizationId: string,
  from: Date,
  to: Date,
  branchIds?: readonly string[]
) {
  const scope = and(
    eq(ageVerification.organizationId, organizationId),
    gte(ageVerification.createdAt, from),
    lt(ageVerification.createdAt, to),
    branchIds === undefined
      ? undefined
      : branchIds.length
        ? inArray(ageVerification.branchId, [...branchIds])
        : sql`false`
  );
  const [summary, rows] = await Promise.all([
    db
      .select({ status: ageVerification.status, count: sql<number>`count(*)` })
      .from(ageVerification)
      .where(scope)
      .groupBy(ageVerification.status),
    db
      .select({
        id: ageVerification.id,
        createdAt: ageVerification.createdAt,
        status: ageVerification.status,
        receiptNo: sale.receiptNo,
        branchName: branch.name,
        terminalName: posTerminal.name,
        cashierName: user.name,
      })
      .from(ageVerification)
      .leftJoin(sale, eq(sale.id, ageVerification.saleId))
      .leftJoin(branch, eq(branch.id, ageVerification.branchId))
      .leftJoin(posTerminal, eq(posTerminal.id, ageVerification.terminalId))
      .leftJoin(user, eq(user.id, ageVerification.cashierId))
      .where(scope)
      .orderBy(desc(ageVerification.createdAt))
      .limit(500),
  ]);
  const counts = new Map(
    summary.map((item) => [item.status, Number(item.count)])
  );
  return {
    summary: {
      verified: counts.get('VERIFIED') ?? 0,
      cancelled: counts.get('CANCELLED') ?? 0,
      overridden: counts.get('OVERRIDDEN') ?? 0,
    },
    rows,
  };
}

export interface ReportsQuery {
  branchIds?: readonly string[];
  from?: string;
  to?: string;
}

export interface ReportDataOptions {
  comparison?: boolean;
  costs?: boolean;
  expenses?: boolean;
  monthly?: boolean;
  daily?: boolean;
  payments?: boolean;
  inventory?: boolean;
  products?: boolean;
}

export interface ReportShift {
  id: string;
  sessionNo: string;
  status: string;
  openingCash: string;
  expectedCash: string | null;
  closingCash: string | null;
  variance: string | null;
  varianceReason: string | null;
  openedBy: string;
  closedBy: string | null;
  approvedByName?: string | null;
  reconciliationNote?: string | null;
  openedAt: Date;
  closedAt: Date | null;
  cashierName: string;
  terminalName: string;
  locationName: string;
  sales: { method: string; total: number; count: number }[];
  refunds: { method: string; total: number; count: number }[];
  movements: { type: string; total: number; count: number }[];
  auditEvents: [];
}

function numeric(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function localDateParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  return {
    year: value('year'),
    month: value('month'),
    day: value('day'),
    hour: value('hour'),
    minute: value('minute'),
    second: value('second'),
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

function moveCalendarDate(
  year: number,
  month: number,
  day: number,
  amount: number
) {
  const date = new Date(Date.UTC(year, month - 1, day + amount));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function dateKey(parts: { year: number; month: number; day: number }) {
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

function reportWindow(timeZone: string, query: ReportsQuery) {
  let zone = timeZone;
  try {
    new Intl.DateTimeFormat('en', { timeZone: zone }).format();
  } catch {
    zone = 'Africa/Nairobi';
  }
  const now = localDateParts(new Date(), zone);
  const parse = (value: string | undefined) => {
    const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    const parts = {
      year: Number(match[1]),
      month: Number(match[2]),
      day: Number(match[3]),
    };
    const valid = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
    return valid.getUTCFullYear() === parts.year &&
      valid.getUTCMonth() + 1 === parts.month &&
      valid.getUTCDate() === parts.day
      ? parts
      : null;
  };
  const fromParts = parse(query.from) ?? now;
  const toParts = parse(query.to) ?? now;
  const after = moveCalendarDate(toParts.year, toParts.month, toParts.day, 1);
  return {
    zone,
    from: zonedMidnight(fromParts.year, fromParts.month, fromParts.day, zone),
    toExclusive: zonedMidnight(after.year, after.month, after.day, zone),
  };
}

export function getAgeVerificationReportForQuery(
  organizationId: string,
  timeZone: string,
  query: ReportsQuery
) {
  const { from, toExclusive } = reportWindow(timeZone, query);
  return getAgeVerificationReport(
    organizationId,
    from,
    toExclusive,
    query.branchIds
  );
}

function saleScope(
  organizationId: string,
  query: ReportsQuery,
  from: Date,
  toExclusive: Date
) {
  const branches = query.branchIds;
  return and(
    eq(sale.orgId, organizationId),
    inArray(sale.status, ['completed', 'partially_refunded', 'refunded']),
    gte(sale.createdAt, from),
    lt(sale.createdAt, toExclusive),
    branches === undefined
      ? undefined
      : branches.length
        ? inArray(sale.branchId, [...branches])
        : sql`false`
  );
}

export type SalesReportFilters = {
  page?: number;
  search?: string;
  status?: string;
  payment?: string;
  cashier?: string;
};

export async function getSalesReportRows(
  organizationId: string,
  timeZone: string,
  query: ReportsQuery,
  filters: SalesReportFilters = {}
) {
  const { from, toExclusive } = reportWindow(timeZone, query);
  const page = Math.max(1, Math.floor(filters.page ?? 1));
  const pageSize = 25;
  const allowedStatus = [
    'completed',
    'partially_refunded',
    'refunded',
  ].includes(filters.status ?? '')
    ? filters.status
    : undefined;
  const search = filters.search?.trim().slice(0, 80);
  const scope = and(
    saleScope(organizationId, query, from, toExclusive),
    allowedStatus ? eq(sale.status, allowedStatus) : undefined,
    filters.payment ? eq(sale.paymentMethod, filters.payment) : undefined,
    filters.cashier ? eq(sale.userId, filters.cashier) : undefined,
    search
      ? or(
          ilike(sale.receiptNo, `%${search}%`),
          ilike(customer.name, `%${search}%`)
        )
      : undefined
  );
  const rows = await db
    .select({
      id: sale.id,
      receiptNo: sale.receiptNo,
      createdAt: sale.createdAt,
      cashier: user.name,
      customer: customer.name,
      items: sql<number>`(select coalesce(sum(si.quantity), 0) from sale_item si where si."saleId" = ${sale.id})`,
      payment: sale.paymentMethod,
      total: sale.total,
      status: sale.status,
      totalRows: sql<number>`count(*) over()`,
    })
    .from(sale)
    .leftJoin(user, eq(user.id, sale.userId))
    .leftJoin(customer, eq(customer.id, sale.customerId))
    .where(scope)
    .orderBy(desc(sale.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  const cashiers = await db
    .selectDistinct({ id: user.id, name: user.name })
    .from(sale)
    .innerJoin(user, eq(user.id, sale.userId))
    .where(saleScope(organizationId, query, from, toExclusive))
    .orderBy(user.name);
  return {
    rows,
    cashiers,
    page,
    pageSize,
    total: Number(rows[0]?.totalRows ?? 0),
  };
}

export async function getSalesUnits(
  organizationId: string,
  timeZone: string,
  query: ReportsQuery
) {
  const { from, toExclusive } = reportWindow(timeZone, query);
  const branchScope =
    query.branchIds === undefined
      ? undefined
      : query.branchIds.length
        ? inArray(sale.branchId, [...query.branchIds])
        : sql`false`;
  const [sold, returned] = await Promise.all([
    db
      .select({
        units: sql<number>`coalesce(sum(${saleItem.quantity} * ${saleItem.baseUnitQuantity}), 0)`,
      })
      .from(saleItem)
      .innerJoin(sale, eq(sale.id, saleItem.saleId))
      .where(
        and(
          saleScope(organizationId, query, from, toExclusive),
          eq(saleItem.orgId, organizationId)
        )
      ),
    db
      .select({
        units: sql<number>`coalesce(sum(${salesReturnItem.quantity} * ${saleItem.baseUnitQuantity}), 0)`,
      })
      .from(salesReturnItem)
      .innerJoin(salesReturn, eq(salesReturn.id, salesReturnItem.returnId))
      .innerJoin(sale, eq(sale.id, salesReturn.saleId))
      .innerJoin(saleItem, eq(saleItem.id, salesReturnItem.originalSaleItemId))
      .where(
        and(
          eq(sale.orgId, organizationId),
          inArray(sale.status, ['completed', 'partially_refunded', 'refunded']),
          branchScope,
          eq(salesReturn.orgId, organizationId),
          eq(salesReturn.status, 'completed'),
          gte(salesReturn.createdAt, from),
          lt(salesReturn.createdAt, toExclusive)
        )
      ),
  ]);
  return Math.max(0, numeric(sold[0]?.units) - numeric(returned[0]?.units));
}

export async function getStockItemPerformance(
  organizationId: string,
  timeZone: string,
  query: ReportsQuery
) {
  const { from, toExclusive } = reportWindow(timeZone, query);
  const scope = saleScope(organizationId, query, from, toExclusive);
  const returnSaleScope = and(
    eq(sale.orgId, organizationId),
    inArray(sale.status, ['completed', 'partially_refunded', 'refunded']),
    query.branchIds === undefined
      ? undefined
      : query.branchIds.length
        ? inArray(sale.branchId, [...query.branchIds])
        : sql`false`
  );
  const [rows, returnedRows] = await Promise.all([
    db
      .select({
        productId: saleItem.productId,
        name: saleItem.productName,
        sku: product.sku,
        category: category.name,
        units: sql<number>`coalesce(sum(${saleItem.quantity} * ${saleItem.baseUnitQuantity}), 0)`,
        grossSales: sql<string>`coalesce(sum(${saleItem.totalPrice}), 0)`,
        discount: sql<string>`coalesce(sum(case when ${sale.subtotal} > 0 then ${saleItem.totalPrice} * ${sale.discountAmount} / ${sale.subtotal} else 0 end), 0)`,
        netSales: sql<string>`coalesce(sum(case when ${sale.subtotal} > 0 then ${saleItem.totalPrice} * ${sale.total} / ${sale.subtotal} else ${saleItem.totalPrice} end), 0)`,
        cost: sql<string>`coalesce(sum(${saleItem.totalCost}), 0)`,
        missingCosts: sql<number>`count(*) filter (where ${saleItem.totalPrice} > 0 and ${saleItem.totalCost} <= 0)`,
      })
      .from(saleItem)
      .innerJoin(sale, eq(sale.id, saleItem.saleId))
      .leftJoin(product, eq(product.id, saleItem.productId))
      .leftJoin(category, eq(category.id, product.categoryId))
      .where(and(scope, eq(saleItem.orgId, organizationId)))
      .groupBy(
        saleItem.productId,
        saleItem.productName,
        product.sku,
        category.name
      )
      .orderBy(desc(sql`sum(${saleItem.totalPrice})`))
      .limit(100),
    db
      .select({
        productId: salesReturnItem.productId,
        units: sql<number>`coalesce(sum(${salesReturnItem.quantity} * ${saleItem.baseUnitQuantity}), 0)`,
        amount: sql<string>`coalesce(sum(${salesReturnItem.total}), 0)`,
        cost: sql<string>`coalesce(sum(${salesReturnItem.quantity} * ${saleItem.unitCostAtSale}), 0)`,
      })
      .from(salesReturnItem)
      .innerJoin(salesReturn, eq(salesReturn.id, salesReturnItem.returnId))
      .innerJoin(sale, eq(sale.id, salesReturn.saleId))
      .innerJoin(saleItem, eq(saleItem.id, salesReturnItem.originalSaleItemId))
      .where(
        and(
          returnSaleScope,
          eq(salesReturn.orgId, organizationId),
          eq(salesReturn.status, 'completed'),
          gte(salesReturn.createdAt, from),
          lt(salesReturn.createdAt, toExclusive)
        )
      )
      .groupBy(salesReturnItem.productId),
  ]);
  const returned = new Map(returnedRows.map((row) => [row.productId, row]));
  return rows.map((row) => {
    const productReturns = returned.get(row.productId);
    const netSales = Math.max(
        0,
        numeric(row.netSales) - numeric(productReturns?.amount)
      ),
      cost = Math.max(0, numeric(row.cost) - numeric(productReturns?.cost)),
      costComplete = numeric(row.missingCosts) === 0;
    return {
      ...row,
      units: Math.max(0, numeric(row.units) - numeric(productReturns?.units)),
      grossSales: numeric(row.grossSales),
      discount: numeric(row.discount),
      netSales,
      cost,
      grossProfit: costComplete ? netSales - cost : null,
      margin:
        costComplete && netSales > 0
          ? ((netSales - cost) / netSales) * 100
          : null,
    };
  });
}

export async function getPaymentOperations(
  organizationId: string,
  timeZone: string,
  query: ReportsQuery
) {
  const { from, toExclusive } = reportWindow(timeZone, query);
  const scope = saleScope(organizationId, query, from, toExclusive);
  const mpesaBranch =
    query.branchIds === undefined
      ? undefined
      : query.branchIds.length
        ? inArray(mpesaPaymentRequest.branchId, [...query.branchIds])
        : sql`false`;
  const [refunds, mpesa] = await Promise.all([
    db
      .select({
        method: sale.paymentMethod,
        refunded: sql<string>`coalesce(sum(${salesReturn.amount}), 0)`,
      })
      .from(salesReturn)
      .innerJoin(sale, eq(sale.id, salesReturn.saleId))
      .where(
        and(
          scope,
          eq(salesReturn.orgId, organizationId),
          eq(salesReturn.status, 'completed'),
          gte(salesReturn.createdAt, from),
          lt(salesReturn.createdAt, toExclusive)
        )
      )
      .groupBy(sale.paymentMethod),
    db
      .select({
        status: mpesaPaymentRequest.status,
        count: sql<number>`count(*)`,
        amount: sql<string>`coalesce(sum(${mpesaPaymentRequest.amount}), 0)`,
      })
      .from(mpesaPaymentRequest)
      .where(
        and(
          eq(mpesaPaymentRequest.organizationId, organizationId),
          mpesaBranch,
          gte(mpesaPaymentRequest.createdAt, from),
          lt(mpesaPaymentRequest.createdAt, toExclusive)
        )
      )
      .groupBy(mpesaPaymentRequest.status),
  ]);
  return {
    refunds: new Map(refunds.map((row) => [row.method, numeric(row.refunded)])),
    mpesa: mpesa.map((row) => ({
      status: row.status,
      count: numeric(row.count),
      amount: numeric(row.amount),
    })),
  };
}

export async function getInventoryOperations(
  organizationId: string,
  timeZone: string,
  query: ReportsQuery
) {
  const { from, toExclusive } = reportWindow(timeZone, query);
  const branchScope =
    query.branchIds === undefined
      ? undefined
      : query.branchIds.length
        ? inArray(inventoryBalance.branchId, [...query.branchIds])
        : sql`false`;
  const lossBranchScope =
    query.branchIds === undefined
      ? undefined
      : query.branchIds.length
        ? inArray(inventoryLoss.branchId, [...query.branchIds])
        : sql`false`;
  const [rows, losses] = await Promise.all([
    db
      .select({
        id: product.id,
        name: product.name,
        sku: product.sku,
        unit: product.unit,
        onHand: sql<string>`coalesce(sum(${inventoryBalance.onHand}), 0)`,
        available: sql<string>`coalesce(sum(${inventoryBalance.onHand} - ${inventoryBalance.reserved} - ${inventoryBalance.unavailable}), 0)`,
        reorder: sql<string>`coalesce(max(coalesce(${inventoryBalance.reorderPoint}, ${product.minStock})), 0)`,
        value: sql<string>`coalesce(sum((${inventoryBalance.onHand} - ${inventoryBalance.reserved} - ${inventoryBalance.unavailable}) * ${product.buyingPrice}), 0)`,
        packaging: sql<string>`coalesce((select string_agg(pp.name || ' (' || pp."baseUnitQuantity" || ')', ', ' order by pp."baseUnitQuantity") from product_package pp where pp."productId" = ${product.id} and pp."isActive" = true), ${product.unit})`,
      })
      .from(inventoryBalance)
      .innerJoin(
        product,
        and(
          eq(product.id, inventoryBalance.productId),
          eq(product.orgId, organizationId),
          eq(product.isActive, true)
        )
      )
      .where(and(eq(inventoryBalance.orgId, organizationId), branchScope))
      .groupBy(product.id)
      .orderBy(product.name)
      .limit(250),
    db
      .select({
        type: inventoryLoss.type,
        quantity: sql<number>`coalesce(sum(${inventoryLoss.quantity}), 0)`,
        value: sql<string>`coalesce(sum(${inventoryLoss.totalCost}), 0)`,
      })
      .from(inventoryLoss)
      .where(
        and(
          eq(inventoryLoss.orgId, organizationId),
          lossBranchScope,
          gte(inventoryLoss.createdAt, from),
          lt(inventoryLoss.createdAt, toExclusive)
        )
      )
      .groupBy(inventoryLoss.type),
  ]);
  return {
    rows: rows.map((row) => ({
      ...row,
      onHand: numeric(row.onHand),
      available: numeric(row.available),
      reorder: numeric(row.reorder),
      value: numeric(row.value),
    })),
    losses: losses.map((row) => ({
      type: row.type,
      quantity: numeric(row.quantity),
      value: numeric(row.value),
    })),
  };
}

export async function getTaxOperations(
  organizationId: string,
  timeZone: string,
  query: ReportsQuery
) {
  const { from, toExclusive } = reportWindow(timeZone, query);
  const submissionBranch =
    query.branchIds === undefined
      ? undefined
      : query.branchIds.length
        ? inArray(etimsSubmission.branchId, [...query.branchIds])
        : sql`false`;
  const configurationBranch =
    query.branchIds === undefined
      ? undefined
      : query.branchIds.length
        ? inArray(etimsConfiguration.branchId, [...query.branchIds])
        : sql`false`;
  const [settings, configurations, fiscal] = await Promise.all([
    db
      .select({
        enabled: businessSettings.taxEnabled,
        name: businessSettings.taxName,
        rate: businessSettings.taxRate,
      })
      .from(businessSettings)
      .where(eq(businessSettings.organizationId, organizationId))
      .limit(1),
    db
      .select({
        enabled: etimsConfiguration.enabled,
        vatRegistered: etimsConfiguration.vatRegistered,
      })
      .from(etimsConfiguration)
      .where(
        and(
          eq(etimsConfiguration.organizationId, organizationId),
          configurationBranch
        )
      ),
    db
      .select({ status: etimsSubmission.status, count: sql<number>`count(*)` })
      .from(etimsSubmission)
      .where(
        and(
          eq(etimsSubmission.organizationId, organizationId),
          submissionBranch,
          gte(etimsSubmission.createdAt, from),
          lt(etimsSubmission.createdAt, toExclusive)
        )
      )
      .groupBy(etimsSubmission.status),
  ]);
  const config = settings[0];
  return {
    taxEnabled: config?.enabled ?? false,
    taxName: config?.name || 'Tax',
    taxRate: numeric(config?.rate),
    vatRegistered: configurations.some(
      (row) => row.enabled && row.vatRegistered
    ),
    fiscal: fiscal.map((row) => ({
      status: row.status,
      count: numeric(row.count),
    })),
  };
}

export async function getStaffReport(
  organizationId: string,
  timeZone: string,
  query: ReportsQuery
) {
  const { from, toExclusive } = reportWindow(timeZone, query);
  const scope = saleScope(organizationId, query, from, toExclusive);
  const sessionBranch =
    query.branchIds === undefined
      ? undefined
      : query.branchIds.length
        ? inArray(posSession.branchId, [...query.branchIds])
        : sql`false`;
  const ageBranch =
    query.branchIds === undefined
      ? undefined
      : query.branchIds.length
        ? inArray(ageVerification.branchId, [...query.branchIds])
        : sql`false`;
  const [sales, refunds, variances, verifications] = await Promise.all([
    db
      .select({
        id: sale.userId,
        name: user.name,
        transactions: sql<number>`count(*)`,
        netSales: sql<string>`coalesce(sum(${sale.total}), 0)`,
        discounts: sql<string>`coalesce(sum(${sale.discountAmount}), 0)`,
      })
      .from(sale)
      .leftJoin(user, eq(user.id, sale.userId))
      .where(scope)
      .groupBy(sale.userId, user.name),
    db
      .select({
        id: sale.userId,
        amount: sql<string>`coalesce(sum(${salesReturn.amount}), 0)`,
      })
      .from(salesReturn)
      .innerJoin(sale, eq(sale.id, salesReturn.saleId))
      .where(and(scope, eq(salesReturn.status, 'completed')))
      .groupBy(sale.userId),
    db
      .select({
        id: posSession.openedBy,
        variance: sql<string>`coalesce(sum(${posSession.variance}), 0)`,
      })
      .from(posSession)
      .where(
        and(
          eq(posSession.orgId, organizationId),
          sessionBranch,
          gte(posSession.openedAt, from),
          lt(posSession.openedAt, toExclusive)
        )
      )
      .groupBy(posSession.openedBy),
    db
      .select({
        id: ageVerification.cashierId,
        count: sql<number>`count(*) filter (where ${ageVerification.status} in ('VERIFIED','OVERRIDDEN'))`,
      })
      .from(ageVerification)
      .where(
        and(
          eq(ageVerification.organizationId, organizationId),
          ageBranch,
          gte(ageVerification.createdAt, from),
          lt(ageVerification.createdAt, toExclusive)
        )
      )
      .groupBy(ageVerification.cashierId),
  ]);
  const refundMap = new Map(
      refunds.map((row) => [row.id, numeric(row.amount)])
    ),
    varianceMap = new Map(
      variances.map((row) => [row.id, numeric(row.variance)])
    ),
    verificationMap = new Map(
      verifications.map((row) => [row.id, numeric(row.count)])
    );
  return sales
    .map((row) => {
      const refunds = refundMap.get(row.id) ?? 0,
        netSales = Math.max(0, numeric(row.netSales) - refunds),
        transactions = numeric(row.transactions);
      return {
        id: row.id,
        name: row.name || 'Unknown staff member',
        transactions,
        netSales,
        average: transactions ? netSales / transactions : 0,
        discounts: numeric(row.discounts),
        refunds,
        variance: varianceMap.get(row.id) ?? 0,
        verifications: verificationMap.get(row.id) ?? 0,
      };
    })
    .sort((a, b) => b.netSales - a.netSales);
}

/**
 * Bounded, organization-scoped reporting data. The organization id is resolved
 * from the authenticated session by the calling server component.
 */
export async function getReportsOverview(
  organizationId: string,
  timeZone = 'Africa/Nairobi',
  query: ReportsQuery = {},
  requested: ReportDataOptions = {}
): Promise<ReportsOverview> {
  const include = {
    comparison: requested.comparison ?? true,
    costs: requested.costs ?? true,
    expenses: requested.expenses ?? true,
    monthly: requested.monthly ?? true,
    daily: requested.daily ?? true,
    payments: requested.payments ?? true,
    inventory: requested.inventory ?? true,
    products: requested.products ?? true,
  };
  let safeTimeZone = timeZone;
  try {
    new Intl.DateTimeFormat('en', { timeZone: safeTimeZone }).format();
  } catch {
    safeTimeZone = 'Africa/Nairobi';
  }
  const now = new Date();
  const currentDate = localDateParts(now, safeTimeZone);
  const [settings] = await db
    .select({ financialYearStart: businessSettings.financialYearStart })
    .from(businessSettings)
    .where(eq(businessSettings.organizationId, organizationId))
    .limit(1);
  const fiscalFrom = fiscalYearStart(now, settings?.financialYearStart);
  const parseDate = (value: string | undefined) => {
    const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    const year = Number(match[1]),
      month = Number(match[2]),
      day = Number(match[3]);
    const candidate = new Date(Date.UTC(year, month - 1, day));
    if (
      candidate.getUTCFullYear() !== year ||
      candidate.getUTCMonth() !== month - 1 ||
      candidate.getUTCDate() !== day
    )
      return null;
    return { year, month, day };
  };
  const requestedFrom = parseDate(query.from);
  const requestedTo = parseDate(query.to);
  const from = requestedFrom
    ? zonedMidnight(
        requestedFrom.year,
        requestedFrom.month,
        requestedFrom.day,
        safeTimeZone
      )
    : fiscalFrom;
  const inclusiveTo = requestedTo ?? currentDate;
  const afterTo = moveCalendarDate(
    inclusiveTo.year,
    inclusiveTo.month,
    inclusiveTo.day,
    1
  );
  const toExclusive = zonedMidnight(
    afterTo.year,
    afterTo.month,
    afterTo.day,
    safeTimeZone
  );
  const to = new Date(toExclusive.getTime() - 1);
  const fromKey = query.from ?? dateKey(localDateParts(from, safeTimeZone));
  const toKey = query.to ?? dateKey(inclusiveTo);
  const prior = previousPeriod(fromKey, toKey);
  const priorParts = parseDate(prior.from)!;
  const previousFrom = zonedMidnight(
    priorParts.year,
    priorParts.month,
    priorParts.day,
    safeTimeZone
  );
  const dailyDays = Math.max(
    1,
    Math.min(
      62,
      Math.round(
        (Date.parse(`${toKey}T00:00:00Z`) -
          Date.parse(`${fromKey}T00:00:00Z`)) /
          86_400_000
      ) + 1
    )
  );
  const dailyStartParts = moveCalendarDate(
    inclusiveTo.year,
    inclusiveTo.month,
    inclusiveTo.day,
    -(dailyDays - 1)
  );
  const dailyStart = zonedMidnight(
    dailyStartParts.year,
    dailyStartParts.month,
    dailyStartParts.day,
    safeTimeZone
  );
  const branchIds = query.branchIds;
  const saleBranchScope =
    branchIds === undefined
      ? undefined
      : branchIds.length
        ? inArray(sale.branchId, [...branchIds])
        : sql`false`;
  const expenseBranchScope =
    branchIds === undefined
      ? undefined
      : branchIds.length
        ? inArray(expense.branchId, [...branchIds])
        : sql`false`;
  const paidSale = and(
    eq(sale.orgId, organizationId),
    saleBranchScope,
    inArray(sale.status, ['completed', 'partially_refunded', 'refunded'])
  );
  const paidInPeriod = and(
    paidSale,
    gte(sale.createdAt, from),
    lt(sale.createdAt, toExclusive)
  );
  const localMonth = sql`date_trunc('month', ((${sale.createdAt} at time zone 'UTC') at time zone ${safeTimeZone}))`;
  const localSaleDate = sql`((${sale.createdAt} at time zone 'UTC') at time zone ${safeTimeZone})::date`;
  const localReturnMonth = sql`date_trunc('month', ((${salesReturn.createdAt} at time zone 'UTC') at time zone ${safeTimeZone}))`;
  const localReturnDate = sql`((${salesReturn.createdAt} at time zone 'UTC') at time zone ${safeTimeZone})::date`;
  const localExpenseMonth = sql`date_trunc('month', ((${expense.expenseDate} at time zone 'UTC') at time zone ${safeTimeZone}))`;
  const localExpenseDate = sql`((${expense.expenseDate} at time zone 'UTC') at time zone ${safeTimeZone})::date`;

  const [
    totalRows,
    previousTotalRows,
    previousRefundRows,
    costRows,
    refundRows,
    returnedCostRows,
    expenseTotalRows,
    monthlyRows,
    monthlyRefundRows,
    monthlyExpenseRows,
    dailyRows,
    dailyRefundRows,
    dailyExpenseRows,
    paymentRows,
    inventoryRows,
    topProductRows,
    topProductRefundRows,
  ] = await Promise.all([
    db
      .select({
        revenue: sql<string>`coalesce(sum(${sale.total}), 0)`,
        grossSales: sql<string>`coalesce(sum(${sale.total} + ${sale.discountAmount}), 0)`,
        transactions: sql<number>`count(*)`,
        tax: sql<string>`coalesce(sum(${sale.taxAmount}), 0)`,
        discounts: sql<string>`coalesce(sum(${sale.discountAmount}), 0)`,
      })
      .from(sale)
      .where(paidInPeriod),
    include.comparison
      ? db
          .select({
            revenue: sql<string>`coalesce(sum(${sale.total}), 0)`,
            transactions: sql<number>`count(*)`,
          })
          .from(sale)
          .where(
            and(
              paidSale,
              gte(sale.createdAt, previousFrom),
              lt(sale.createdAt, from)
            )
          )
      : Promise.resolve([]),
    include.comparison
      ? db
          .select({
            amount: sql<string>`coalesce(sum(${salesReturn.amount}), 0)`,
          })
          .from(salesReturn)
          .innerJoin(sale, eq(sale.id, salesReturn.saleId))
          .where(
            and(
              paidSale,
              eq(salesReturn.orgId, organizationId),
              eq(salesReturn.status, 'completed'),
              gte(salesReturn.createdAt, previousFrom),
              lt(salesReturn.createdAt, from)
            )
          )
      : Promise.resolve([]),
    include.costs
      ? db
          .select({
            cost: sql<string>`coalesce(sum(${saleItem.totalCost}), 0)`,
            missingCosts: sql<number>`count(*) filter (where ${saleItem.totalPrice} > 0 and ${saleItem.totalCost} <= 0)`,
          })
          .from(saleItem)
          .innerJoin(sale, eq(sale.id, saleItem.saleId))
          .where(and(paidInPeriod, eq(saleItem.orgId, organizationId)))
      : Promise.resolve([]),
    db
      .select({ amount: sql<string>`coalesce(sum(${salesReturn.amount}), 0)` })
      .from(salesReturn)
      .innerJoin(sale, eq(sale.id, salesReturn.saleId))
      .where(
        and(
          paidSale,
          eq(salesReturn.orgId, organizationId),
          eq(salesReturn.status, 'completed'),
          gte(salesReturn.createdAt, from),
          lt(salesReturn.createdAt, toExclusive)
        )
      ),
    include.costs
      ? db
          .select({
            cost: sql<string>`coalesce(sum(${saleItem.unitCostAtSale} * ${salesReturnItem.quantity}), 0)`,
          })
          .from(salesReturnItem)
          .innerJoin(salesReturn, eq(salesReturn.id, salesReturnItem.returnId))
          .innerJoin(sale, eq(sale.id, salesReturn.saleId))
          .innerJoin(
            saleItem,
            and(
              eq(saleItem.saleId, sale.id),
              eq(saleItem.productId, salesReturnItem.productId)
            )
          )
          .where(
            and(
              paidSale,
              eq(salesReturn.orgId, organizationId),
              eq(salesReturn.status, 'completed'),
              eq(salesReturnItem.orgId, organizationId),
              gte(salesReturn.createdAt, from),
              lt(salesReturn.createdAt, toExclusive)
            )
          )
      : Promise.resolve([]),
    include.expenses
      ? db
          .select({ amount: sql<string>`coalesce(sum(${expense.amount}), 0)` })
          .from(expense)
          .where(
            and(
              eq(expense.orgId, organizationId),
              expenseBranchScope,
              gte(expense.expenseDate, from),
              lt(expense.expenseDate, toExclusive)
            )
          )
      : Promise.resolve([]),
    include.monthly
      ? db
          .select({
            month: sql<string>`to_char(${localMonth}, 'YYYY-MM')`,
            revenue: sql<string>`coalesce(sum(${sale.total}), 0)`,
            count: sql<number>`count(*)`,
          })
          .from(sale)
          .where(paidInPeriod)
          .groupBy(sql`1`)
          .orderBy(sql`1`)
      : Promise.resolve([]),
    include.monthly
      ? db
          .select({
            month: sql<string>`to_char(${localReturnMonth}, 'YYYY-MM')`,
            amount: sql<string>`coalesce(sum(${salesReturn.amount}), 0)`,
          })
          .from(salesReturn)
          .innerJoin(sale, eq(sale.id, salesReturn.saleId))
          .where(
            and(
              paidSale,
              eq(salesReturn.orgId, organizationId),
              eq(salesReturn.status, 'completed'),
              gte(salesReturn.createdAt, from),
              lt(salesReturn.createdAt, toExclusive)
            )
          )
          .groupBy(sql`1`)
          .orderBy(sql`1`)
      : Promise.resolve([]),
    include.monthly && include.expenses
      ? db
          .select({
            month: sql<string>`to_char(${localExpenseMonth}, 'YYYY-MM')`,
            amount: sql<string>`coalesce(sum(${expense.amount}), 0)`,
          })
          .from(expense)
          .where(
            and(
              eq(expense.orgId, organizationId),
              expenseBranchScope,
              gte(expense.expenseDate, from),
              lt(expense.expenseDate, toExclusive)
            )
          )
          .groupBy(sql`1`)
          .orderBy(sql`1`)
      : Promise.resolve([]),
    include.daily
      ? db
          .select({
            date: sql<string>`to_char(${localSaleDate}, 'YYYY-MM-DD')`,
            revenue: sql<string>`coalesce(sum(${sale.total}), 0)`,
            count: sql<number>`count(*)`,
          })
          .from(sale)
          .where(
            and(
              paidSale,
              gte(sale.createdAt, dailyStart),
              lt(sale.createdAt, toExclusive)
            )
          )
          .groupBy(sql`1`)
          .orderBy(asc(sql`1`))
      : Promise.resolve([]),
    include.daily
      ? db
          .select({
            date: sql<string>`to_char(${localReturnDate}, 'YYYY-MM-DD')`,
            amount: sql<string>`coalesce(sum(${salesReturn.amount}), 0)`,
          })
          .from(salesReturn)
          .innerJoin(sale, eq(sale.id, salesReturn.saleId))
          .where(
            and(
              paidSale,
              eq(salesReturn.orgId, organizationId),
              eq(salesReturn.status, 'completed'),
              gte(salesReturn.createdAt, dailyStart),
              lt(salesReturn.createdAt, toExclusive)
            )
          )
          .groupBy(sql`1`)
          .orderBy(asc(sql`1`))
      : Promise.resolve([]),
    include.daily && include.expenses
      ? db
          .select({
            date: sql<string>`to_char(${localExpenseDate}, 'YYYY-MM-DD')`,
            amount: sql<string>`coalesce(sum(${expense.amount}), 0)`,
          })
          .from(expense)
          .where(
            and(
              eq(expense.orgId, organizationId),
              expenseBranchScope,
              gte(expense.expenseDate, dailyStart),
              lt(expense.expenseDate, toExclusive)
            )
          )
          .groupBy(sql`1`)
          .orderBy(asc(sql`1`))
      : Promise.resolve([]),
    include.payments
      ? db
          .select({
            method: sale.paymentMethod,
            amount: sql<string>`coalesce(sum(${sale.total}), 0)`,
            transactions: sql<number>`count(*)`,
          })
          .from(sale)
          .where(paidInPeriod)
          .groupBy(sale.paymentMethod)
          .orderBy(desc(sql`sum(${sale.total})`))
      : Promise.resolve([]),
    include.inventory
      ? branchIds === undefined
        ? db
            .select({
              cost: sql<string>`coalesce(sum(${product.buyingPrice} * ${product.stock}), 0)`,
              retailValue: sql<string>`coalesce(sum(${product.sellingPrice} * ${product.stock}), 0)`,
              products: sql<number>`count(*)`,
              units: sql<string>`coalesce(sum(${product.stock}), 0)`,
              lowStock: sql<number>`count(*) filter (where ${product.stock} > 0 and ${product.stock} <= ${product.minStock})`,
              outOfStock: sql<number>`count(*) filter (where ${product.stock} <= 0)`,
              reorderValue: sql<string>`coalesce(sum(greatest(${product.minStock} - ${product.stock}, 0) * ${product.buyingPrice}), 0)`,
            })
            .from(product)
            .where(
              and(eq(product.orgId, organizationId), eq(product.isActive, true))
            )
        : db
            .select({
              cost: sql<string>`coalesce(sum(${product.buyingPrice} * (${inventoryBalance.onHand} - ${inventoryBalance.reserved} - ${inventoryBalance.unavailable})), 0)`,
              retailValue: sql<string>`coalesce(sum(${product.sellingPrice} * (${inventoryBalance.onHand} - ${inventoryBalance.reserved} - ${inventoryBalance.unavailable})), 0)`,
              products: sql<number>`count(distinct ${inventoryBalance.productId})`,
              units: sql<string>`coalesce(sum(${inventoryBalance.onHand} - ${inventoryBalance.reserved} - ${inventoryBalance.unavailable}), 0)`,
              lowStock: sql<number>`count(distinct ${inventoryBalance.productId}) filter (where (${inventoryBalance.onHand} - ${inventoryBalance.reserved} - ${inventoryBalance.unavailable}) > 0 and (${inventoryBalance.onHand} - ${inventoryBalance.reserved} - ${inventoryBalance.unavailable}) <= ${product.minStock})`,
              outOfStock: sql<number>`count(distinct ${inventoryBalance.productId}) filter (where (${inventoryBalance.onHand} - ${inventoryBalance.reserved} - ${inventoryBalance.unavailable}) <= 0)`,
              reorderValue: sql<string>`coalesce(sum(greatest(${product.minStock} - (${inventoryBalance.onHand} - ${inventoryBalance.reserved} - ${inventoryBalance.unavailable}), 0) * ${product.buyingPrice}), 0)`,
            })
            .from(inventoryBalance)
            .innerJoin(
              product,
              and(
                eq(product.id, inventoryBalance.productId),
                eq(product.orgId, organizationId),
                eq(product.isActive, true)
              )
            )
            .where(
              and(
                eq(inventoryBalance.orgId, organizationId),
                branchIds.length
                  ? inArray(inventoryBalance.branchId, [...branchIds])
                  : sql`false`
              )
            )
      : Promise.resolve([]),
    include.products
      ? db
          .select({
            productId: saleItem.productId,
            name: saleItem.productName,
            quantity: sql<number>`coalesce(sum(${saleItem.quantity}), 0)`,
            revenue: sql<string>`coalesce(sum(case when ${sale.subtotal} > 0 then ${saleItem.totalPrice} * ${sale.total} / ${sale.subtotal} else ${saleItem.totalPrice} end), 0)`,
            cost: sql<string>`coalesce(sum(${saleItem.totalCost}), 0)`,
            missingCosts: sql<number>`count(*) filter (where ${saleItem.totalPrice} > 0 and ${saleItem.totalCost} <= 0)`,
          })
          .from(saleItem)
          .innerJoin(
            sale,
            and(eq(sale.id, saleItem.saleId), eq(sale.orgId, organizationId))
          )
          .where(and(eq(saleItem.orgId, organizationId), paidInPeriod))
          .groupBy(saleItem.productId, saleItem.productName)
          .orderBy(desc(sql`sum(${saleItem.totalPrice})`))
          .limit(50)
      : Promise.resolve([]),
    include.products
      ? db
          .select({
            productId: salesReturnItem.productId,
            name: salesReturnItem.productName,
            quantity: sql<number>`coalesce(sum(${salesReturnItem.quantity}), 0)`,
            revenue: sql<string>`coalesce(sum(case when ${sale.subtotal} > 0 then ${salesReturnItem.total} * ${salesReturn.amount} / ${sale.subtotal} else ${salesReturnItem.total} end), 0)`,
            cost: sql<string>`coalesce(sum(${saleItem.unitCostAtSale} * ${salesReturnItem.quantity}), 0)`,
          })
          .from(salesReturnItem)
          .innerJoin(salesReturn, eq(salesReturn.id, salesReturnItem.returnId))
          .innerJoin(sale, eq(sale.id, salesReturn.saleId))
          .leftJoin(
            saleItem,
            and(
              eq(saleItem.saleId, sale.id),
              eq(saleItem.productId, salesReturnItem.productId)
            )
          )
          .where(
            and(
              paidSale,
              eq(salesReturn.orgId, organizationId),
              eq(salesReturn.status, 'completed'),
              eq(salesReturnItem.orgId, organizationId),
              gte(salesReturn.createdAt, from),
              lt(salesReturn.createdAt, toExclusive)
            )
          )
          .groupBy(salesReturnItem.productId, salesReturnItem.productName)
      : Promise.resolve([]),
  ]);

  const total = totalRows[0];
  const collectedAfterDiscounts = numeric(total?.revenue);
  const grossSales = numeric(total?.grossSales);
  const refunds = numeric(refundRows[0]?.amount);
  const revenue = calculateNetSales(collectedAfterDiscounts, refunds);
  const transactions = numeric(total?.transactions);
  const previousRevenue = calculateNetSales(
    numeric(previousTotalRows[0]?.revenue),
    numeric(previousRefundRows[0]?.amount)
  );
  const previousTransactions = numeric(previousTotalRows[0]?.transactions);
  const monthMap = new Map(monthlyRows.map((row) => [row.month, row]));
  const monthRefundMap = new Map(
    monthlyRefundRows.map((row) => [row.month, numeric(row.amount)])
  );
  const monthExpenseMap = new Map(
    monthlyExpenseRows.map((row) => [row.month, numeric(row.amount)])
  );
  const fromCalendar = requestedFrom ?? localDateParts(from, safeTimeZone);
  const monthsInPeriod = Math.max(
    1,
    (inclusiveTo.year - fromCalendar.year) * 12 +
      inclusiveTo.month -
      fromCalendar.month +
      1
  );
  const monthly = Array.from({ length: monthsInPeriod }, (_, index) => {
    const date = new Date(
      Date.UTC(fromCalendar.year, fromCalendar.month - 1 + index, 1)
    );
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    const row = monthMap.get(key);
    const monthRefunds = monthRefundMap.get(key) ?? 0;
    const monthExpenses = monthExpenseMap.get(key) ?? 0;
    const monthRevenue = Math.max(0, numeric(row?.revenue) - monthRefunds);
    return {
      month: date.toLocaleDateString('en-KE', {
        month: 'short',
        year: '2-digit',
        timeZone: 'UTC',
      }),
      revenue: monthRevenue,
      refunds: monthRefunds,
      expenses: monthExpenses,
      netProfit: monthRevenue - monthExpenses,
      count: numeric(row?.count),
    };
  });

  const dailySaleMap = new Map(dailyRows.map((row) => [row.date, row]));
  const dailyRefundMap = new Map(
    dailyRefundRows.map((row) => [row.date, numeric(row.amount)])
  );
  const dailyExpenseMap = new Map(
    dailyExpenseRows.map((row) => [row.date, numeric(row.amount)])
  );
  const daily = Array.from({ length: dailyDays }, (_, index) => {
    const parts = moveCalendarDate(
      dailyStartParts.year,
      dailyStartParts.month,
      dailyStartParts.day,
      index
    );
    const key = dateKey(parts);
    const row = dailySaleMap.get(key);
    const dayRefunds = dailyRefundMap.get(key) ?? 0;
    const dayExpenses = dailyExpenseMap.get(key) ?? 0;
    const dayRevenue = Math.max(0, numeric(row?.revenue) - dayRefunds);
    return {
      date: key,
      label: new Date(`${key}T00:00:00Z`).toLocaleDateString('en-KE', {
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC',
      }),
      revenue: dayRevenue,
      refunds: dayRefunds,
      expenses: dayExpenses,
      netProfit: dayRevenue - dayExpenses,
      count: numeric(row?.count),
    };
  });

  const costOfGoods = Math.max(
    0,
    numeric(costRows[0]?.cost) - numeric(returnedCostRows[0]?.cost)
  );
  const expenses = numeric(expenseTotalRows[0]?.amount);
  const grossProfit = revenue - costOfGoods;
  const productMap = new Map(
    topProductRows.map((row) => [
      row.productId,
      {
        name: row.name,
        quantity: numeric(row.quantity),
        revenue: numeric(row.revenue),
        cost: numeric(row.cost),
        costComplete: numeric(row.missingCosts) === 0,
      },
    ])
  );
  for (const refund of topProductRefundRows) {
    const item = productMap.get(refund.productId) ?? {
      name: refund.name,
      quantity: 0,
      revenue: 0,
      cost: 0,
      costComplete: true,
    };
    item.quantity -= numeric(refund.quantity);
    item.revenue -= numeric(refund.revenue);
    item.cost -= numeric(refund.cost);
    productMap.set(refund.productId, item);
  }
  const topProducts = [...productMap.values()]
    .map((item) => ({
      name: item.name,
      quantity: Math.max(0, item.quantity),
      revenue: Math.max(0, item.revenue),
      profit: item.costComplete
        ? Math.max(0, item.revenue) - Math.max(0, item.cost)
        : null,
    }))
    .filter((item) => item.quantity > 0 || item.revenue > 0)
    .sort((left, right) => right.revenue - left.revenue)
    .slice(0, 8);

  return {
    period: {
      from,
      to,
      label:
        query.from || query.to
          ? `${from.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: safeTimeZone })} – ${to.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: safeTimeZone })}`
          : fiscalYearLabel(from, now),
    },
    totals: {
      revenue,
      grossSales,
      refunds,
      transactions,
      tax: numeric(total?.tax),
      discounts: numeric(total?.discounts),
      averageSale: transactions ? revenue / transactions : 0,
      costOfGoods,
      grossProfit,
      expenses,
      netProfit: grossProfit - expenses,
      grossMargin:
        revenue > 0 && numeric(costRows[0]?.missingCosts) === 0
          ? (grossProfit / revenue) * 100
          : null,
      costDataComplete: numeric(costRows[0]?.missingCosts) === 0,
    },
    comparison: {
      revenuePercent: calculateReportComparison(revenue, previousRevenue)
        .percent,
      transactionsPercent: calculateReportComparison(
        transactions,
        previousTransactions
      ).percent,
    },
    inventory: {
      cost: numeric(inventoryRows[0]?.cost),
      retailValue: numeric(inventoryRows[0]?.retailValue),
      products: numeric(inventoryRows[0]?.products),
      units: numeric(inventoryRows[0]?.units),
      lowStock: numeric(inventoryRows[0]?.lowStock),
      outOfStock: numeric(inventoryRows[0]?.outOfStock),
      reorderValue: numeric(inventoryRows[0]?.reorderValue),
    },
    monthly,
    daily,
    payments: paymentRows.map((row) => ({
      method: row.method,
      amount: numeric(row.amount),
      transactions: numeric(row.transactions),
    })),
    topProducts,
  };
}

export async function getReportShifts(
  organizationId: string,
  timeZone = 'Africa/Nairobi',
  query: ReportsQuery = {}
): Promise<ReportShift[]> {
  let safeTimeZone = timeZone;
  try {
    new Intl.DateTimeFormat('en', { timeZone: safeTimeZone }).format();
  } catch {
    safeTimeZone = 'Africa/Nairobi';
  }
  const parts = (
    value: string | undefined,
    fallback: ReturnType<typeof localDateParts>
  ) => {
    const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match
      ? {
          year: Number(match[1]),
          month: Number(match[2]),
          day: Number(match[3]),
        }
      : fallback;
  };
  const today = localDateParts(new Date(), safeTimeZone);
  const startParts = parts(query.from, today);
  const endParts = parts(query.to, today);
  const next = moveCalendarDate(endParts.year, endParts.month, endParts.day, 1);
  const from = zonedMidnight(
    startParts.year,
    startParts.month,
    startParts.day,
    safeTimeZone
  );
  const toExclusive = zonedMidnight(
    next.year,
    next.month,
    next.day,
    safeTimeZone
  );
  const branchScope =
    query.branchIds === undefined
      ? undefined
      : query.branchIds.length
        ? inArray(posSession.branchId, [...query.branchIds])
        : sql`false`;
  const sessions = await db
    .select()
    .from(posSession)
    .where(
      and(
        eq(posSession.orgId, organizationId),
        branchScope,
        gte(posSession.openedAt, from),
        lt(posSession.openedAt, toExclusive)
      )
    )
    .orderBy(desc(posSession.openedAt))
    .limit(100);
  if (!sessions.length) return [];
  const sessionIds = sessions.map((record) => record.id);
  const userIds = [
    ...new Set(
      sessions.flatMap((record) =>
        [record.openedBy, record.closedBy].filter((id): id is string =>
          Boolean(id)
        )
      )
    ),
  ];
  const branchRecordIds = [
    ...new Set(
      sessions
        .map((record) => record.branchId)
        .filter((id): id is string => Boolean(id))
    ),
  ];
  const terminalIds = [
    ...new Set(
      sessions
        .map((record) => record.terminalId)
        .filter((id): id is string => Boolean(id))
    ),
  ];
  const [people, locations, terminals, sales, refunds, movements] =
    await Promise.all([
      userIds.length
        ? db
            .select({ id: user.id, name: user.name })
            .from(user)
            .where(inArray(user.id, userIds))
        : [],
      branchRecordIds.length
        ? db
            .select({ id: branch.id, name: branch.name })
            .from(branch)
            .where(inArray(branch.id, branchRecordIds))
        : [],
      terminalIds.length
        ? db
            .select({ id: posTerminal.id, name: posTerminal.name })
            .from(posTerminal)
            .where(inArray(posTerminal.id, terminalIds))
        : [],
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
            eq(sale.orgId, organizationId),
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
            eq(salesReturn.orgId, organizationId),
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
            eq(cashMovement.orgId, organizationId),
            inArray(cashMovement.sessionId, sessionIds)
          )
        )
        .groupBy(cashMovement.sessionId, cashMovement.type),
    ]);
  const names = new Map(people.map((record) => [record.id, record.name]));
  const locationNames = new Map(
    locations.map((record) => [record.id, record.name])
  );
  const terminalNames = new Map(
    terminals.map((record) => [record.id, record.name])
  );
  return sessions.map((record) => {
    const liveSales = sales.filter((row) => row.sessionId === record.id);
    const liveMovements = movements.filter(
      (row) => row.sessionId === record.id
    );
    const snapshot =
      record.status === 'closed'
        ? (record.closingSummary as {
            paymentTotals?: Record<string, string>;
            cashRefunds?: string;
            cashIn?: string;
            cashOut?: string;
            safeDrops?: string;
          } | null)
        : null;
    let snapshotSales = snapshot?.paymentTotals
      ? Object.entries(snapshot.paymentTotals).map(([method, amount]) => ({
          method,
          total: numeric(amount),
          count: numeric(liveSales.find((row) => row.method === method)?.count),
        }))
      : liveSales.map((row) => ({
          method: row.method,
          total: numeric(row.total),
          count: numeric(row.count),
        }));
    const snapshotMovements = snapshot
      ? (
          [
            ['cash_in', snapshot.cashIn],
            ['cash_out', snapshot.cashOut],
            ['safe_drop', snapshot.safeDrops],
          ] as const
        ).map(([type, amount]) => ({
          type,
          total: numeric(amount),
          count: numeric(liveMovements.find((row) => row.type === type)?.count),
        }))
      : liveMovements.map((row) => ({
          type: row.type,
          total: numeric(row.total),
          count: numeric(row.count),
        }));
    const liveRefunds = refunds
      .filter((row) => row.sessionId === record.id)
      .map((row) => ({
        method: row.method,
        total: numeric(row.total),
        count: numeric(row.count),
      }));
    const snapshotRefunds =
      snapshot?.cashRefunds == null
        ? liveRefunds
        : [
            ...liveRefunds.filter((row) => row.method !== 'cash'),
            {
              method: 'cash',
              total: numeric(snapshot.cashRefunds),
              count: numeric(
                liveRefunds.find((row) => row.method === 'cash')?.count
              ),
            },
          ];
    let reconciliationNote: string | null = null;
    if (
      record.status === 'closed' &&
      !snapshot &&
      record.expectedCash != null
    ) {
      const movement = new Map(
        snapshotMovements.map((row) => [row.type, row.total])
      );
      const cashRefunds = snapshotRefunds
        .filter((row) => row.method === 'cash')
        .reduce((sum, row) => sum + row.total, 0);
      const inferredCash =
        numeric(record.expectedCash) -
        numeric(record.openingCash) -
        (movement.get('cash_in') ?? 0) +
        cashRefunds +
        (movement.get('cash_out') ?? 0) +
        (movement.get('safe_drop') ?? 0);
      const recordedCash = snapshotSales
        .filter((row) => row.method === 'cash')
        .reduce((sum, row) => sum + row.total, 0);
      if (Math.abs(inferredCash - recordedCash) > 0.01) {
        snapshotSales = [
          ...snapshotSales.filter((row) => row.method !== 'cash'),
          {
            method: 'cash',
            total: inferredCash,
            count: numeric(
              liveSales.find((row) => row.method === 'cash')?.count
            ),
          },
        ];
        reconciliationNote =
          'Legacy shift: cash sales inferred from the stored closing reconciliation because the immutable closing snapshot is unavailable.';
      }
    }
    return {
      ...record,
      cashierName: names.get(record.openedBy) ?? record.openedBy,
      approvedByName: record.closedBy
        ? (names.get(record.closedBy) ?? record.closedBy)
        : null,
      reconciliationNote,
      terminalName: record.terminalId
        ? (terminalNames.get(record.terminalId) ?? record.terminalId)
        : 'Unregistered register',
      locationName: record.branchId
        ? (locationNames.get(record.branchId) ?? record.branchId)
        : 'Unassigned location',
      sales: snapshotSales,
      refunds: snapshotRefunds,
      movements: snapshotMovements,
      auditEvents: [] as [],
    };
  });
}
