'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { jsPDF } from 'jspdf';
import {
  Banknote,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clipboard,
  CreditCard,
  Download,
  FilterX,
  Plus,
  Printer,
  Receipt,
  RotateCcw,
  Search,
  Smartphone,
  X,
} from 'lucide-react';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import {
  exportSalesCsv,
  getSaleWithItems,
  voidSale,
  type SalesPageFilters,
} from '@/app/actions/sales';
import { getBusinessSettings } from '@/app/actions/business';
import { ReceiptTemplate } from '@/components/receipt/receipt-template';
import { RefundDialog } from '@/components/pos/refund-dialog';
import { SalesAnalyticsPanels } from '@/components/sales/sales-analytics-panels';

type Data = Awaited<
  ReturnType<typeof import('@/app/actions/sales').getSalesPageData>
>;
type Options = Awaited<
  ReturnType<typeof import('@/app/actions/sales').getSalesFilterOptions>
>;
type Analytics = Awaited<
  ReturnType<typeof import('@/app/actions/sales').getSalesAnalytics>
>;
type Detail = Awaited<ReturnType<typeof getSaleWithItems>>;
type ExportFormat = 'csv' | 'excel' | 'pdf';

const paymentIcons = { cash: Banknote, mpesa: Smartphone, card: CreditCard };

const dateString = (value: Date) => value.toLocaleDateString('en-CA');
const csvRows = (csv: string) =>
  csv
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) =>
      Array.from(
        line.matchAll(/(?:^|,)(?:"((?:[^"]|"")*)"|([^",]*))/g),
        (match) => (match[1] ?? match[2] ?? '').replaceAll('""', '"')
      )
    );
const htmlEscape = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
const reportPeriod = (filters: SalesPageFilters) =>
  filters.from || filters.to
    ? `${filters.from ?? 'Start'} to ${filters.to ?? 'Today'}`
    : 'All available sales';
const salesExcelHtml = (csv: string, filters: SalesPageFilters) => {
  const rows = csvRows(csv);
  return `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;color:#101828}h1{font-size:22px;margin:0;color:#0b1630}p{color:#667085}table{border-collapse:collapse;width:100%;font-size:11px}th{background:#fff3bd;color:#765800;text-align:left}th,td{border:1px solid #dfe3ea;padding:8px}tr:nth-child(even){background:#fafafa}</style></head><body><h1>Pesaby sales report</h1><p>${htmlEscape(reportPeriod(filters))} · Exported ${htmlEscape(formatDateTime(new Date()))}</p><table><thead><tr>${(rows[0] ?? []).map((cell) => `<th>${htmlEscape(cell)}</th>`).join('')}</tr></thead><tbody>${rows
    .slice(1)
    .map(
      (row) =>
        `<tr>${row.map((cell) => `<td>${htmlEscape(cell)}</td>`).join('')}</tr>`
    )
    .join('')}</tbody></table></body></html>`;
};
const salesReportHtml = (csv: string, filters: SalesPageFilters) => {
  const rows = csvRows(csv);
  return `<!doctype html><html><head><meta charset="utf-8"><title>Pesaby sales report</title><style>@page{margin:16mm}body{font-family:Arial,sans-serif;color:#101828}header{border-bottom:3px solid #f4b41b;padding-bottom:14px;margin-bottom:18px}h1{font-size:22px;margin:0;color:#0b1630}p{margin:5px 0 0;color:#667085;font-size:12px}table{border-collapse:collapse;width:100%;font-size:8px}th{background:#fff3bd;color:#765800;text-align:left}th,td{border-bottom:1px solid #e4e7ec;padding:6px 5px;vertical-align:top}tr:nth-child(even){background:#fafafa}@media print{button{display:none}}</style></head><body><header><h1>Pesaby sales report</h1><p>${htmlEscape(reportPeriod(filters))} · Generated ${htmlEscape(formatDateTime(new Date()))}</p></header><table><thead><tr>${(rows[0] ?? []).map((cell) => `<th>${htmlEscape(cell)}</th>`).join('')}</tr></thead><tbody>${rows
    .slice(1)
    .map(
      (row) =>
        `<tr>${row.map((cell) => `<td>${htmlEscape(cell)}</td>`).join('')}</tr>`
    )
    .join('')}</tbody></table></body></html>`;
};
const downloadSalesPdf = (csv: string, filters: SalesPageFilters) => {
  const rows = csvRows(csv);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const margin = 12;
  const widths = [36, 30, 52, 40, 27, 28, 28];
  const columns = [0, 1, 2, 3, 6, 7, 15];
  const headers = ['Receipt', 'Date', 'Customer', 'Cashier', 'Gross', 'Payment', 'Status'];
  const tableWidth = widths.reduce((total, width) => total + width, 0);
  let y = 38;
  const drawHeader = () => {
    doc.setFillColor(255, 243, 189);
    doc.rect(margin, y - 6, tableWidth, 9, 'F');
    doc.setTextColor(118, 88, 0);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    let x = margin;
    headers.forEach((header, index) => { doc.text(header, x + 2, y); x += widths[index]; });
    y += 8;
  };
  doc.setFillColor(255, 248, 220);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 28, 'F');
  doc.setTextColor(11, 22, 48);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Pesaby sales report', margin, 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(102, 112, 133);
  doc.text(`${reportPeriod(filters)} · Generated ${formatDateTime(new Date())}`, margin, 19);
  drawHeader();
  doc.setFont('helvetica', 'normal');
  rows.slice(1).forEach((row, rowIndex) => {
    if (y > 190) { doc.addPage(); y = 18; drawHeader(); }
    if (rowIndex % 2 === 0) { doc.setFillColor(250, 250, 250); doc.rect(margin, y - 5, tableWidth, 8, 'F'); }
    doc.setTextColor(16, 24, 40);
    doc.setFontSize(7.5);
    let x = margin;
    columns.forEach((column, index) => { doc.text((row[column] ?? '').slice(0, index === 2 ? 30 : 22), x + 2, y); x += widths[index]; });
    y += 8;
  });
  doc.save(`pesaby-sales-${dateString(new Date())}.pdf`);
};
const presetRange = (preset: string) => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setDate(end.getDate() - 1);
  if (preset === 'today') return { from: dateString(now), to: dateString(now) };
  if (preset === 'yesterday')
    return { from: dateString(end), to: dateString(end) };
  if (preset === 'week') {
    const start = new Date(now);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    return { from: dateString(start), to: dateString(now) };
  }
  if (preset === 'month')
    return {
      from: dateString(new Date(now.getFullYear(), now.getMonth(), 1)),
      to: dateString(now),
    };
  return {
    from: dateString(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
    to: dateString(new Date(now.getFullYear(), now.getMonth(), 0)),
  };
};

