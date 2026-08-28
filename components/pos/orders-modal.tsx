'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Printer, Search, ShoppingBag, Trash2, X } from 'lucide-react';
import { getRecentSales } from '@/app/actions/pos-queries';
import type { HeldSaleRecord } from '@/app/actions/held-sales';
import type { Sale, SaleItem } from '@/lib/db/schema';
import { notify } from '@/lib/notify';
import { formatCurrency } from '@/lib/utils';

type SaleRecord = Sale & { items: SaleItem[] };
type OrderTab = 'onhold' | 'unpaid' | 'paid';

interface OrdersModalProps {
  heldSales: HeldSaleRecord[];
  heldSalesLoading: boolean;
  actionId: string | null;
  onClose: () => void;
  onResume: (sale: HeldSaleRecord) => void;
  onDiscard: (sale: HeldSaleRecord) => void;
}

const tabs: Array<{ id: OrderTab; label: string }> = [
  { id: 'onhold', label: 'Onhold' },
  { id: 'unpaid', label: 'Unpaid' },
  { id: 'paid', label: 'Paid' },
];

const dateTime = (value: string | Date) =>
  new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export function OrdersModal({
  heldSales,
  heldSalesLoading,
  actionId,
  onClose,
  onResume,
  onDiscard,
}: OrdersModalProps) {
  const [tab, setTab] = useState<OrderTab>('onhold');
  const [query, setQuery] = useState('');
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [salesLoading, setSalesLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getRecentSales(100)
      .then((records) => active && setSales(records))
      .catch(() => notify.error('Could not load orders'))
      .finally(() => active && setSalesLoading(false));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !actionId) onClose();
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [actionId, onClose]);

  const normalizedQuery = query.trim().toLowerCase();
  const visibleHeld = useMemo(
    () =>
      heldSales.filter((order) =>
        [order.id, order.note ?? '', order.cashierName, ...order.cart.map((item) => item.productName)]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery)
      ),
    [heldSales, normalizedQuery]
  );
  const visibleSales = useMemo(
    () =>
      sales.filter((order) => {
        const paid = !['pending', 'unpaid'].includes(order.status.toLowerCase());
        if (tab === 'paid' ? !paid : paid) return false;
        return [order.receiptNo, order.paymentMethod, order.status, ...order.items.map((item) => item.productName)]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery);
      }),
    [normalizedQuery, sales, tab]
  );

  const printOrder = (order: SaleRecord) => {
    const popup = window.open('', '_blank', 'width=440,height=700');
    if (!popup) return notify.error('Allow pop-ups to print this order');
    const rows = order.items
      .map((item) => `<tr><td>${item.productName}</td><td>${item.quantity}</td><td>${formatCurrency(Number(item.totalPrice))}</td></tr>`)
      .join('');
    popup.document.write(`<!doctype html><html><head><title>${order.receiptNo}</title><style>body{font:13px Arial;padding:24px;color:#172033}h2{text-align:center}table{width:100%;border-collapse:collapse}td,th{padding:8px 4px;border-bottom:1px solid #ddd;text-align:left}td:last-child,th:last-child{text-align:right}.total{font-size:17px;font-weight:700;text-align:right;margin-top:18px}</style></head><body><h2>Order ${order.receiptNo}</h2><p>${dateTime(order.createdAt)}</p><table><thead><tr><th>Product</th><th>Qty</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table><p class="total">${formatCurrency(Number(order.total))}</p><script>window.onload=()=>window.print()</script></body></html>`);
    popup.document.close();
  };

  const loading = tab === 'onhold' ? heldSalesLoading : salesLoading;
  const empty = tab === 'onhold' ? visibleHeld.length === 0 : visibleSales.length === 0;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-[#101828]/55 p-3 backdrop-blur-[1px] sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="orders-modal-title"
      onMouseDown={(event) => event.target === event.currentTarget && !actionId && onClose()}
    >
      <div className="flex max-h-[calc(100dvh-24px)] w-full max-w-[586px] flex-col overflow-hidden rounded-[8px] border border-[#dfe3e8] bg-white text-[#273142] shadow-[0_24px_70px_rgba(16,24,40,.3)] dark:border-white/10 dark:bg-[#1c1c1e] dark:text-white sm:max-h-[78vh]">
        <header className="flex min-h-[59px] items-center justify-between border-b border-[#e4e7ec] px-5 dark:border-white/10">
          <h2 id="orders-modal-title" className="text-[19px] font-bold">Orders</h2>
          <button type="button" disabled={Boolean(actionId)} onClick={onClose} className="grid h-5 w-5 place-items-center rounded-full bg-[#ef1b24] text-white hover:bg-[#d9151d] disabled:opacity-50" aria-label="Close orders">
            <X className="h-3 w-3" strokeWidth={3} />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col px-5 py-5">
          <nav className="mb-4 flex gap-2" aria-label="Order status">
            {tabs.map((item) => (
              <button key={item.id} type="button" onClick={() => { setTab(item.id); setExpandedId(null); }} className={`h-[33px] rounded-[4px] px-3.5 text-xs font-medium transition-colors ${tab === item.id ? 'bg-[#ff9f43] text-white' : 'bg-[#f6f7f9] text-[#344054] hover:bg-[#eef0f3] dark:bg-white/[.06] dark:text-[#d0d5dd]'}`}>
                {item.label}
              </button>
            ))}
          </nav>
          <label className="relative mb-4 block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98a2b3]" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Product" className="h-[30px] w-full rounded-[4px] border border-[#dfe3e8] bg-white pl-9 pr-3 text-xs outline-none placeholder:text-[#b3bac5] focus:border-[#ff9f43] focus:ring-2 focus:ring-[#ff9f43]/15 dark:border-white/10 dark:bg-[#151516]" />
          </label>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
            {loading ? (
              <div className="flex min-h-44 items-center justify-center gap-2 text-sm text-[#667085]"><Loader2 className="h-4 w-4 animate-spin" /> Loading orders...</div>
            ) : empty ? (
              <div className="grid min-h-44 place-items-center rounded-lg border border-dashed border-[#dfe3e8] text-center dark:border-white/10">
                <div><ShoppingBag className="mx-auto mb-2 h-8 w-8 text-[#c4cbd4]" /><p className="text-sm font-semibold">No {tabs.find((item) => item.id === tab)?.label.toLowerCase()} orders</p></div>
              </div>
            ) : tab === 'onhold' ? (
              visibleHeld.map((order) => {
                const total = order.cart.reduce((sum, item) => sum + item.totalPrice, 0);
                return <article key={order.id} className="rounded-[8px] border border-[#dfe3e8] bg-[#fbfcfd] p-5 dark:border-white/10 dark:bg-white/[.035]">
                  <span className="inline-flex rounded-[4px] bg-[#101f4c] px-2 py-1 text-xs font-bold text-white">Order ID : #{order.id.slice(-6).toUpperCase()}</span>
                  <div className="mt-3 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2"><p><strong>Cashier :</strong> {order.cashierName}</p><p><strong>Customer :</strong> {order.customerId ? 'Registered customer' : 'Walk-in customer'}</p><p><strong>Total :</strong> {formatCurrency(total)}</p><p><strong>Date :</strong> {dateTime(order.createdAt)}</p></div>
                  {order.note && <p className="mt-4 rounded-[3px] bg-[#dce7fb] px-3 py-2 text-center text-xs text-[#155eef] dark:bg-[#155eef]/15 dark:text-[#80aaff]">{order.note}</p>}
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    <button type="button" disabled={actionId === order.id} onClick={() => onResume(order)} className="h-9 rounded-[5px] bg-[#e94e1b] px-4 text-xs font-semibold text-white hover:bg-[#cf4215] disabled:opacity-50">Open Order</button>
                    <button type="button" onClick={() => setExpandedId((id) => id === order.id ? null : order.id)} className="h-9 rounded-[5px] bg-[#09998f] px-4 text-xs font-semibold text-white hover:bg-[#087d75]">View Products</button>
                    <button type="button" disabled={actionId === order.id} onClick={() => onDiscard(order)} className="grid h-9 w-9 place-items-center rounded-[5px] bg-[#092c4c] text-white hover:bg-[#061f36]" aria-label="Discard order"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  {expandedId === order.id && <div className="mt-4 border-t border-[#dfe3e8] pt-3 text-xs dark:border-white/10">{order.cart.map((item) => <div key={`${order.id}-${item.productId}`} className="flex justify-between py-1.5"><span>{item.productName} × {item.quantity}</span><strong>{formatCurrency(item.totalPrice)}</strong></div>)}</div>}
                </article>;
              })
            ) : (
              visibleSales.map((order) => <article key={order.id} className="rounded-[8px] border border-[#dfe3e8] bg-[#fbfcfd] p-5 dark:border-white/10 dark:bg-white/[.035]">
                <span className="inline-flex rounded-[4px] bg-[#101f4c] px-2 py-1 text-xs font-bold text-white">Order ID : #{order.receiptNo}</span>
                <div className="mt-3 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2"><p><strong>Payment :</strong> {order.paymentMethod.replaceAll('_', ' ')}</p><p><strong>Customer :</strong> {order.customerId ? 'Registered customer' : 'Walk-in customer'}</p><p><strong>Total :</strong> {formatCurrency(Number(order.total))}</p><p><strong>Date :</strong> {dateTime(order.createdAt)}</p></div>
                <div className="mt-4 flex flex-wrap justify-center gap-2"><button type="button" onClick={() => setExpandedId((id) => id === order.id ? null : order.id)} className="h-9 rounded-[5px] bg-[#e94e1b] px-4 text-xs font-semibold text-white hover:bg-[#cf4215]">Open Order</button><button type="button" onClick={() => setExpandedId((id) => id === order.id ? null : order.id)} className="h-9 rounded-[5px] bg-[#09998f] px-4 text-xs font-semibold text-white hover:bg-[#087d75]">View Products</button><button type="button" onClick={() => printOrder(order)} className="inline-flex h-9 items-center gap-2 rounded-[5px] bg-[#3538cd] px-4 text-xs font-semibold text-white hover:bg-[#2c2fb2]"><Printer className="h-4 w-4" /> Print</button></div>
                {expandedId === order.id && <div className="mt-4 border-t border-[#dfe3e8] pt-3 text-xs dark:border-white/10">{order.items.map((item) => <div key={item.id} className="flex justify-between py-1.5"><span>{item.productName} × {item.quantity}</span><strong>{formatCurrency(Number(item.totalPrice))}</strong></div>)}</div>}
              </article>)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
