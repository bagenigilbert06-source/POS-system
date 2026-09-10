'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ChevronDown,
  Printer,
  ReceiptText,
  Search,
  ShoppingCart,
} from 'lucide-react';
import type { Sale, SaleItem } from '@/lib/db/schema';
import { formatCurrency } from '@/lib/utils';

type ReceiptSale = Sale & { items: SaleItem[] };
const readable = (value: string) =>
  value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

export function ReceiptsView({
  initialSales,
}: {
  initialSales: ReceiptSale[];
}) {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const sales = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return initialSales;
    return initialSales.filter((sale) =>
      [
        sale.receiptNo,
        sale.paymentMethod,
        sale.status,
        ...sale.items.map((item) => item.productName),
      ].some((field) => field.toLowerCase().includes(value))
    );
  }, [initialSales, query]);

  const printReceipt = (sale: ReceiptSale) => {
    const popup = window.open('', '_blank', 'width=520,height=760');
    if (!popup) return;
    const rows = sale.items
      .map(
        (item) =>
          `<tr><td>${escapeHtml(item.productName)}</td><td>${item.quantity}</td><td>${escapeHtml(formatCurrency(Number(item.totalPrice)))}</td></tr>`
      )
      .join('');
    popup.document.write(
      `<!doctype html><html><head><title>${escapeHtml(sale.receiptNo)}</title><style>body{font:14px Arial;color:#111;padding:28px;max-width:420px;margin:auto}h1{text-align:center;font-size:20px}.meta{text-align:center;color:#555;margin-bottom:24px}table{width:100%;border-collapse:collapse}th,td{padding:8px 4px;border-bottom:1px dashed #aaa;text-align:left}th:last-child,td:last-child{text-align:right}.total{font-size:18px;font-weight:700;text-align:right;margin-top:20px}@media print{body{padding:0}}</style></head><body><h1>Sales receipt</h1><div class="meta">${escapeHtml(sale.receiptNo)}<br>${new Date(sale.createdAt).toLocaleString()}</div><table><thead><tr><th>Item</th><th>Qty</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table><p class="total">Total: ${escapeHtml(formatCurrency(Number(sale.total)))}</p><p>Payment: ${escapeHtml(readable(sale.paymentMethod))}</p><script>window.onload=()=>window.print()</script></body></html>`
    );
    popup.document.close();
  };

  return (
    <main className="mx-auto max-w-6xl space-y-6 pb-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/dashboard"
            className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back home
          </Link>
          <p className="text-xs font-bold uppercase tracking-[.14em] text-[#c91f21]">
            Cashier workspace
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
            My receipts
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            View and reprint sales completed with your cashier account.
          </p>
        </div>
        <Link
          href="/dashboard/pos"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#e42527] px-4 text-sm font-bold text-white hover:bg-[#c91f21]"
        >
          <ShoppingCart className="h-4 w-4" />
          Open POS
        </Link>
      </header>
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4 sm:p-5">
          <label className="relative block max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search receipt, item, payment or status"
              className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 text-sm outline-none focus:border-[#e42527] focus:ring-2 focus:ring-red-100"
            />
          </label>
        </div>
        {sales.length === 0 ? (
          <div className="grid min-h-72 place-items-center p-8 text-center">
            <div>
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-slate-100">
                <ReceiptText className="h-5 w-5 text-slate-500" />
              </span>
              <h2 className="mt-4 font-bold text-slate-900">
                {query ? 'No matching receipts' : 'No receipts yet'}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {query
                  ? 'Try a different receipt number or item name.'
                  : 'Completed sales will appear here.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {sales.map((sale) => (
              <article key={sale.id} className="p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={() =>
                      setExpanded(expanded === sale.id ? null : sale.id)
                    }
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-700">
                      <ReceiptText className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-bold text-slate-950">
                        {sale.receiptNo}
                      </span>
                      <span className="block text-xs text-slate-500">
                        {new Date(sale.createdAt).toLocaleString('en-KE')} ·{' '}
                        {readable(sale.paymentMethod)}
                      </span>
                    </span>
                    <ChevronDown
                      className={`ml-auto h-4 w-4 text-slate-400 transition ${expanded === sale.id ? 'rotate-180' : ''}`}
                    />
                  </button>
                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <span>
                      <span className="block text-right font-bold text-slate-950">
                        {formatCurrency(Number(sale.total))}
                      </span>
                      <span className="block text-right text-xs text-slate-500">
                        {readable(sale.status)}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => printReceipt(sale)}
                      className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                      <Printer className="h-4 w-4" />
                      Print
                    </button>
                  </div>
                </div>
                {expanded === sale.id && (
                  <div className="mt-4 rounded-lg bg-slate-50 p-4">
                    <div className="space-y-2">
                      {sale.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-start justify-between gap-4 text-sm"
                        >
                          <span className="text-slate-700">
                            {item.quantity} × {item.productName}
                          </span>
                          <span className="shrink-0 font-semibold text-slate-900">
                            {formatCurrency(Number(item.totalPrice))}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