export function SalesManagementView({
  data,
  filters,
  options,
  analytics,
  hasPos,
  manualSale,
}: {
  data: Data;
  filters: SalesPageFilters;
  options: Options;
  analytics: Analytics;
  hasPos: boolean;
  manualSale: React.ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [detail, setDetail] = useState<Detail>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [settings, setSettings] = useState<Awaited<
    ReturnType<typeof getBusinessSettings>
  > | null>(null);
  const [refund, setRefund] = useState(false);
  const [exporting, setExporting] = useState(false);
  const url = (change: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const saved: Record<string, string | undefined> = {
      search: filters.search,
      payment: filters.paymentMethod,
      status: filters.status,
      age: filters.ageVerification,
      customer: filters.customerId,
      cashier: filters.cashierId,
      branch: filters.branchId,
      from: filters.from ? dateString(filters.from) : undefined,
      to: filters.to ? dateString(filters.to) : undefined,
      page: String(filters.page ?? 1),
      pageSize: String(filters.pageSize ?? 50),
      sort: filters.sort,
      direction: filters.direction,
    };
    Object.entries({ ...saved, ...change }).forEach(([key, value]) => {
      if (value && value !== 'all') p.set(key, value);
    });
    if (!Object.hasOwn(change, 'page')) p.set('page', '1');
    return `/dashboard/sales?${p.toString()}`;
  };
  const navigate = (change: Record<string, string | undefined>) =>
    startTransition(() => router.push(url(change)));
  const openDetail = async (saleId: string) => {
    setLoadingDetail(true);
    try {
      const [nextDetail, business] = await Promise.all([
        getSaleWithItems(saleId),
        getBusinessSettings(),
      ]);
      setDetail(nextDetail);
      setSettings(business);
    } finally {
      setLoadingDetail(false);
    }
  };
  const exportSales = async (format: ExportFormat) => {
    setExporting(true);
    try {
      const csv = await exportSalesCsv(filters);
      if (format === 'pdf') {
        downloadSalesPdf(csv, filters);
        return;
      }
      const href = URL.createObjectURL(
        new Blob([format === 'excel' ? salesExcelHtml(csv, filters) : csv], {
          type:
            format === 'excel'
              ? 'application/vnd.ms-excel;charset=utf-8'
              : 'text/csv;charset=utf-8',
        })
      );
      const link = document.createElement('a');
      link.href = href;
      link.download = `pesaby-sales-${dateString(new Date())}.${format === 'excel' ? 'xls' : 'csv'}`;
      link.click();
      URL.revokeObjectURL(href);
    } finally {
      setExporting(false);
    }
  };
  const totals = data.totals;
  const primaryCards = [
    { label: 'Gross sales', value: totals.gross, tone: 'slate' },
    { label: 'Net sales', value: totals.net, tone: 'gold' },
    {
      label: 'Cash sales',
      value: totals.cash,
      logo: '/payment-logos/cash-kes.svg',
      tone: 'cash',
    },
    {
      label: 'M-Pesa sales',
      value: totals.mpesa,
      logo: '/payment-logos/mpesa.svg',
      tone: 'mpesa',
    },
    {
      label: 'Card sales',
      value: totals.card,
      logo: '/payment-logos/visa.svg',
      tone: 'card',
    },
  ] as const;
  const secondaryCards = [
    ['Refunds', totals.refunds],
    ['COGS', totals.cogs],
    ['Gross profit', totals.grossProfit],
    ['Expenses', totals.expenses],
    ['Net profit', totals.netProfit],
  ] as const;
  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4 rounded-xl border bg-gradient-to-r from-[#fffdf0] to-[#fff6c8] p-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#9b7000]">
            Pesaby workspace
          </p>
          <h1 className="mt-1 text-2xl font-bold">Sales</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            A complete view of transactions, returns and profitability.
          </p>
        </div>
        {hasPos ? (
          <Link
            href="/dashboard/pos"
            className="inline-flex items-center gap-2 rounded-lg bg-[#e42527] px-4 py-3 text-sm font-bold text-white"
          >
            <Plus className="h-4 w-4" />
            New sale
          </Link>
        ) : (
          manualSale
        )}
      </header>
      <SalesFilters
        filters={filters}
        options={options}
        onNavigate={navigate}
        pending={pending}
        onExport={exportSales}
        exporting={exporting}
      />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {primaryCards.map((card) => (
          <MetricCard
            key={card.label}
            label={card.label}
            value={formatCurrency(Number(card.value ?? 0))}
            logo={'logo' in card ? card.logo : undefined}
            tone={card.tone}
            primary
          />
        ))}
      </section>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {secondaryCards.map(([label, value]) => (
          <MetricCard
            key={label}
            label={label}
            value={formatCurrency(Number(value ?? 0))}
          />
        ))}
      </section>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Transactions"
          value={String(totals.transactions ?? 0)}
          comparison={data.comparison?.transactions}
        />
        <MetricCard
          label="Average sale"
          value={formatCurrency(Number(totals.average ?? 0))}
          comparison={data.comparison?.average}
        />
        <MetricCard
          label="Quantity sold"
          value={String(totals.quantity ?? 0)}
        />
        <MetricCard
          label="Gross margin"
          value={`${Number(totals.grossMargin ?? 0).toFixed(1)}%`}
          comparison={data.comparison?.grossProfit}
        />
        <MetricCard
          label="Tax collected"
          value={formatCurrency(Number(totals.tax ?? 0))}
        />
        <MetricCard
          label="Discounts"
          value={formatCurrency(Number(totals.discounts ?? 0))}
        />
        <MetricCard
          label="Pending balance"
          value={formatCurrency(Number(totals.pending ?? 0))}
        />
        <MetricCard
          label="Refund count"
          value={String(totals.refundCount ?? 0)}
        />
      </section>
      <section className="relative overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
          <div>
            <h2 className="font-semibold">Transactions</h2>
            <p className="text-xs text-muted-foreground">
              Showing {data.total ? (data.page - 1) * data.pageSize + 1 : 0}–
              {Math.min(data.page * data.pageSize, data.total)} of{' '}
              {data.total.toLocaleString()} matching sales
            </p>
          </div>
          <select
            value={String(data.pageSize)}
            onChange={(event) => navigate({ pageSize: event.target.value })}
            className="rounded-lg border px-2.5 py-2 text-sm"
          >
            <option value="25">25 rows</option>
            <option value="50">50 rows</option>
            <option value="100">100 rows</option>
          </select>
        </div>
        {loadingDetail && <DetailLoadingOverlay />}
        {!loadingDetail && data.rows.length === 0 && (
          <div className="p-12 text-center">
            <Receipt className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 font-semibold">No sales match these filters</p>
            <button
              onClick={() =>
                navigate({
                  search: undefined,
                  payment: undefined,
                  status: undefined,
                  customer: undefined,
                  cashier: undefined,
                  branch: undefined,
                  from: undefined,
                  to: undefined,
                })
              }
              className="mt-3 text-sm font-semibold text-blue-700"
            >
              Clear filters
            </button>
          </div>
        )}
        {data.rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-sm">
              <thead className="sticky top-0 z-10 bg-[#fafaf8] text-left text-xs text-muted-foreground shadow-[0_1px_0_rgba(226,232,240,.9)]">
                <tr>
                  <SortHeader label="Receipt" />
                  <SortHeader
                    label="Date"
                    sort="date"
                    filters={filters}
                    onNavigate={navigate}
                  />
                  <th className="px-4 py-3">Customer</th>
                  <SortHeader label="Cashier" />
                  <SortHeader
                    label="Payment"
                    sort="payment"
                    filters={filters}
                    onNavigate={navigate}
                  />
                  <SortHeader
                    label="Total"
                    sort="amount"
                    filters={filters}
                    onNavigate={navigate}
                    align="right"
                  />
                  <SortHeader
                    label="Status"
                    sort="status"
                    filters={filters}
                    onNavigate={navigate}
                  />
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {data.rows.map(
                  ({ record, customerName, branchName, cashierName }) => (
                    <tr
                      key={record.id}
                      onClick={() => openDetail(record.id)}
                      className="cursor-pointer border-t hover:bg-muted/40"
                    >
                      <td className="px-4 py-3 font-mono text-xs font-semibold">
                        {record.receiptNo}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDateTime(record.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        {customerName ?? 'Walk-in'}
                        {branchName && (
                          <span className="block text-xs text-muted-foreground">
                            {branchName}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">{cashierName ?? '—'}</td>
                      <td className="px-4 py-3">
                        <PaymentMark method={record.paymentMethod} />
                        {record.mpesaRef && (
                          <span className="block text-xs text-muted-foreground">
                            {record.mpesaRef}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">
                        {formatCurrency(record.total)}
                      </td>
                      <td className="px-4 py-3">
                        <Status status={record.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            openDetail(record.id);
                          }}
                          className="rounded-md p-2 text-blue-700 hover:bg-blue-50"
                          aria-label={`View ${record.receiptNo}`}
                        >
                          <ChevronRight className="h-4 w-4 text-slate-400" />
                        </button>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
        <Pagination data={data} onNavigate={navigate} />
      </section>
      <SalesAnalyticsPanels analytics={analytics} />
      {detail && settings && (
        <SaleDetail
          detail={detail}
          settings={settings}
          onClose={() => {
            setDetail(null);
            setRefund(false);
          }}
          onRefund={() => setRefund(true)}
          onVoided={() => {
            setDetail(null);
            router.refresh();
          }}
        />
      )}
      {detail && refund && (
        <RefundDialog
          sale={{ ...detail.record, items: detail.items }}
          onClose={() => setRefund(false)}
          onSuccess={() => {
            setRefund(false);
            setDetail(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function SalesFilters({
  filters,
  options,
  onNavigate,
  pending,
  onExport,
  exporting,
}: {
  filters: SalesPageFilters;
  options: Options;
  onNavigate: (change: Record<string, string | undefined>) => void;
  pending: boolean;
  onExport: (format: ExportFormat) => void;
  exporting: boolean;
}) {
  const [search, setSearch] = useState(filters.search ?? '');
  const [exportOpen, setExportOpen] = useState(false);
  const apply = (form: FormData) =>
    onNavigate({
      search: String(form.get('search') || ''),
      payment: String(form.get('payment') || ''),
      status: String(form.get('status') || ''),
      age: String(form.get('age') || ''),
      customer: String(form.get('customer') || ''),
      cashier: String(form.get('cashier') || ''),
      branch: String(form.get('branch') || ''),
      from: String(form.get('from') || ''),
      to: String(form.get('to') || ''),
    });
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        apply(new FormData(event.currentTarget));
      }}
      className="rounded-xl border bg-white p-4 shadow-sm"
    >
      <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-8">
        <label className="relative md:col-span-2">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <input
            name="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Receipt or payment reference"
            className="w-full rounded-lg border px-9 py-2.5 text-sm"
          />
        </label>
        <Select
          name="payment"
          value={filters.paymentMethod}
          label="All payments"
          options={['cash', 'mpesa', 'card', 'split', 'credit']}
        />
        <Select
          name="status"
          value={filters.status}
          label="All statuses"
          options={[
            'completed',
            'pending',
            'partially_refunded',
            'refunded',
            'cancelled',
            'draft',
            'held',
          ]}
        />
        <Select
          name="age"
          value={filters.ageVerification}
          label="Age verification"
          options={[
            ['verified', 'Age verified'],
            ['not_verified', 'Not verified'],
          ]}
        />
        <Select
          name="customer"
          value={filters.customerId}
          label="All customers"
          options={options.customers.map((item) => [item.id, item.name])}
        />
        <Select
          name="cashier"
          value={filters.cashierId}
          label="All cashiers"
          options={options.cashiers.map((item) => [item.id, item.name])}
        />
        <Select
          name="branch"
          value={filters.branchId}
          label="All locations"
          options={options.branches.map((item) => [item.id, item.name])}
        />
        <input
          name="from"
          type="date"
          defaultValue={filters.from ? dateString(filters.from) : ''}
          className="rounded-lg border px-3 py-2 text-sm"
        />
        <input
          name="to"
          type="date"
          defaultValue={filters.to ? dateString(filters.to) : ''}
          className="rounded-lg border px-3 py-2 text-sm"
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          disabled={pending}
          className="rounded-lg bg-[#050a1f] px-4 py-2 text-sm font-semibold text-white"
        >
          {pending ? 'Loading…' : 'Apply filters'}
        </button>
        {[
          ['Today', 'today'],
          ['Yesterday', 'yesterday'],
          ['This week', 'week'],
          ['This month', 'month'],
          ['Last month', 'last-month'],
        ].map(([label, preset]) => (
          <button
            type="button"
            key={preset}
            onClick={() => onNavigate(presetRange(preset))}
            className="rounded-lg border px-3 py-2 text-xs font-semibold"
          >
            {label}
          </button>
        ))}
        <div className="relative">
          <button
            type="button"
            onClick={() => setExportOpen((open) => !open)}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#ead48d] bg-[#fffdf5] px-3 py-2 text-sm font-semibold text-[#5f4900] disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            {exporting ? 'Exporting…' : 'Export'}
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          {exportOpen && (
            <div className="absolute left-0 z-30 mt-2 w-44 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
              <button
                type="button"
                onClick={() => {
                  setExportOpen(false);
                  onExport('csv');
                }}
                className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-[#fff8e8]"
              >
                Download CSV
              </button>
              <button
                type="button"
                onClick={() => {
                  setExportOpen(false);
                  onExport('excel');
                }}
                className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-[#fff8e8]"
              >
                Download Excel
              </button>
              <button
                type="button"
                onClick={() => {
                  setExportOpen(false);
                  onExport('pdf');
                }}
                className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-[#fff8e8]"
              >
                Print / save PDF
              </button>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() =>
            onNavigate({
              search: undefined,
              payment: undefined,
              status: undefined,
              age: undefined,
              customer: undefined,
              cashier: undefined,
              branch: undefined,
              from: undefined,
              to: undefined,
            })
          }
          className="ml-auto inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-semibold"
        >
          <FilterX className="h-3.5 w-3.5" />
          Clear
        </button>
      </div>
    </form>
  );
}
function Select({
  name,
  value,
  label,
  options,
}: {
  name: string;
  value?: string;
  label: string;
  options: Array<string | [string, string]>;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(value ?? '');
  useEffect(() => setSelected(value ?? ''), [value]);
  const normalized = options.map((option) =>
    Array.isArray(option)
      ? option
      : ([
          option,
          option === 'mpesa' ? 'M-Pesa' : option.replaceAll('_', ' '),
        ] as [string, string])
  );
  const selectedLabel =
    normalized.find(([id]) => id === selected)?.[1] ?? label;
  return (
    <div className="relative">
      <input type="hidden" name={name} value={selected} />
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-[#dfe3ea] bg-white px-3 py-2 text-left text-sm font-medium text-[#344054] shadow-[0_1px_1px_rgba(16,24,40,.02)] transition-colors hover:border-[#e5bf46] focus:outline-none focus:ring-2 focus:ring-[#f9b21d]/25"
      >
        <span className="truncate capitalize">{selectedLabel}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180 text-[#9a6900]' : 'text-[#667085]'}`}
        />
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-[#ead48d] bg-white p-1 shadow-[0_12px_24px_rgba(16,24,40,.14)]">
            <button
              type="button"
              onClick={() => {
                setSelected('');
                setOpen(false);
              }}
              className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${!selected ? 'bg-[#fff3bd] font-semibold text-[#765800]' : 'text-[#344054] hover:bg-[#fff8e8]'}`}
            >
              {label}
            </button>
            {normalized.map(([id, text]) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setSelected(id);
                  setOpen(false);
                }}
                className={`w-full rounded-md px-3 py-2 text-left text-sm capitalize transition-colors ${selected === id ? 'bg-[#fff3bd] font-semibold text-[#765800]' : 'text-[#344054] hover:bg-[#fff8e8]'}`}
              >
                {text}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
function PaymentMark({ method }: { method: string }) {
  const logos: Record<string, string> = {
    cash: '/payment-logos/cash-kes.svg',
    mpesa: '/payment-logos/mpesa.svg',
    card: '/payment-logos/visa.svg',
  };
  const Icon = paymentIcons[method as keyof typeof paymentIcons] ?? Receipt;
  const label =
    method === 'mpesa'
      ? 'M-Pesa'
      : method.charAt(0).toUpperCase() + method.slice(1);
  return (
    <span className="inline-flex items-center gap-2">
      <span className="inline-flex h-7 min-w-14 items-center justify-center rounded-md border border-slate-200 bg-white px-1.5">
        {logos[method] ? (
          <Image
            src={logos[method]}
            alt=""
            width={44}
            height={20}
            className="h-4 w-auto object-contain"
          />
        ) : (
          <Icon className="h-3.5 w-3.5" />
        )}
      </span>
      <span className="text-xs font-medium text-slate-700">{label}</span>
    </span>
  );
}
function MetricCard({
  label,
  value,
  comparison,
  logo,
  tone = 'plain',
  primary = false,
}: {
  label: string;
  value: string;
  comparison?: number | null;
  logo?: string;
  tone?: 'plain' | 'slate' | 'gold' | 'cash' | 'mpesa' | 'card';
  primary?: boolean;
}) {
  const tones = {
    plain: 'border-slate-200 bg-white',
    slate: 'border-slate-200 bg-white',
    gold: 'border-[#f0d77f] bg-gradient-to-br from-[#fffefa] to-[#fff5ca]',
    cash: 'border-[#f2d27b] bg-gradient-to-br from-[#fffefa] via-[#fff9e8] to-[#fff0bd]',
    mpesa:
      'border-[#9cdbb3] bg-gradient-to-br from-[#ffffff] via-[#f4fff7] to-[#dcf6e5]',
    card: 'border-[#9bbcf4] bg-gradient-to-br from-[#ffffff] via-[#f4f8ff] to-[#dce9ff]',
  };
  return (
    <div
      className={`min-w-0 rounded-xl border px-5 py-5 shadow-[0_1px_2px_rgba(16,24,40,.04)] ${primary ? 'min-h-[104px]' : 'min-h-[84px]'} ${tones[tone]}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-wide text-slate-600">
            {label}
          </p>
          <p
            className={`${primary ? 'mt-1.5 text-[16px]' : 'mt-1 text-[15px]'} whitespace-nowrap font-semibold leading-tight tracking-[-.01em] text-slate-950 tabular-nums`}
          >
            {value}
          </p>
        </div>
        {logo && (
          <span className="flex h-7 w-10 shrink-0 items-center justify-center rounded-lg border border-white bg-white p-1 shadow-sm">
            <Image
              src={logo}
              alt=""
              width={38}
              height={24}
              className="h-4 w-auto object-contain"
            />
          </span>
        )}
      </div>
      {comparison !== undefined && comparison !== null && (
        <p
          className={`mt-2 text-xs font-medium ${comparison >= 0 ? 'text-emerald-700' : 'text-red-700'}`}
        >
          {comparison >= 0 ? '+' : ''}
          {comparison.toFixed(1)}% vs prior period
        </p>
      )}
    </div>
  );
}
function SortHeader({
  label,
  sort,
  filters,
  onNavigate,
  align,
}: {
  label: string;
  sort?: SalesPageFilters['sort'];
  filters?: SalesPageFilters;
  onNavigate?: (change: Record<string, string>) => void;
  align?: string;
}) {
  const active = sort && filters?.sort === sort;
  return (
    <th className={`px-4 py-3 ${align === 'right' ? 'text-right' : ''}`}>
      {sort ? (
        <button
          onClick={() =>
            onNavigate?.({
              sort,
              direction:
                active && filters?.direction !== 'asc' ? 'asc' : 'desc',
            })
          }
          className="inline-flex items-center gap-1 font-medium"
        >
          {label}
          {active && filters?.direction === 'asc' ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </button>
      ) : (
        label
      )}
    </th>
  );
}
function Status({ status }: { status: string }) {
  const style =
    status === 'completed'
      ? 'bg-emerald-100 text-emerald-800'
      : status === 'pending'
        ? 'bg-blue-100 text-blue-800'
        : status === 'refunded'
          ? 'bg-orange-100 text-orange-800'
          : status === 'partially_refunded'
            ? 'bg-amber-100 text-amber-800'
            : status === 'cancelled' || status === 'voided'
              ? 'bg-slate-100 text-slate-700'
              : 'bg-slate-100 text-slate-700';
  const label = status === 'partially_refunded' ? 'Partial' : status;
  return (
    <span
      className={`rounded-full px-2 py-1 text-xs font-semibold capitalize ${style}`}
    >
      {label.replaceAll('_', ' ')}
    </span>
  );
}
function DetailLoadingOverlay() {
  return (
    <div
      className="flex h-14 items-center justify-center"
      role="status"
      aria-label="Opening transaction details"
    >
      <style>{`@keyframes pesaby-detail-loader { 0%, 100% { transform: translateY(0) scale(.72); opacity: .35; } 45% { transform: translateY(-5px) scale(1); opacity: 1; } }`}</style>
      <div className="flex items-center gap-1.5">
        {Array.from({ length: 8 }).map((_, index) => (
          <span
            key={index}
            className="h-2 w-2 rounded-full bg-[#f4b41b]"
            style={{
              animation: 'pesaby-detail-loader 850ms ease-in-out infinite',
              animationDelay: `${index * 95}ms`,
            }}
          />
        ))}
        <span className="sr-only">Opening transaction details</span>
      </div>
    </div>
  );
}
function Pagination({
  data,
  onNavigate,
}: {
  data: Data;
  onNavigate: (change: Record<string, string>) => void;
}) {
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-slate-50/70 px-4 py-3">
      <p className="text-xs font-medium text-slate-500">
        Page {data.page} of {pages}
      </p>
      <div className="flex items-center gap-2">
        <button
          disabled={data.page <= 1}
          onClick={() => onNavigate({ page: String(data.page - 1) })}
          className="rounded-lg border bg-white px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>
        <span className="min-w-8 rounded-lg bg-[#050a1f] px-2 py-2 text-center text-sm font-bold text-white">
          {data.page}
        </span>
        <button
          disabled={data.page >= pages}
          onClick={() => onNavigate({ page: String(data.page + 1) })}
          className="rounded-lg border bg-white px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
function SaleDetail({
  detail,
  settings,
  onClose,
  onRefund,
  onVoided,
}: {
  detail: NonNullable<Detail>;
  settings: Awaited<ReturnType<typeof getBusinessSettings>>;
  onClose: () => void;
  onRefund: () => void;
  onVoided: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [voiding, setVoiding] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  useEffect(() => {
    const bodyOverflow = document.body.style.overflow;
    const documentOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = documentOverflow;
    };
  }, []);
  const refunded = detail.returns.reduce(
    (sum, item) => sum + Number(item.amount),
    0
  );
  const runVoid = async () => {
    setVoiding(true);
    try {
      await voidSale({ saleId: detail.record.id, reason: voidReason });
      onVoided();
    } finally {
      setVoiding(false);
    }
  };
  const downloadReceipt = () => {
    const lines = [
      `Receipt: ${detail.record.receiptNo}`,
      `Date: ${formatDateTime(detail.record.createdAt)}`,
      `Customer: ${detail.customerName ?? 'Walk-in'}`,
      '',
      ...detail.items.map(
        (item) =>
          `${item.productName} x${item.quantity} ${formatCurrency(item.totalPrice)}`
      ),
      '',
      `Total: ${formatCurrency(detail.record.total)}`,
    ];
    const link = document.createElement('a');
    link.href = URL.createObjectURL(
      new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
    );
    link.download = `${detail.record.receiptNo}.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
  };
  return (
    <div className="fixed inset-0 z-50 flex overscroll-none justify-end bg-slate-950/25 transition-opacity">
      <aside className="flex h-full w-full max-w-[680px] flex-col overflow-hidden overscroll-contain border-l border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Transaction details
            </h2>
            <p className="mt-1 font-mono text-sm font-bold">
              {detail.record.receiptNo}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {formatDateTime(detail.record.createdAt)}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto overscroll-contain p-5">
          <div className="grid grid-cols-2 gap-3">
            <Info
              label="Status"
              value={<Status status={detail.record.status} />}
            />
            <Info label="Cashier" value={detail.cashierName ?? '—'} />
            <Info
              label="Customer"
              value={
                detail.record.customerId ? (
                  <Link
                    href={`/dashboard/customers/${detail.record.customerId}`}
                    className="text-blue-700 hover:underline"
                  >
                    {detail.customerName ?? 'Customer profile'}
                  </Link>
                ) : (
                  'Walk-in'
                )
              }
            />
            <Info label="Location" value={detail.branchName ?? '—'} />
          </div>
          {detail.customerPhone || detail.customerEmail ? (
            <div className="rounded-lg border p-3 text-sm">
              <p className="font-semibold">Customer contact</p>
              <p className="mt-1 text-muted-foreground">
                {[detail.customerPhone, detail.customerEmail]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <Info
              label="Transaction ID"
              value={
                <span
                  title={detail.record.id}
                  className="font-mono text-[11px]"
                >
                  {detail.record.id.slice(0, 12)}…
                </span>
              }
            />
            <Info
              label="Age verification"
              value={
                detail.record.ageVerified
                  ? `Verified${detail.record.ageVerifiedAt ? ` · ${formatDateTime(detail.record.ageVerifiedAt)}` : ''}`
                  : 'Not verified / N/A'
              }
            />
            <Info
              label="POS session"
              value={detail.session?.sessionNo ?? '—'}
            />
            <Info
              label="Created"
              value={formatDateTime(detail.record.createdAt)}
            />
          </div>
          <div className="rounded-lg border">
            <div className="border-b p-3 font-semibold">Items</div>
            {detail.items.map((item) => (
              <div
                key={item.id}
                className="flex justify-between gap-3 border-b p-3 text-sm last:border-0"
              >
                <div>
                  <p className="font-medium">{item.productName}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.quantity} × {formatCurrency(item.unitPrice)} · cost{' '}
                    {formatCurrency(item.unitCostAtSale)}
                    <span className="block">
                      SKU: {item.sku ?? '—'} · Category:{' '}
                      {item.categoryName ?? 'Uncategorized'}
                    </span>
                  </p>
                </div>
                <p className="font-semibold">
                  {formatCurrency(item.totalPrice)}
                </p>
              </div>
            ))}
          </div>
          <div className="rounded-lg bg-muted/50 p-4 text-sm">
            <Row label="Subtotal" value={detail.record.subtotal} />
            <Row
              label="Discount"
              value={detail.record.discountAmount}
              negative
            />
            <Row label="VAT / Tax" value={detail.record.taxAmount} />
            <Row label="Rounding" value={detail.record.roundingAmount} />
            <Row label="Refunded" value={refunded} negative />
            <div className="mt-2 flex justify-between border-t pt-2 text-base font-bold">
              <span>Net total</span>
              <span>
                {formatCurrency(Number(detail.record.total) - refunded)}
              </span>
            </div>
          </div>
          <div className="rounded-lg border p-3">
            <p className="font-semibold">Payments</p>
            {detail.payments.length ? (
              detail.payments.map((payment) => (
                <p key={payment.id} className="mt-2 text-sm capitalize">
                  {payment.method}: {formatCurrency(payment.amount)} ·{' '}
                  {payment.status} · {formatDateTime(payment.createdAt)}{' '}
                  {payment.reference ? `· ${payment.reference}` : ''}
                </p>
              ))
            ) : (
              <p className="mt-2 text-sm capitalize">
                {detail.record.paymentMethod}
                {detail.record.mpesaRef ? ` · ${detail.record.mpesaRef}` : ''}
              </p>
            )}
          </div>
          {detail.returns.length > 0 && (
            <div className="rounded-lg border p-3">
              <p className="font-semibold">Refund history</p>
              {detail.returns.map((item) => (
                <p key={item.id} className="mt-2 text-sm">
                  {formatCurrency(item.amount)} · {item.refundMethod} ·{' '}
                  {item.reason} · {item.userName ?? 'Unknown user'} ·{' '}
                  {formatDateTime(item.createdAt)}
                </p>
              ))}
            </div>
          )}
          {detail.refundItems.length > 0 && (
            <div className="rounded-lg border p-3">
              <p className="font-semibold">Returned items</p>
              {detail.refundItems.map(({ item, returnNo }) => (
                <div
                  key={item.id}
                  className="mt-2 flex justify-between gap-3 text-sm"
                >
                  <span>
                    {item.productName} · {item.quantity} returned ·{' '}
                    {item.disposition}
                  </span>
                  <span className="shrink-0 font-medium">{returnNo}</span>
                </div>
              ))}
            </div>
          )}
          {detail.audit.length > 0 && (
            <div className="rounded-lg border p-3">
              <p className="font-semibold">Audit history</p>
              {detail.audit.map(({ event, userName }) => (
                <div
                  key={event.id}
                  className="mt-2 flex justify-between gap-3 text-xs"
                >
                  <span className="capitalize">
                    {event.action.replaceAll('.', ' ')}
                  </span>
                  <span className="text-right text-muted-foreground">
                    {userName ?? 'System'} · {formatDateTime(event.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
          {previewOpen && (
            <div className="rounded-lg border bg-slate-50 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-semibold">Receipt preview</p>
                <button
                  onClick={() => setPreviewOpen(false)}
                  className="text-xs font-semibold text-muted-foreground"
                >
                  Close preview
                </button>
              </div>
              <ReceiptTemplate
                sale={{ ...detail.record, items: detail.items }}
                businessName={settings.receiptBusinessName}
                businessPhone={settings.receiptPhone}
                businessAddress={settings.receiptAddress}
                receiptFooter={settings.receiptFooter}
                cashierName={detail.cashierName ?? 'Cashier'}
                customerName={detail.customerName ?? 'Walk-in'}
                taxName={settings.taxName}
                layout={settings.receiptLayout}
                template={settings.receiptTemplate}
                logoUrl={settings.receiptLogoUrl}
                showPhone={settings.receiptShowPhone}
                showAddress={settings.receiptShowAddress}
                showCashier={settings.receiptShowCashier}
                showCustomer={settings.receiptShowCustomer}
                showPayment={settings.receiptShowPayment}
                showQrCode={settings.receiptShowQrCode}
                showItemSku={settings.receiptShowItemSku}
              />
            </div>
          )}
          <div className="receipt-preview-origin hidden print:block">
            <ReceiptTemplate
              sale={{ ...detail.record, items: detail.items }}
              businessName={settings.receiptBusinessName}
              businessPhone={settings.receiptPhone}
              businessAddress={settings.receiptAddress}
              receiptFooter={settings.receiptFooter}
              cashierName={detail.cashierName ?? 'Cashier'}
              customerName={detail.customerName ?? 'Walk-in'}
              taxName={settings.taxName}
              layout={settings.receiptLayout}
              template={settings.receiptTemplate}
              logoUrl={settings.receiptLogoUrl}
              showPhone={settings.receiptShowPhone}
              showAddress={settings.receiptShowAddress}
              showCashier={settings.receiptShowCashier}
              showCustomer={settings.receiptShowCustomer}
              showPayment={settings.receiptShowPayment}
              showQrCode={settings.receiptShowQrCode}
              showItemSku={settings.receiptShowItemSku}
            />
          </div>
          {voidOpen && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="font-semibold text-red-900">Void this sale?</p>
              <p className="mt-1 text-sm text-red-800">
                Inventory will be restored and the transaction remains in the
                audit history.
              </p>
              <textarea
                value={voidReason}
                onChange={(event) => setVoidReason(event.target.value)}
                placeholder="Reason for void (at least 3 characters)"
                className="mt-3 w-full rounded-lg border p-2 text-sm"
              />
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => setVoidOpen(false)}
                  className="rounded-lg border px-3 py-2 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  disabled={voiding || voidReason.trim().length < 3}
                  onClick={runVoid}
                  className="rounded-lg bg-red-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {voiding ? 'Voiding…' : 'Confirm void'}
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-t bg-white px-4 py-3 shadow-[0_-6px_18px_rgba(15,23,42,.06)]">
          <button
            onClick={() => {
              navigator.clipboard.writeText(detail.record.receiptNo);
              setCopied(true);
              setTimeout(() => setCopied(false), 1200);
            }}
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold"
          >
            <Clipboard className="h-4 w-4" />
            {copied ? 'Copied' : 'Copy receipt'}
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold"
          >
            <Printer className="h-4 w-4" />
            Reprint receipt
          </button>
          <button
            onClick={() => setPreviewOpen(true)}
            className="rounded-lg border px-3 py-2 text-sm font-semibold"
          >
            Preview
          </button>
          <button
            onClick={downloadReceipt}
            className="rounded-lg border px-3 py-2 text-sm font-semibold"
          >
            Download
          </button>
          {detail.customerEmail && (
            <a
              href={`mailto:${detail.customerEmail}?subject=Receipt ${detail.record.receiptNo}`}
              className="rounded-lg border px-3 py-2 text-sm font-semibold"
            >
              Email receipt
            </a>
          )}
          {['completed', 'partially_refunded'].includes(
            detail.record.status
          ) && (
            <button
              onClick={onRefund}
              className="ml-auto inline-flex items-center gap-2 rounded-lg bg-[#e42527] px-3 py-2 text-sm font-semibold text-white"
            >
              <RotateCcw className="h-4 w-4" />
              Refund / return
            </button>
          )}
          {['completed', 'pending'].includes(detail.record.status) && (
            <button
              onClick={() => setVoidOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-red-300 px-3 py-2 text-sm font-semibold text-red-700"
            >
              Void
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}
function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}
function Row({
  label,
  value,
  negative,
}: {
  label: string;
  value: string | number;
  negative?: boolean;
}) {
  const amount = Number(value);
  if (!amount) return null;
  return (
    <div
      className={`flex justify-between py-0.5 ${negative ? 'text-red-700' : ''}`}
    >
      <span>{label}</span>
      <span>
        {negative ? '-' : ''}
        {formatCurrency(amount)}
      </span>
    </div>
  );
}
