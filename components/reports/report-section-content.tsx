import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  PackageSearch,
} from 'lucide-react';
import { ReportsCharts } from './reports-charts';
import { ReportExportButton, type ExportBlock } from './report-export-button';
import { ShiftHistory } from '@/components/operations/shift-history';
import { formatCurrency, formatNumber } from '@/lib/utils/format';
import { paymentShareLabel } from '@/lib/reports/report-rules';
import {
  getAgeVerificationReportForQuery,
  getInventoryOperations,
  getPaymentOperations,
  getReportsOverview,
  getReportShifts,
  getSalesReportRows,
  getSalesUnits,
  getStaffReport,
  getStockItemPerformance,
  getTaxOperations,
  type ReportsOverview,
  type ReportsQuery,
} from '@/lib/services/reports-service';
import type { ReportSection } from '@/lib/reports/sections';

type Params = Record<string, string | string[] | undefined>;
type Props = {
  section: ReportSection;
  organizationId: string;
  businessCategory: string | null;
  productLabel?: string;
  salesLabel?: string;
  timeZone: string;
  currency: string;
  period: { from: string; to: string };
  branchIds?: string[];
  locationLabel: string;
  params: Params;
};
const first = (params: Params, key: string) => {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
};
const n = (value: unknown) => Number(value ?? 0);
const money = (value: unknown, currency: string) =>
  formatCurrency(n(value), currency);
const paidOptions = {
  comparison: false,
  costs: false,
  expenses: false,
  monthly: false,
  daily: false,
  payments: false,
  inventory: false,
  products: false,
};
const descriptions: Record<ReportSection, string> = {
  overview: 'How the business is performing at a glance.',
  sales: 'Revenue, refunds, sales patterns and recent transactions.',
  products: 'Item sales performance, revenue and reliable gross margin.',
  payments: 'How customers paid and which transactions need attention.',
  profit: 'Revenue, cost completeness and operating position.',
  inventory: 'Current stock value, availability and losses needing attention.',
  shifts: 'Cash reconciliation and closed-shift operations.',
  compliance:
    'Restricted-sale verification without sensitive identity details.',
  tax: 'Configured tax and fiscal-document activity.',
  staff: 'Operational sales and reconciliation by cashier.',
};

export async function ReportSectionContent(props: Props) {
  const query: ReportsQuery = { branchIds: props.branchIds, ...props.period };
  let content: React.ReactNode;
  if (props.section === 'overview') content = await overview(props, query);
  else if (props.section === 'sales') content = await sales(props, query);
  else if (props.section === 'products') content = await products(props, query);
  else if (props.section === 'payments') content = await payments(props, query);
  else if (props.section === 'profit') content = await profit(props, query);
  else if (props.section === 'inventory')
    content = await inventory(props, query);
  else if (props.section === 'shifts') content = await shifts(props, query);
  else if (props.section === 'compliance')
    content = await compliance(props, query);
  else if (props.section === 'tax') content = await tax(props, query);
  else content = await staff(props, query);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight capitalize">
            {props.section === 'products'
              ? (props.productLabel ?? 'Stock Items')
              : props.section === 'sales'
                ? (props.salesLabel ?? 'Sales')
                : props.section}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {props.section === 'sales' && props.salesLabel === 'Orders'
              ? 'Order revenue, refunds, service patterns and recent transactions.'
              : descriptions[props.section]}
          </p>
        </div>
      </div>
      {content}
    </div>
  );
}

function exportButton(props: Props, blocks: ExportBlock[]) {
  return (
    <ReportExportButton
      section={props.section}
      from={props.period.from}
      to={props.period.to}
      location={props.locationLabel}
      currency={props.currency}
      blocks={blocks}
    />
  );
}
function summaryBlock(report: ReportsOverview): ExportBlock {
  return {
    title: 'Financial summary',
    rows: [
      ['Gross sales', report.totals.grossSales],
      ['Discounts', report.totals.discounts],
      ['Refunds', report.totals.refunds],
      ['Net sales', report.totals.revenue],
      ['Transactions', report.totals.transactions],
      ['Tax', report.totals.tax],
      [
        'COGS',
        report.totals.costDataComplete ? report.totals.costOfGoods : null,
      ],
      [
        'Gross profit',
        report.totals.costDataComplete ? report.totals.grossProfit : null,
      ],
      ['Operating expenses', report.totals.expenses],
    ],
  };
}
function withExport(content: React.ReactNode, button: React.ReactNode) {
  return (
    <>
      <div className="-mt-12 flex justify-end">{button}</div>
      {content}
    </>
  );
}

