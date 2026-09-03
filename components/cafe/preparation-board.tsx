'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { Printer } from 'lucide-react';
import { advanceCafePreparation, getCafePreparationQueue } from '@/app/actions/cafe';
import { cn } from '@/lib/utils';
import { notify } from '@/lib/notify';
import { browserPrintReceipt, directPrintReceipt, getReceiptPrinterErrorCopy } from '@/lib/printing/receipt-print-service';
import { renderCafePreparationTicket } from '@/lib/printing/cafe-preparation-ticket';

type Queue = Awaited<ReturnType<typeof getCafePreparationQueue>>;

const columns = [
  { id: 'new', title: 'New', action: 'Start' },
  { id: 'preparing', title: 'Preparing', action: 'Mark ready' },
  { id: 'ready', title: 'Ready', action: 'Complete' },
] as const;

export function PreparationBoard({ initialData, canManage }: { initialData: Queue; canManage: boolean }) {
  const [data, setData] = useState(initialData);
  const [busyId, setBusyId] = useState('');
  const [pending, startTransition] = useTransition();
  const linesByOrder = useMemo(() => {
    const result = new Map<string, Queue['lines']>();
    for (const row of data.lines) result.set(row.line.orderId, [...(result.get(row.line.orderId) ?? []), row]);
    return result;
  }, [data.lines]);
  const modifiersByLine = useMemo(() => {
    const result = new Map<string, Queue['modifiers']>();
    for (const row of data.modifiers) result.set(row.orderLineId, [...(result.get(row.orderLineId) ?? []), row]);
    return result;
  }, [data.modifiers]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible' || pending) return;
      startTransition(async () => setData(await getCafePreparationQueue()));
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [pending]);

  const advance = (orderId: string) => {
    setBusyId(orderId);
    startTransition(async () => {
      try {
        await advanceCafePreparation(orderId);
        setData(await getCafePreparationQueue());
      } catch (error) {
        notify.error(error instanceof Error ? error.message : 'Could not update preparation');
      } finally {
        setBusyId('');
      }
    });
  };

  const printTicket = async (order: Queue['orders'][number]['order'], tableName?: string | null) => {
    const orderLines = linesByOrder.get(order.id) ?? [];
    const printerIdentifier = orderLines.find((row) => row.stationPrinterIdentifier)?.stationPrinterIdentifier;
    const stationName = orderLines.find((row) => row.stationName)?.stationName;
    const ticket = renderCafePreparationTicket({ orderNumber: order.orderNumber, orderType: order.orderType, tableName, createdAt: order.createdAt, stationName, lines: orderLines.map(({ line }) => ({ quantity: line.quantity, itemName: line.itemName, sizeName: line.sizeName, notes: line.notes, modifiers: (modifiersByLine.get(line.id) ?? []).map((modifier) => modifier.optionName) })) });
    try {
      if (printerIdentifier) await directPrintReceipt(ticket, { mode: 'direct', printerName: printerIdentifier, paperWidth: 80, autoPrint: false, customerCopy: false, copies: 1, cashDrawerPulse: false });
      else browserPrintReceipt(ticket, 80);
      notify.success(printerIdentifier ? 'Preparation ticket sent to printer.' : 'Preparation ticket opened in the print dialog.');
    } catch (error) {
      const copy = getReceiptPrinterErrorCopy(error);
      notify.error('Preparation ticket not printed.', { description: `${copy.description} You can retry without recreating the order.` });
    }
  };

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      {columns.map((column) => {
        const orders = data.orders.filter(({ order }) => order.preparationStatus === column.id);
        return (
          <section key={column.id} className="min-h-[360px] rounded-xl border border-[#e4e7ec] bg-[#f8fafc] p-3 dark:border-white/10 dark:bg-[#101010]">
            <div className="mb-3 flex items-center justify-between px-1">
              <h2 className="text-sm font-extrabold uppercase tracking-[.12em] text-[#344054] dark:text-[#d0d5dd]">{column.title}</h2>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold tabular-nums dark:bg-white/10">{orders.length}</span>
            </div>
            <div className="space-y-3">
              {orders.map(({ order, tableName }) => {
                const orderLines = linesByOrder.get(order.id) ?? [];
                const minutes = Math.max(0, Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60_000));
                return (
                  <article key={order.id} className="rounded-xl border border-[#e4e7ec] bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#1a1a1a]">
                    <div className="flex items-start justify-between gap-3">
                      <div><p className="text-lg font-extrabold">Order #{order.orderNumber}</p><p className="mt-0.5 text-xs text-[#667085] dark:text-[#a8a8a8]">{minutes} min ago · {order.orderType.replace('_', '-').replace(/^./, (v) => v.toUpperCase())}{tableName ? ` · ${tableName}` : ''}</p></div>
                      <div className="flex items-center gap-2"><span className={cn('h-2.5 w-2.5 rounded-full', column.id === 'new' ? 'bg-amber-400' : column.id === 'preparing' ? 'bg-blue-500' : 'bg-emerald-500')} />{canManage && <button type="button" onClick={() => void printTicket(order, tableName)} className="rounded-md border border-[#d0d5dd] p-1.5 hover:bg-[#f8fafc] dark:border-white/15 dark:hover:bg-white/10" aria-label={`Print preparation ticket for order ${order.orderNumber}`}><Printer className="h-4 w-4" /></button>}</div>
                    </div>
                    <div className="my-4 space-y-3 border-y border-[#eef0f3] py-3 dark:border-white/10">
                      {orderLines.map(({ line, stationName }) => (
                        <div key={line.id}>
                          <p className="text-sm font-bold">{line.quantity}× {line.itemName}{line.sizeName ? ` · ${line.sizeName}` : ''}</p>
                          {modifiersByLine.get(line.id)?.map((modifier) => <p key={modifier.id} className="pl-4 text-xs text-[#667085] dark:text-[#b3b3b8]">• {modifier.optionName}</p>)}
                          {line.notes && <p className="mt-1 pl-4 text-xs font-semibold text-amber-700 dark:text-amber-300">Note: {line.notes}</p>}
                          {stationName && <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-[#98a2b3]">{stationName}</p>}
                        </div>
                      ))}
                    </div>
                    {canManage && <button type="button" disabled={pending && busyId === order.id} onClick={() => advance(order.id)} className="h-12 w-full rounded-lg bg-[#f9b21d] text-sm font-extrabold text-[#241d00] transition-colors hover:bg-[#e6a30f] disabled:opacity-50">{pending && busyId === order.id ? 'Updating…' : column.action}</button>}
                  </article>
                );
              })}
              {!orders.length && <div className="grid min-h-36 place-items-center rounded-xl border border-dashed border-[#d0d5dd] px-4 text-center text-sm text-[#667085] dark:border-white/15 dark:text-[#8b8b8b]">No {column.title.toLowerCase()} orders</div>}
            </div>
          </section>
        );
      })}
    </div>
  );
}
