'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Printer,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/page-loader';
import { notify } from '@/lib/notify';
import { formatCurrency } from '@/lib/utils';
import { getRecentSales } from '@/app/actions/pos-queries';
import type { Sale, SaleItem } from '@/lib/db/schema';

type SaleRecord = Sale & { items: SaleItem[] };
type TransactionTab = 'purchase' | 'payment' | 'return';
interface SalesHistoryModalProps {
  onClose: () => void;
  onSelectSale?: (sale: SaleRecord) => void;
}
const tabs: { id: TransactionTab; label: string }[] = [
  { id: 'purchase', label: 'Purchase' },
  { id: 'payment', label: 'Payment' },
  { id: 'return', label: 'Return' },
];
const isReturn = (sale: SaleRecord) =>
  ['refunded', 'partially_refunded'].includes(sale.status);
const customerName = (sale: SaleRecord) =>
  sale.customerId ? 'Registered customer' : 'Walk-in customer';
const paymentName = (value: string) =>
  value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const formatDate = (value: Date | string) =>
  new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

export function SalesHistoryModal({
  onClose,
  onSelectSale,
}: SalesHistoryModalProps) {
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TransactionTab>('purchase');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getRecentSales(100)
      .then((data) => active && setSales(data))
      .catch(() => notify.error('Failed to load recent transactions'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    const listener = (event: KeyboardEvent) =>
      event.key === 'Escape' && onClose();
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [onClose]);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return sales.filter((sale) => {
      if (tab === 'return' && !isReturn(sale)) return false;
      if (tab === 'purchase' && isReturn(sale)) return false;
      return (
        !search ||
        [
          sale.receiptNo,
          sale.paymentMethod,
          sale.status,
          customerName(sale),
          ...sale.items.map((item) => item.productName),
        ].some((value) => value.toLowerCase().includes(search))
      );
    });
  }, [sales, query, tab]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  const exportRows = selected.size
    ? filtered.filter((sale) => selected.has(sale.id))
    : filtered;
  const allVisibleSelected =
    visible.length > 0 && visible.every((sale) => selected.has(sale.id));
  useEffect(() => {
    setPage(1);
    setSelected(new Set());
    setExpandedId(null);
  }, [query, tab, pageSize]);
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const toggleSelected = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const toggleVisible = () =>
    setSelected((current) => {
      const next = new Set(current);
      visible.forEach((sale) =>
        allVisibleSelected ? next.delete(sale.id) : next.add(sale.id)
      );
      return next;
    });
  const downloadCsv = () => {
    if (!exportRows.length)
      return notify.error('There are no transactions to export');
    const data = [
      ['Customer', 'Reference', 'Date', 'Payment', 'Status', 'Amount'],
      ...exportRows.map((sale) => [
        customerName(sale),
        sale.receiptNo,
        formatDate(sale.createdAt),
        sale.paymentMethod,
        sale.status,
        sale.total,
      ]),
    ];
    const csv = data
      .map((row) =>
        row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')
      )
      .join('\n');
    const url = URL.createObjectURL(
      new Blob([csv], { type: 'text/csv;charset=utf-8' })
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `${tab}-transactions.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };
  const downloadPdf = async () => {
    if (!exportRows.length)
      return notify.error('There are no transactions to export');
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF();
    pdf.setFontSize(16);
    pdf.text(
      `${tabs.find((item) => item.id === tab)?.label} Transactions`,
      14,
      18
    );
    pdf.setFontSize(9);
    let y = 30;
    exportRows.forEach((sale, index) => {
      if (y > 280) {
        pdf.addPage();
        y = 18;
      }
      pdf.text(
        `${index + 1}. ${sale.receiptNo} | ${customerName(sale)} | ${formatDate(sale.createdAt)} | ${formatCurrency(Number(sale.total))}`,
        14,
        y
      );
      y += 8;
    });
    pdf.save(`${tab}-transactions.pdf`);
  };
  const printRows = (rows: SaleRecord[]) => {
    if (!rows.length) return notify.error('There are no transactions to print');
    const popup = window.open('', '_blank', 'width=900,height=700');
    if (!popup) return notify.error('Allow pop-ups to print transactions');
    const body = rows
      .map(
        (sale) =>
          `<tr><td>${escapeHtml(customerName(sale))}</td><td>${escapeHtml(sale.receiptNo)}</td><td>${formatDate(sale.createdAt)}</td><td>${escapeHtml(paymentName(sale.paymentMethod))}</td><td>${escapeHtml(formatCurrency(Number(sale.total)))}</td></tr>`
      )
      .join('');
    popup.document.write(
      `<!doctype html><html><head><title>Transactions</title><style>body{font:14px Arial;color:#172033;padding:32px}h1{font-size:20px}table{width:100%;border-collapse:collapse}th,td{padding:11px;border:1px solid #dfe3e8;text-align:left}th{background:#f6f7f9}@media print{body{padding:0}}</style></head><body><h1>${tabs.find((item) => item.id === tab)?.label} Transactions</h1><table><thead><tr><th>Customer</th><th>Reference</th><th>Date</th><th>Payment</th><th>Amount</th></tr></thead><tbody>${body}</tbody></table><script>window.onload=()=>{window.print();window.close()}</script></body></html>`
    );
    popup.document.close();
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-[1px] sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recent-transactions-title"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="flex max-h-[90vh] w-full max-w-[815px] flex-col overflow-hidden rounded-lg border border-border bg-background text-foreground shadow-2xl">
        <header className="flex min-h-14 items-center justify-between border-b border-border px-5 sm:px-6">
          <h2
            id="recent-transactions-title"
            className="text-lg font-semibold tracking-tight"
          >
            Recent Transactions
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-6 w-6 place-items-center rounded-full bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            aria-label="Close recent transactions"
          >
            <X className="h-3.5 w-3.5" strokeWidth={3} />
          </button>
        </header>
        <div className="flex min-h-0 flex-1 flex-col p-5 sm:p-6">
          <nav className="mb-4 flex gap-2" aria-label="Transaction type">
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`rounded px-3.5 py-2 text-xs font-medium transition-colors ${tab === item.id ? 'bg-orange-500 text-white shadow-sm hover:bg-orange-600' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
              >
                {item.label}
              </button>
            ))}
          </nav>
          <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border">
            <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
              <label className="relative block w-full sm:max-w-[215px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search"
                  className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-orange-500/30"
                />
              </label>
              <div className="flex gap-2">
                <ToolButton
                  label="Export PDF"
                  onClick={downloadPdf}
                  className="text-red-600"
                >
                  <FileText />
                </ToolButton>
                <ToolButton
                  label="Export spreadsheet"
                  onClick={downloadCsv}
                  className="text-emerald-700"
                >
                  <Download />
                </ToolButton>
                <ToolButton
                  label="Print transactions"
                  onClick={() => printRows(exportRows)}
                >
                  <Printer />
                </ToolButton>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-4 pt-5">
              {loading ? (
                <div className="grid min-h-64 place-items-center">
                  <div className="flex flex-col items-center gap-5 text-sm text-muted-foreground">
                    <LoadingSpinner className="text-orange-500" />
                    Loading transactions...
                  </div>
                </div>
              ) : filtered.length === 0 ? (
                <div className="grid min-h-64 place-items-center text-center">
                  <div>
                    <FileText className="mx-auto mb-3 h-9 w-9 text-muted-foreground/60" />
                    <p className="font-medium">No {tab} transactions found</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Try another search or transaction type.
                    </p>
                  </div>
                </div>
              ) : (
                <table className="w-full min-w-[660px] border-collapse text-sm">
                  <thead>
                    <tr className="border border-border bg-muted/60 text-left text-xs font-medium">
                      <th className="w-12 px-4 py-3">
                        <input
                          type="checkbox"
                          checked={allVisibleSelected}
                          onChange={toggleVisible}
                          className="h-4 w-4 accent-orange-500"
                          aria-label="Select visible transactions"
                        />
                      </th>
                      <th className="px-2 py-3">Customer</th>
                      <th className="px-2 py-3">Reference</th>
                      <th className="px-2 py-3">Date</th>
                      <th className="px-2 py-3">Amount</th>
                      <th className="px-2 py-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((sale) => (
                      <TransactionRow
                        key={sale.id}
                        sale={sale}
                        tab={tab}
                        selected={selected.has(sale.id)}
                        expanded={expandedId === sale.id}
                        canReturn={
                          Boolean(onSelectSale) && sale.status !== 'refunded'
                        }
                        onToggleSelected={() => toggleSelected(sale.id)}
                        onToggleExpanded={() =>
                          setExpandedId((id) =>
                            id === sale.id ? null : sale.id
                          )
                        }
                        onPrint={() => printRows([sale])}
                        onReturn={() => onSelectSale?.(sale)}
                      />
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <footer className="flex flex-col gap-3 border-t border-border px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <span>Rows Per Page</span>
                <select
                  value={pageSize}
                  onChange={(event) => setPageSize(Number(event.target.value))}
                  className="h-9 rounded-md border border-input bg-background px-2 text-foreground"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                </select>
                <span>Entries</span>
              </div>
              <div className="flex items-center justify-end gap-2">
                <span className="mr-1 text-xs">
                  {filtered.length
                    ? `${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, filtered.length)} of ${filtered.length}`
                    : '0 entries'}
                </span>
                <button
                  type="button"
                  disabled={page === 1}
                  onClick={() => setPage((value) => value - 1)}
                  className="grid h-8 w-8 place-items-center rounded disabled:opacity-30 hover:bg-muted"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="grid h-7 min-w-7 place-items-center rounded-full bg-orange-500 px-2 text-xs font-semibold text-white">
                  {page}
                </span>
                <button
                  type="button"
                  disabled={page === pageCount}
                  onClick={() => setPage((value) => value + 1)}
                  className="grid h-8 w-8 place-items-center rounded disabled:opacity-30 hover:bg-muted"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </footer>
          </section>
        </div>
      </div>
    </div>
  );
}

function TransactionRow({
  sale,
  tab,
  selected,
  expanded,
  canReturn,
  onToggleSelected,
  onToggleExpanded,
  onPrint,
  onReturn,
}: {
  sale: SaleRecord;
  tab: TransactionTab;
  selected: boolean;
  expanded: boolean;
  canReturn: boolean;
  onToggleSelected: () => void;
  onToggleExpanded: () => void;
  onPrint: () => void;
  onReturn: () => void;
}) {
  return (
    <>
      <tr className="border-x border-b border-border hover:bg-muted/35">
        <td className="px-4 py-2.5">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelected}
            className="h-4 w-4 accent-orange-500"
            aria-label={`Select ${sale.receiptNo}`}
          />
        </td>
        <td className="px-2 py-2.5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded bg-orange-100 text-[10px] font-bold text-orange-800 dark:bg-orange-950 dark:text-orange-200">
              {sale.customerId ? 'RC' : 'WC'}
            </span>
            <div>
              <p className="whitespace-nowrap font-medium">
                {customerName(sale)}
              </p>
              {tab === 'payment' && (
                <p className="text-[11px] text-muted-foreground">
                  {paymentName(sale.paymentMethod)}
                </p>
              )}
            </div>
          </div>
        </td>
        <td className="px-2 py-2.5">
          <p className="whitespace-nowrap text-muted-foreground">
            {sale.receiptNo}
          </p>
          <p className="text-[10px] capitalize text-muted-foreground/80">
            {sale.status.replaceAll('_', ' ')}
          </p>
        </td>
        <td className="whitespace-nowrap px-2 py-2.5 text-muted-foreground">
          {formatDate(sale.createdAt)}
        </td>
        <td className="whitespace-nowrap px-2 py-2.5 font-medium">
          {formatCurrency(Number(sale.total))}
        </td>
        <td className="px-2 py-2.5">
          <div className="flex justify-center gap-1.5">
            <ToolButton label="View details" onClick={onToggleExpanded}>
              <Eye />
            </ToolButton>
            <ToolButton label="Print receipt" onClick={onPrint}>
              <Printer />
            </ToolButton>
            {canReturn && (
              <ToolButton label="Return items" onClick={onReturn}>
                <RotateCcw />
              </ToolButton>
            )}
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="border-x border-b border-border bg-muted/30">
          <td colSpan={6} className="px-14 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-muted-foreground">
                <span>
                  <strong className="text-foreground">Items:</strong>{' '}
                  {sale.items
                    .map((item) => `${item.productName} × ${item.quantity}`)
                    .join(', ')}
                </span>
                <span>
                  <strong className="text-foreground">Payment:</strong>{' '}
                  {paymentName(sale.paymentMethod)}
                </span>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 font-medium capitalize text-emerald-700 dark:text-emerald-400">
                {sale.status.replaceAll('_', ' ')}
              </span>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function ToolButton({
  label,
  onClick,
  className = '',
  children,
}: {
  label: string;
  onClick: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`grid h-9 w-9 place-items-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:border-orange-400 hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-orange-950/40 [&_svg]:h-4 [&_svg]:w-4 ${className}`}
    >
      {children}
    </button>
  );
}