async function overview(props: Props, query: ReportsQuery) {
  const report = await getReportsOverview(
    props.organizationId,
    props.timeZone,
    query,
    { monthly: false, inventory: false }
  );
  const productBlock: ExportBlock = {
    title: 'Top items',
    headers: ['Item', 'Units', 'Net sales', 'Gross profit'],
    rows: report.topProducts.map((item) => [
      item.name,
      item.quantity,
      item.revenue,
      item.profit,
    ]),
  };
  return withExport(
    <>
      {report.totals.transactions === 0 && (
        <Notice
          title="No completed sales in the selected period."
          detail="Your backend has recent activity outside this date window. Try Last 30 days or choose a custom range to include it."
          action={sectionHref(props.params, 'overview') + '&period=30d'}
        />
      )}
      <Kpis
        items={[
          [
            'Net sales',
            money(report.totals.revenue, props.currency),
            compare(report.totals.revenue, report.comparison.revenuePercent),
          ],
          [
            'Gross profit',
            report.totals.costDataComplete
              ? money(report.totals.grossProfit, props.currency)
              : '—',
            report.totals.costDataComplete
              ? margin(report.totals.grossMargin)
              : 'Cost information incomplete',
          ],
          [
            'Transactions',
            formatNumber(report.totals.transactions),
            compare(
              report.totals.transactions,
              report.comparison.transactionsPercent
            ),
          ],
          [
            'Average transaction',
            money(report.totals.averageSale, props.currency),
            'Paid transactions',
          ],
        ]}
      />
      <Financial report={report} currency={props.currency} />
      <ReportsCharts
        dailyData={report.daily}
        monthlyData={report.monthly}
        paymentData={report.payments}
        currency={props.currency}
        periodLabel={`${props.period.from} – ${props.period.to}`}
      />
      <DataPanel
        title="Top items"
        detail="Up to five items ranked by net sales."
      >
        <Table
          headers={['Item', 'Units sold', 'Net sales', 'Gross profit']}
          rows={report.topProducts
            .slice(0, 5)
            .map((item) => [
              item.name,
              formatNumber(item.quantity),
              money(item.revenue, props.currency),
              item.profit == null ? '—' : money(item.profit, props.currency),
            ])}
          empty="No item sales in this period"
        />
        <Link
          className="inline-flex items-center gap-1 border-t px-4 py-3 text-xs font-semibold text-[var(--dashboard-accent-strong)]"
          href={sectionHref(props.params, 'products')}
        >
          View {props.productLabel ?? 'Stock Items'} report <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </DataPanel>
    </>,
    exportButton(props, [summaryBlock(report), productBlock])
  );
}

async function sales(props: Props, query: ReportsQuery) {
  const filters = {
    page: n(first(props.params, 'report_page') || 1),
    search: first(props.params, 'report_search'),
    status: first(props.params, 'report_status'),
    payment: first(props.params, 'report_payment'),
    cashier: first(props.params, 'report_cashier'),
  };
  const [report, detail, units] = await Promise.all([
    getReportsOverview(props.organizationId, props.timeZone, query, {
      ...paidOptions,
      daily: true,
    }),
    getSalesReportRows(props.organizationId, props.timeZone, query, filters),
    getSalesUnits(props.organizationId, props.timeZone, query),
  ]);
  const blocks: ExportBlock[] = [
    summaryBlock(report),
    {
      title: 'Transactions (current page)',
      headers: [
        'Receipt',
        'Date/time',
        'Cashier',
        'Customer',
        'Items',
        'Payment',
        'Total',
        'Status',
      ],
      rows: detail.rows.map((row) => [
        row.receiptNo,
        row.createdAt.toISOString(),
        row.cashier,
        row.customer,
        row.items,
        row.payment,
        n(row.total),
        row.status,
      ]),
    },
  ];
  return withExport(
    <>
      <Kpis
        items={[
          [
            'Gross sales',
            money(report.totals.grossSales, props.currency),
            'Before discounts',
          ],
          [
            'Net sales',
            money(report.totals.revenue, props.currency),
            'After completed refunds',
          ],
          [
            'Transactions',
            formatNumber(report.totals.transactions),
            'Paid sales',
          ],
          [
            'Average transaction',
            money(report.totals.averageSale, props.currency),
            'Net sales ÷ transactions',
          ],
          [
            'Refunded amount',
            money(report.totals.refunds, props.currency),
            'Completed refunds',
          ],
        ]}
      />
      <ReportsCharts
        dailyData={report.daily}
        monthlyData={[]}
        paymentData={[]}
        currency={props.currency}
        periodLabel={`${props.period.from} – ${props.period.to}`}
        showPayment={false}
      />
      <Financial
        report={report}
        currency={props.currency}
        salesOnly
        units={units}
      />
      <SalesFilters params={props.params} cashiers={detail.cashiers} />
      <DataPanel
        title="Transactions"
        detail={`${detail.total} matching sales · page ${detail.page}`}
      >
        <Table
          headers={[
            'Receipt',
            'Date/time',
            'Cashier',
            'Customer',
            'Items',
            'Payment',
            'Total',
            'Status',
          ]}
          rows={detail.rows.map((row) => [
            <Link
              key={row.id}
              className="font-semibold hover:underline"
              href={`/dashboard/sales/${row.id}`}
            >
              {row.receiptNo}
            </Link>,
            date(row.createdAt, props.timeZone),
            row.cashier ?? '—',
            row.customer ?? 'Walk-in',
            formatNumber(n(row.items)),
            label(row.payment),
            money(row.total, props.currency),
            label(row.status),
          ])}
          empty="No matching transactions"
        />
        <Pagination
          params={props.params}
          page={detail.page}
          total={detail.total}
          pageSize={detail.pageSize}
        />
      </DataPanel>
    </>,
    exportButton(props, blocks)
  );
}

