'use client';

import { useState, useTransition } from 'react';
import { AlertTriangle, Boxes, Loader2, ReceiptText } from 'lucide-react';
import { toast } from 'sonner';
import { recordInventoryLoss, refundSale } from '@/app/actions/operations';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Product, Sale } from '@/lib/db/schema';
import { formatCurrency, formatDateTime } from '@/lib/utils';

type Location = { id: string; name: string };

export function OperationsControl({
  products,
  sales,
  locations,
  currency,
}: {
  products: Product[];
  sales: Sale[];
  locations: Location[];
  currency: string;
}) {
  const [lossOpen, setLossOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState('');
  const [lossPending, startLoss] = useTransition();
  const [refundPending, startRefund] = useTransition();
  const selectedSale = sales.find((record) => record.id === selectedSaleId);

  return (
    <section id="manager-actions" className="scroll-mt-24">
      <div className="mb-3">
        <p className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-[#9a6700] dark:text-[#ffd60a]">
          Manager actions
        </p>
        <h2 className="mt-1 text-lg font-bold tracking-tight">Quick actions</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Cashier shift closing stays in Point of Sale. These manager actions
          are audit logged.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Dialog open={lossOpen} onOpenChange={setLossOpen}>
          <DialogTrigger asChild>
            <ActionButton
              icon={Boxes}
              title="Record stock loss"
              detail="Damaged, expired, missing, stolen, or count-adjusted stock."
            />
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record stock loss</DialogTitle>
              <DialogDescription>
                Choose the exact product and location. The actor and time are
                captured automatically.
              </DialogDescription>
            </DialogHeader>
            {products.length ? (
              <form
                action={(form) =>
                  startLoss(async () => {
                    try {
                      await recordInventoryLoss({
                        productId: String(form.get('productId')),
                        branchId:
                          String(form.get('branchId') || '') || undefined,
                        quantity: Number(form.get('quantity')),
                        type: String(form.get('type')),
                        reason: String(form.get('reason')),
                        note: String(form.get('note') || ''),
                      });
                      toast.success('Stock loss recorded');
                      setLossOpen(false);
                    } catch (error) {
                      toast.error(
                        error instanceof Error
                          ? error.message
                          : 'Unable to record stock loss'
                      );
                    }
                  })
                }
                className="space-y-4"
              >
                <Field label="Product">
                  <Choice
                    name="productId"
                    required
                    placeholder="Choose product"
                    items={products.map((item) => [
                      item.id,
                      `${item.name} · ${item.stock} available`,
                    ])}
                  />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Location">
                    <Choice
                      name="branchId"
                      placeholder="Default location"
                      items={locations.map((item) => [item.id, item.name])}
                    />
                  </Field>
                  <Field label="Loss type">
                    <Choice
                      name="type"
                      required
                      placeholder="Select type"
                      items={[
                        'damaged',
                        'expired',
                        'lost',
                        'theft',
                        'count_adjustment',
                      ].map((value) => [value, value.replace('_', ' ')])}
                    />
                  </Field>
                </div>
                <Field label="Quantity">
                  <Input
                    name="quantity"
                    type="number"
                    min="1"
                    required
                    placeholder="0"
                  />
                </Field>
                <Field label="Reason">
                  <Input
                    name="reason"
                    minLength={3}
                    maxLength={300}
                    required
                    placeholder="Explain what happened"
                  />
                </Field>
                <Field label="Evidence or note" optional>
                  <Input
                    name="note"
                    maxLength={300}
                    placeholder="Reference, witness, or supporting note"
                  />
                </Field>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLossOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button disabled={lossPending}>
                    {lossPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {lossPending ? 'Recording…' : 'Record loss'}
                  </Button>
                </DialogFooter>
              </form>
            ) : (
              <Empty
                title="No active stock"
                detail="There are no active inventory items available to adjust."
              />
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={refundOpen} onOpenChange={setRefundOpen}>
          <DialogTrigger asChild>
            <ActionButton
              icon={ReceiptText}
              title="Issue a full refund"
              detail="Review the receipt context before issuing a credit note."
              danger
            />
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Refund completed sale</DialogTitle>
              <DialogDescription>
                This workflow refunds the full receipt. Partial item refunds are
                not supported here.
              </DialogDescription>
            </DialogHeader>
            {sales.length ? (
              <form
                action={(form) =>
                  startRefund(async () => {
                    try {
                      await refundSale({
                        saleId: String(form.get('saleId')),
                        refundMethod: String(form.get('refundMethod')),
                        disposition: String(form.get('disposition')),
                        reason: String(form.get('reason')),
                      });
                      toast.success('Credit note and refund recorded');
                      setRefundOpen(false);
                      setSelectedSaleId('');
                    } catch (error) {
                      toast.error(
                        error instanceof Error
                          ? error.message
                          : 'Unable to issue refund'
                      );
                    }
                  })
                }
                className="space-y-4"
              >
                <Field label="Receipt">
                  <Select
                    name="saleId"
                    required
                    value={selectedSaleId}
                    onValueChange={setSelectedSaleId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose receipt" />
                    </SelectTrigger>
                    <SelectContent>
                      {sales.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.receiptNo} ·{' '}
                          {formatCurrency(Number(item.total), currency)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                {selectedSale && (
                  <div className="grid grid-cols-2 gap-3 rounded-xl border bg-muted/25 p-4 text-xs sm:grid-cols-4">
                    <Summary label="Receipt" value={selectedSale.receiptNo} />
                    <Summary
                      label="Total"
                      value={formatCurrency(
                        Number(selectedSale.total),
                        currency
                      )}
                    />
                    <Summary
                      label="Paid by"
                      value={selectedSale.paymentMethod.replace('_', ' ')}
                    />
                    <Summary
                      label="Date"
                      value={formatDateTime(selectedSale.createdAt)}
                    />
                  </div>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Refund method">
                    <Choice
                      name="refundMethod"
                      required
                      placeholder="Choose method"
                      items={['cash', 'mpesa', 'card', 'store_credit'].map(
                        (value) => [value, value.replace('_', ' ')]
                      )}
                    />
                  </Field>
                  <Field label="Returned goods">
                    <Choice
                      name="disposition"
                      required
                      placeholder="Choose action"
                      items={[
                        ['restock', 'Return to sellable stock'],
                        ['damaged', 'Do not restock'],
                      ]}
                    />
                  </Field>
                </div>
                <Field label="Refund reason">
                  <Input
                    name="reason"
                    minLength={3}
                    maxLength={300}
                    required
                    placeholder="Explain why this is being refunded"
                  />
                </Field>
                {selectedSale && (
                  <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-900 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-100">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      You are about to refund{' '}
                      <strong>
                        {formatCurrency(Number(selectedSale.total), currency)}
                      </strong>{' '}
                      and issue a credit note for {selectedSale.receiptNo}.
                    </span>
                  </div>
                )}
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setRefundOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={refundPending || !selectedSale}
                  >
                    {refundPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {refundPending ? 'Refunding…' : 'Confirm full refund'}
                  </Button>
                </DialogFooter>
              </form>
            ) : (
              <Empty
                title="No refundable receipts"
                detail="Completed, unrefunded receipts will appear here."
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
}

function ActionButton({
  icon: Icon,
  title,
  detail,
  danger = false,
}: {
  icon: React.ElementType;
  title: string;
  detail: string;
  danger?: boolean;
}) {
  return (
    <button className="flex items-center gap-4 rounded-xl border bg-card p-4 text-left shadow-sm transition-colors hover:bg-muted/40">
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${danger ? 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'}`}
      >
        <Icon className="h-5 w-5" />
      </span>
      <span>
        <span className="block text-sm font-bold">{title}</span>
        <span className="mt-1 block text-xs text-muted-foreground">
          {detail}
        </span>
      </span>
    </button>
  );
}
function Field({
  label,
  optional,
  children,
}: {
  label: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold">
        {label}
        {optional && (
          <span className="font-normal text-muted-foreground"> (optional)</span>
        )}
      </span>
      {children}
    </label>
  );
}
function Choice({
  name,
  placeholder,
  items,
  required,
}: {
  name: string;
  placeholder: string;
  items: string[][];
  required?: boolean;
}) {
  return (
    <Select name={name} required={required}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {items.map(([value, label]) => (
          <SelectItem key={value} value={value} className="capitalize">
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[0.62rem] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 truncate font-semibold capitalize">{value}</p>
    </div>
  );
}
function Empty({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-xl border border-dashed p-8 text-center">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}