async function products(props: Props, query: ReportsQuery) {
  const rows = await getStockItemPerformance(
    props.organizationId,
    props.timeZone,
    query
  );
  const view = first(props.params, 'item_view') ?? 'revenue';
  const sorted = [...rows].sort((a, b) =>
    view === 'lowest'
      ? a.units - b.units
      : view === 'units'
        ? b.units - a.units
        : view === 'profit'
          ? n(b.grossProfit) - n(a.grossProfit)
          : b.netSales - a.netSales
  );
  const totalUnits = rows.reduce((sum, row) => sum + row.units, 0),
    net = rows.reduce((sum, row) => sum + row.netSales, 0),
    reliable = rows.every((row) => row.grossProfit != null),
    profitValue = rows.reduce((sum, row) => sum + n(row.grossProfit), 0);
  const block: ExportBlock = {
    title: 'Stock item performance',
    headers: [
      'Item',
      'SKU',
      'Category',
      'Units',
      'Gross sales',
      'Discount',
      'Net sales',
      'COGS',
      'Gross profit',
      'Margin %',
    ],
    rows: sorted.map((row) => [
      row.name,
      row.sku,
      row.category,
      row.units,
      row.grossSales,
      row.discount,
      row.netSales,
      row.missingCosts ? null : row.cost,
      row.grossProfit,
      row.margin,
    ]),
  };
  return withExport(
    <>
      <Kpis
        items={[
          ['Units sold', formatNumber(totalUnits), 'Base units'],
          [
            'Items generating sales',
            formatNumber(rows.length),
            'Distinct items',
          ],
          [
            'Average item value',
            money(totalUnits ? net / totalUnits : 0, props.currency),
            'Net sales per unit',
          ],
          [
            'Gross profit',
            reliable ? money(profitValue, props.currency) : '—',
            reliable ? 'Cost-complete items' : 'Cost information incomplete',
          ],
        ]}
      />
      <ViewLinks
        params={props.params}
        active={view}
        values={[
          ['units', 'Top selling'],
          ['lowest', 'Lowest selling'],
          ['revenue', 'Highest revenue'],
          ['profit', 'Highest gross profit'],
        ]}
      />
      <DataPanel
        title={`${props.productLabel ?? 'Item'} sales performance`}
        detail="Sales performance only; current quantities are in Inventory."
      >
        <Table
          headers={[
            'Item / SKU',
            'Category',
            'Units',
            'Gross sales',
            'Discount',
            'Net sales',
            'COGS',
            'Gross profit',
            'Margin',
          ]}
          rows={sorted.map((row) => [
            <span key={row.productId}>
              <strong>{row.name}</strong>
              <small className="block text-muted-foreground">
                {row.sku || 'No SKU'}
              </small>
            </span>,
            row.category ?? 'Uncategorized',
            formatNumber(row.units),
            money(row.grossSales, props.currency),
            money(row.discount, props.currency),
            money(row.netSales, props.currency),
            row.missingCosts ? '—' : money(row.cost, props.currency),
            row.grossProfit == null
              ? '—'
              : money(row.grossProfit, props.currency),
            row.margin == null ? '—' : `${row.margin.toFixed(1)}%`,
          ])}
          empty="No item sales in this period"
        />
      </DataPanel>
    </>,
    exportButton(props, [block])
  );
}

async function payments(props: Props, query: ReportsQuery) {
  const [report, operations] = await Promise.all([
    getReportsOverview(props.organizationId, props.timeZone, query, {
      ...paidOptions,
      payments: true,
    }),
    getPaymentOperations(props.organizationId, props.timeZone, query),
  ]);
  const collected = report.payments.reduce((sum, row) => sum + row.amount, 0),
    by = (name: string) =>
      report.payments
        .filter(
          (row) => row.method.toLowerCase().replace(/[^a-z]/g, '') === name
        )
        .reduce((sum, row) => sum + row.amount, 0),
    unresolved = operations.mpesa
      .filter(
        (row) =>
          !['completed', 'success', 'confirmed'].includes(
            row.status.toLowerCase()
          )
      )
      .reduce((sum, row) => sum + row.count, 0);
  const methodRows = report.payments.map((row) => {
    const refunded = operations.refunds.get(row.method) ?? 0;
    return [
      label(row.method),
      formatNumber(row.transactions),
      money(row.amount, props.currency),
      paymentShareLabel(row.amount, collected),
      money(refunded, props.currency),
      money(Math.max(0, row.amount - refunded), props.currency),
    ];
  });
  const blocks: ExportBlock[] = [
    {
      title: 'Payment methods',
      headers: [
        'Method',
        'Transactions',
        'Collected',
        'Share',
        'Refunded',
        'Net collected',
      ],
      rows: methodRows.map((row) => row.map(String)),
    },
    {
      title: 'M-Pesa operations',
      headers: ['Status', 'Requests', 'Amount'],
      rows: operations.mpesa.map((row) => [row.status, row.count, row.amount]),
    },
  ];
  return withExport(
    <>
      <Kpis
        items={[
          [
            'Collected payments',
            money(collected, props.currency),
            'Successful paid sales',
          ],
          [
            'Cash',
            money(by('cash'), props.currency),
            paymentShareLabel(by('cash'), collected),
          ],
          [
            'M-Pesa',
            money(by('mpesa'), props.currency),
            paymentShareLabel(by('mpesa'), collected),
          ],
          [
            'Card',
            money(by('card'), props.currency),
            paymentShareLabel(by('card'), collected),
          ],
          [
            'Pending / failed',
            formatNumber(unresolved),
            'M-Pesa requests needing review',
          ],
        ]}
      />
      <ReportsCharts
        dailyData={[]}
        monthlyData={[]}
        paymentData={report.payments}
        currency={props.currency}
        periodLabel={`${props.period.from} – ${props.period.to}`}
        showTrend={false}
      />
      <DataPanel
        title="Payment methods"
        detail="Only successful paid sales are collected revenue."
      >
        <Table
          headers={[
            'Method',
            'Transactions',
            'Collected',
            'Share',
            'Refunded',
            'Net collected',
          ]}
          rows={methodRows}
          empty="No payment activity in this period"
        />
      </DataPanel>
      <DataPanel
        title="M-Pesa operations"
        detail="Persisted STK request outcomes for this scope."
      >
        <Table
          headers={['Status', 'Requests', 'Amount']}
          rows={operations.mpesa.map((row) => [
            label(row.status),
            formatNumber(row.count),
            money(row.amount, props.currency),
          ])}
          empty="No M-Pesa requests in this period"
        />
      </DataPanel>
    </>,
    exportButton(props, blocks)
  );
}

async function profit(props: Props, query: ReportsQuery) {
  const report = await getReportsOverview(
    props.organizationId,
    props.timeZone,
    query,
    { ...paidOptions, costs: true, expenses: true, daily: true, products: true }
  );
  const reliable = report.totals.costDataComplete,
    operating = reliable
      ? report.totals.grossProfit - report.totals.expenses
      : null;
  const blocks = [
    summaryBlock(report),
    {
      title: 'Profit trend',
      headers: ['Date', 'Revenue', 'Expenses', 'Operating position'],
      rows: report.daily.map((row) => [
        row.date,
        row.revenue,
        row.expenses,
        reliable ? row.netProfit : null,
      ]),
    },
  ];
  return withExport(
    <>
      <Kpis
        items={[
          [
            'Revenue',
            money(report.totals.revenue, props.currency),
            'Net sales',
          ],
          [
            'COGS',
            reliable ? money(report.totals.costOfGoods, props.currency) : '—',
            reliable
              ? 'Recorded sale-time cost'
              : 'Cost information incomplete',
          ],
          [
            'Gross profit',
            reliable ? money(report.totals.grossProfit, props.currency) : '—',
            reliable
              ? margin(report.totals.grossMargin)
              : 'Cost information incomplete',
          ],
          [
            'Operating expenses',
            money(report.totals.expenses, props.currency),
            'Recorded expenses',
          ],
          [
            'Net operating position',
            operating == null ? '—' : money(operating, props.currency),
            operating == null
              ? 'Cost information incomplete'
              : 'Not accounting net profit',
          ],
        ]}
      />
      <DataPanel
        title="Profit trend"
        detail="Daily revenue and recorded operating expenses."
      >
        <Table
          headers={['Date', 'Revenue', 'Expenses', 'Operating position']}
          rows={report.daily
            .filter((row) => row.revenue || row.expenses)
            .map((row) => [
              row.label,
              money(row.revenue, props.currency),
              money(row.expenses, props.currency),
              reliable ? money(row.netProfit, props.currency) : '—',
            ])}
          empty="No profit activity in this period"
        />
      </DataPanel>
      <DataPanel
        title="Most profitable items"
        detail="Gross profit is hidden where sale-time cost is incomplete."
      >
        <Table
          headers={['Item', 'Units', 'Revenue', 'Gross profit']}
          rows={[...report.topProducts]
            .sort((a, b) => n(b.profit) - n(a.profit))
            .map((row) => [
              row.name,
              formatNumber(row.quantity),
              money(row.revenue, props.currency),
              row.profit == null ? '—' : money(row.profit, props.currency),
            ])}
          empty="No item profit data in this period"
        />
      </DataPanel>
    </>,
    exportButton(props, blocks)
  );
}

async function inventory(props: Props, query: ReportsQuery) {
  const operations = await getInventoryOperations(
    props.organizationId,
    props.timeZone,
    query
  );
  const blocks: ExportBlock[] = [
    {
      title: 'Inventory status',
      headers: [
        'Item',
        'SKU',
        'Packaging',
        'On hand',
        'Available',
        'Reorder level',
        'Stock value',
        'Status',
      ],
      rows: operations.rows.map((row) => [
        row.name,
        row.sku,
        row.packaging,
        row.onHand,
        row.available,
        row.reorder,
        row.value,
        stockStatus(row.available, row.reorder),
      ]),
    },
    {
      title: 'Loss summary',
      headers: ['Type', 'Units', 'Value'],
      rows: operations.losses.map((row) => [row.type, row.quantity, row.value]),
    },
  ];
  return withExport(
    <>
      <Kpis
        items={[
          [
            'Stock value',
            money(
              operations.rows.reduce((sum, row) => sum + row.value, 0),
              props.currency
            ),
            'Available stock at cost',
          ],
          [
            'Units on hand',
            formatNumber(
              operations.rows.reduce((sum, row) => sum + row.onHand, 0)
            ),
            'Physical units',
          ],
          [
            'Low-stock items',
            formatNumber(
              operations.rows.filter(
                (row) => row.available > 0 && row.available <= row.reorder
              ).length
            ),
            'At or below reorder level',
          ],
          [
            'Out-of-stock items',
            formatNumber(
              operations.rows.filter((row) => row.available <= 0).length
            ),
            'No available units',
          ],
        ]}
      />
      <DataPanel
        title="Stock status distribution"
        detail="Point-in-time availability, separate from the selected sales period."
      >
        <div className="grid gap-2 p-4 sm:grid-cols-3">
          <StatusCount
            label="Healthy"
            value={
              operations.rows.filter((row) => row.available > row.reorder)
                .length
            }
          />
          <StatusCount
            label="Low stock"
            value={
              operations.rows.filter(
                (row) => row.available > 0 && row.available <= row.reorder
              ).length
            }
          />
          <StatusCount
            label="Out of stock"
            value={operations.rows.filter((row) => row.available <= 0).length}
          />
        </div>
      </DataPanel>
      <DataPanel
        title="Current stock"
        detail="Packaging shows persisted base-unit conversions."
      >
        <Table
          headers={[
            'Item / SKU',
            'Packaging',
            'On hand',
            'Available',
            'Reorder',
            'Stock value',
            'Status',
          ]}
          rows={operations.rows.map((row) => [
            <span key={row.id}>
              <strong>{row.name}</strong>
              <small className="block text-muted-foreground">
                {row.sku || 'No SKU'}
              </small>
            </span>,
            row.packaging,
            formatNumber(row.onHand),
            formatNumber(row.available),
            formatNumber(row.reorder),
            money(row.value, props.currency),
            stockStatus(row.available, row.reorder),
          ])}
          empty="No location stock balances found"
        />
      </DataPanel>
      <DataPanel
        title="Loss summary"
        detail="Breakage, spillage, damage, missing and expiry records in this period."
      >
        <Table
          headers={['Loss type', 'Units', 'Cost value']}
          rows={operations.losses.map((row) => [
            label(row.type),
            formatNumber(row.quantity),
            money(row.value, props.currency),
          ])}
          empty="No inventory losses in this period"
        />
      </DataPanel>
    </>,
    exportButton(props, blocks)
  );
}

async function shifts(props: Props, query: ReportsQuery) {
  const rows = await getReportShifts(
      props.organizationId,
      props.timeZone,
      query
    ),
    cash = rows
      .flatMap((row) => row.sales)
      .filter((row) => row.method.toLowerCase() === 'cash')
      .reduce((sum, row) => sum + row.total, 0),
    variance = rows.reduce((sum, row) => sum + n(row.variance), 0),
    movement = rows
      .flatMap((row) => row.movements)
      .reduce((sum, row) => sum + row.total, 0);
  const block: ExportBlock = {
    title: 'Shift reconciliation',
    headers: [
      'Shift',
      'Terminal',
      'Cashier',
      'Opened',
      'Closed',
      'Opening float',
      'Expected',
      'Counted',
      'Variance',
      'Status',
    ],
    rows: rows.map((row) => [
      row.sessionNo,
      row.terminalName,
      row.cashierName,
      row.openedAt.toISOString(),
      row.closedAt?.toISOString() ?? null,
      n(row.openingCash),
      n(row.expectedCash),
      n(row.closingCash),
      n(row.variance),
      row.status,
    ]),
  };
  return withExport(
    <>
      <Kpis
        items={[
          [
            'Shifts closed',
            formatNumber(rows.filter((row) => row.status === 'closed').length),
            'In selected period',
          ],
          ['Cash sales', money(cash, props.currency), 'Recorded shift sales'],
          [
            'Cash variance',
            money(variance, props.currency),
            'Counted less expected',
          ],
          [
            'Cash movements',
            money(movement, props.currency),
            'Cash in, out and safe drops',
          ],
        ]}
      />
      {rows.length ? (
        <ShiftHistory shifts={rows} currency={props.currency} />
      ) : (
        <Empty
          title="No shifts in this period"
          detail="Closed and active shift reconciliation will appear here."
        />
      )}
    </>,
    exportButton(props, [block])
  );
}

async function compliance(props: Props, query: ReportsQuery) {
  if (props.businessCategory !== 'liquor_shop')
    return (
      <Empty
        title="Compliance report not enabled"
        detail="Age-verification reporting is available in liquor workspaces."
      />
    );
  const report = await getAgeVerificationReportForQuery(
      props.organizationId,
      props.timeZone,
      query
    ),
    attempts =
      report.summary.verified +
      report.summary.cancelled +
      report.summary.overridden,
    approved = report.summary.verified + report.summary.overridden;
  const block: ExportBlock = {
    title: 'Age-verification activity',
    headers: [
      'Date/time',
      'Receipt',
      'Cashier',
      'Terminal',
      'Branch',
      'Status',
    ],
    rows: report.rows.map((row) => [
      row.createdAt.toISOString(),
      row.receiptNo,
      row.cashierName,
      row.terminalName,
      row.branchName,
      row.status,
    ]),
  };
  return withExport(
    <>
      <Kpis
        items={[
          [
            'Restricted attempts',
            formatNumber(attempts),
            'Recorded checkout checks',
          ],
          [
            'Verified',
            formatNumber(report.summary.verified),
            'Standard verification',
          ],
          [
            'Cancelled checks',
            formatNumber(report.summary.cancelled),
            'Checkout not approved',
          ],
          [
            'Supervisor overrides',
            formatNumber(report.summary.overridden),
            'Approved override',
          ],
          [
            'Compliance rate',
            attempts ? `${((approved / attempts) * 100).toFixed(1)}%` : '—',
            attempts
              ? 'Approved ÷ restricted attempts'
              : 'No restricted attempts',
          ],
        ]}
      />
      <DataPanel
        title="Compliance activity"
        detail="Sensitive ID references and override reasons are intentionally excluded."
      >
        <Table
          headers={[
            'Date/time',
            'Receipt',
            'Cashier',
            'Terminal',
            'Branch',
            'Status',
          ]}
          rows={report.rows.map((row) => [
            date(row.createdAt, props.timeZone),
            row.receiptNo ?? '—',
            row.cashierName ?? '—',
            row.terminalName ?? '—',
            row.branchName ?? '—',
            label(row.status),
          ])}
          empty="No restricted checkout attempts in this period"
        />
      </DataPanel>
    </>,
    exportButton(props, [block])
  );
}

async function tax(props: Props, query: ReportsQuery) {
  const [report, operations] = await Promise.all([
    getReportsOverview(
      props.organizationId,
      props.timeZone,
      query,
      paidOptions
    ),
    getTaxOperations(props.organizationId, props.timeZone, query),
  ]);
  const taxable = operations.taxEnabled ? report.totals.grossSales : 0,
    nonTaxable = operations.taxEnabled ? 0 : report.totals.revenue,
    fiscalTotal = operations.fiscal.reduce((sum, row) => sum + row.count, 0);
  const blocks: ExportBlock[] = [
    summaryBlock(report),
    {
      title: 'Fiscal documents',
      headers: ['Status', 'Documents'],
      rows: operations.fiscal.map((row) => [row.status, row.count]),
    },
  ];
  return withExport(
    <>
      {!operations.taxEnabled && (
        <Notice
          title={`${operations.taxName === 'VAT' || operations.vatRegistered ? 'VAT' : 'Tax'} is not enabled for this business.`}
          detail="Recorded sales are shown as non-taxable; no rate is assumed."
        />
      )}
      <Kpis
        items={[
          [
            'Taxable sales',
            money(taxable, props.currency),
            operations.taxEnabled
              ? `${operations.taxName} configured at ${operations.taxRate}%`
              : 'Tax disabled',
          ],
          [
            'Recorded tax',
            money(report.totals.tax, props.currency),
            'Stored on paid sales',
          ],
          [
            'Tax-exempt / non-taxable',
            money(nonTaxable, props.currency),
            operations.taxEnabled
              ? 'No separate exempt amount recorded'
              : 'Tax not configured',
          ],
          [
            'Fiscal documents',
            formatNumber(fiscalTotal),
            'Persisted eTIMS submissions',
          ],
        ]}
      />
      <DataPanel
        title="Tax breakdown"
        detail="Uses the business tax configuration; no default VAT rate is fabricated."
      >
        <Table
          headers={[
            'Tax type / rate',
            'Taxable amount',
            'Tax recorded',
            'Transactions',
          ]}
          rows={
            operations.taxEnabled
              ? [
                  [
                    `${operations.taxName} · ${operations.taxRate}%`,
                    money(taxable, props.currency),
                    money(report.totals.tax, props.currency),
                    formatNumber(report.totals.transactions),
                  ],
                ]
              : []
          }
          empty="No configured tax breakdown"
        />
      </DataPanel>
      <DataPanel
        title="eTIMS fiscal status"
        detail="Only persisted fiscal submissions are counted."
      >
        <Table
          headers={['Status', 'Documents']}
          rows={operations.fiscal.map((row) => [
            label(row.status),
            formatNumber(row.count),
          ])}
          empty="No fiscal documents in this period"
        />
      </DataPanel>
    </>,
    exportButton(props, blocks)
  );
}

async function staff(props: Props, query: ReportsQuery) {
  const rows = await getStaffReport(
      props.organizationId,
      props.timeZone,
      query
    ),
    totalSales = rows.reduce((sum, row) => sum + row.netSales, 0),
    transactions = rows.reduce((sum, row) => sum + row.transactions, 0);
  const block: ExportBlock = {
    title: 'Staff operations',
    headers: [
      'Staff',
      'Transactions',
      'Net sales',
      'Average transaction',
      'Discounts',
      'Refunds',
      'Shift variance',
      'Restricted sales verified',
    ],
    rows: rows.map((row) => [
      row.name,
      row.transactions,
      row.netSales,
      row.average,
      row.discounts,
      row.refunds,
      row.variance,
      row.verifications,
    ]),
  };
  return withExport(
    <>
      <Kpis
        items={[
          [
            'Active cashiers',
            formatNumber(rows.length),
            'Cashiers with paid sales',
          ],
          [
            'Sales handled',
            money(totalSales, props.currency),
            'Refund-aware net sales',
          ],
          ['Transactions', formatNumber(transactions), 'Paid sales'],
          [
            'Average transaction',
            money(transactions ? totalSales / transactions : 0, props.currency),
            'Across active cashiers',
          ],
        ]}
      />
      <DataPanel
        title="Staff operations"
        detail="Operational and financial activity only—not employee surveillance."
      >
        <Table
          headers={[
            'Staff',
            'Transactions',
            'Net sales',
            'Average',
            'Discounts',
            'Refunds',
            'Shift variance',
            'Verified',
          ]}
          rows={rows.map((row) => [
            row.name,
            formatNumber(row.transactions),
            money(row.netSales, props.currency),
            money(row.average, props.currency),
            money(row.discounts, props.currency),
            money(row.refunds, props.currency),
            money(row.variance, props.currency),
            formatNumber(row.verifications),
          ])}
          empty="No cashier sales in this period"
        />
      </DataPanel>
    </>,
    exportButton(props, [block])
  );
}

function Kpis({ items }: { items: Array<[string, string, string]> }) {
  return (
    <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {items.map(([title, value, detail]) => (
        <article
          key={title}
          className="rounded-xl bg-[var(--dashboard-surface-subtle)] px-4 py-3"
        >
          <p className="text-[11px] font-medium text-muted-foreground">
            {title}
          </p>
          <p className="mt-1.5 text-lg font-semibold tracking-tight tabular-nums">
            {value}
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground">{detail}</p>
        </article>
      ))}
    </section>
  );
}
function Financial({
  report,
  currency,
  salesOnly = false,
  units,
}: {
  report: ReportsOverview;
  currency: string;
  salesOnly?: boolean;
  units?: number;
}) {
  const values = [
    ['Gross sales', report.totals.grossSales],
    ['Discounts', -report.totals.discounts],
    ['Refunds', -report.totals.refunds],
    ['Net sales', report.totals.revenue],
    ['Recorded tax', report.totals.tax],
    ['Units sold', units],
  ] as const;
  const full = [
    ...values.slice(0, 5),
    [
      'COGS',
      report.totals.costDataComplete ? -report.totals.costOfGoods : null,
    ] as const,
    [
      'Gross profit',
      report.totals.costDataComplete ? report.totals.grossProfit : null,
    ] as const,
    ['Operating expenses', -report.totals.expenses] as const,
  ];
  return (
    <DataPanel
      title={salesOnly ? 'Sales summary' : 'Financial breakdown'}
      detail="Consistent report definitions for this scope."
    >
      <dl className="grid sm:grid-cols-2 xl:grid-cols-4">
        {(salesOnly ? values.slice(0, 5) : full).map(([name, value]) => (
          <div
            key={name}
            className="flex items-center justify-between gap-3 border-b px-4 py-3"
          >
            <dt className="text-xs text-muted-foreground">{name}</dt>
            <dd className="text-xs font-semibold tabular-nums">
              {value == null
                ? '—'
                : name === 'Units sold'
                  ? formatNumber(value)
                  : money(value, currency)}
            </dd>
          </div>
        ))}
      </dl>
    </DataPanel>
  );
}
function DataPanel({
  title,
  detail,
  children,
}: {
  title: string;
  detail: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)]">
      <header className="border-b px-4 py-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{detail}</p>
      </header>
      {children}
    </section>
  );
}
function Table({
  headers,
  rows,
  empty,
}: {
  headers: string[];
  rows: React.ReactNode[][];
  empty: string;
}) {
  if (!rows.length)
    return (
      <Empty
        title={empty}
        detail="Completed operational activity will appear here."
      />
    );
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-xs">
        <thead className="bg-muted/20 text-[10px] uppercase tracking-wide text-muted-foreground">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-4 py-2.5 font-semibold">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row, index) => (
            <tr key={index} className="hover:bg-muted/15">
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className="whitespace-nowrap px-4 py-3 tabular-nums"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function Empty({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex min-h-36 flex-col items-center justify-center px-6 py-8 text-center">
      <PackageSearch className="h-5 w-5 text-muted-foreground" />
      <p className="mt-2 text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}
function Notice({
  title,
  detail,
  action,
}: {
  title: string;
  detail: string;
  action?: string;
}) {
  return (
    <div className="flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-4">
      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
      <div>
        <p className="text-xs font-semibold">{title}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">{detail}</p>
        {action && (
          <Link
            href={action}
            className="mt-2 inline-flex text-[11px] font-semibold text-[var(--dashboard-accent-strong)] hover:underline"
          >
            View recent activity →
          </Link>
        )}
      </div>
    </div>
  );
}
function StatusCount({
  label: title,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-muted/25 px-3 py-3">
      <CheckCircle2 className="h-4 w-4 text-[var(--dashboard-accent)]" />
      <span className="text-xs text-muted-foreground">{title}</span>
      <strong className="ml-auto tabular-nums">{formatNumber(value)}</strong>
    </div>
  );
}
function compare(current: number, percentage: number | null) {
  if (percentage == null)
    return current > 0 ? 'New activity' : 'No prior activity';
  return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(1)}% vs previous`;
}
function margin(value: number | null) {
  return value == null
    ? 'Cost information incomplete'
    : `${value.toFixed(1)}% gross margin`;
}
function label(value: string) {
  return value
    .replace(/[_-]/g, ' ')
    .replace(/\bmpesa\b/i, 'M-Pesa')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
function date(value: Date, timeZone: string) {
  return value.toLocaleString('en-KE', {
    timeZone,
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
function stockStatus(available: number, reorder: number) {
  return available <= 0
    ? 'Out of stock'
    : available <= reorder
      ? 'Low stock'
      : 'Healthy';
}
function sectionHref(params: Params, section: string) {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(params))
    if (typeof value === 'string') next.set(key, value);
  next.set('section', section);
  return `/dashboard/reports?${next}`;
}
function ViewLinks({
  params,
  active,
  values,
}: {
  params: Params;
  active: string;
  values: Array<[string, string]>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {values.map(([value, text]) => {
        const next = new URLSearchParams();
        for (const [key, item] of Object.entries(params))
          if (typeof item === 'string') next.set(key, item);
        next.set('item_view', value);
        return (
          <Link
            key={value}
            href={`/dashboard/reports?${next}`}
            className={`rounded-lg px-3 py-2 text-xs font-semibold ${active === value ? 'bg-[var(--dashboard-accent-soft)] text-[var(--dashboard-accent-strong)]' : 'bg-muted/30 text-muted-foreground hover:text-foreground'}`}
          >
            {text}
          </Link>
        );
      })}
    </div>
  );
}
function SalesFilters({
  params,
  cashiers,
}: {
  params: Params;
  cashiers: { id: string; name: string }[];
}) {
  return (
    <form
      method="get"
      className="flex flex-wrap gap-2 rounded-xl bg-[var(--dashboard-surface-subtle)] p-3"
    >
      {Object.entries(params).map(([key, value]) =>
        typeof value === 'string' && !key.startsWith('report_') ? (
          <input key={key} type="hidden" name={key} value={value} />
        ) : null
      )}
      <input
        name="report_search"
        defaultValue={first(params, 'report_search')}
        placeholder="Receipt or customer"
        className="h-9 min-w-48 rounded-lg border bg-background px-3 text-xs"
      />
      <select
        name="report_status"
        defaultValue={first(params, 'report_status') ?? ''}
        className="h-9 rounded-lg border bg-background px-3 text-xs"
      >
        <option value="">All statuses</option>
        <option value="completed">Completed</option>
        <option value="partially_refunded">Partially refunded</option>
        <option value="refunded">Refunded</option>
      </select>
      <select
        name="report_payment"
        defaultValue={first(params, 'report_payment') ?? ''}
        className="h-9 rounded-lg border bg-background px-3 text-xs"
      >
        <option value="">All payments</option>
        <option value="cash">Cash</option>
        <option value="mpesa">M-Pesa</option>
        <option value="card">Card</option>
      </select>
      <select
        name="report_cashier"
        defaultValue={first(params, 'report_cashier') ?? ''}
        className="h-9 rounded-lg border bg-background px-3 text-xs"
      >
        <option value="">All cashiers</option>
        {cashiers.map((cashier) => (
          <option key={cashier.id} value={cashier.id}>
            {cashier.name}
          </option>
        ))}
      </select>
      <button className="h-9 rounded-lg bg-foreground px-4 text-xs font-semibold text-background">
        Filter
      </button>
    </form>
  );
}
function Pagination({
  params,
  page,
  total,
  pageSize,
}: {
  params: Params;
  page: number;
  total: number;
  pageSize: number;
}) {
  const pages = Math.ceil(total / pageSize);
  if (pages <= 1) return null;
  const href = (target: number) => {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(params))
      if (typeof value === 'string') next.set(key, value);
    next.set('report_page', String(target));
    return `/dashboard/reports?${next}`;
  };
  return (
    <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground">
      <span>
        Page {page} of {pages}
      </span>
      <div className="flex gap-2">
        {page > 1 && (
          <Link className="rounded-md border px-3 py-1.5" href={href(page - 1)}>
            Previous
          </Link>
        )}
        {page < pages && (
          <Link className="rounded-md border px-3 py-1.5" href={href(page + 1)}>
            Next
          </Link>
        )}
      </div>
    </div>
  );
}
export function ReportSectionSkeleton() {
  return (
    <div className="space-y-4" aria-label="Loading report">
      <div className="h-10 w-64 animate-pulse rounded-lg bg-muted/50" />
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="h-24 animate-pulse rounded-xl bg-muted/40"
          />
        ))}
      </div>
      <div className="h-52 animate-pulse rounded-xl bg-muted/30" />
    </div>
  );
}
