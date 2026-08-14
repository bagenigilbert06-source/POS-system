'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronDown,
  ChevronUp,
  CreditCard,
  Plus,
  Truck,
  UserPlus,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  createSupplier,
  receivePurchase,
  recordPurchasePayment,
  setSupplierStatus,
} from '@/app/actions/purchases';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import type {
  Branch,
  Product,
  Purchase,
  PurchaseItem,
  StockMovement,
  Supplier,
} from '@/lib/db/schema';

type Props = {
  suppliers: Supplier[];
  purchases: Purchase[];
  purchaseItems: PurchaseItem[];
  products: Product[];
  movements: StockMovement[];
  branches: Branch[];
  currency: string;
  canManage: boolean;
  requestedProductId?: string;
};

export function ProcurementManager({
  suppliers,
  purchases,
  purchaseItems,
  products,
  movements,
  branches,
  currency,
  canManage,
  requestedProductId,
}: Props) {
  const router = useRouter();
  const initialProductId = products.some(
    (item) => item.id === requestedProductId
  )
    ? requestedProductId
    : undefined;
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(
    Boolean(canManage && initialProductId && suppliers.length)
  );
  const [expanded, setExpanded] = useState<string>();
  const [pending, startTransition] = useTransition();
  const itemsByPurchase = useMemo(
    () =>
      new Map(
        purchases.map((record) => [
          record.id,
          purchaseItems.filter((item) => item.purchaseId === record.id),
        ])
      ),
    [purchases, purchaseItems]
  );
  const activeSuppliers = suppliers.filter((item) => item.status === 'active');
  const run = (
    work: () => Promise<void>,
    message: string,
    close?: () => void
  ) =>
    startTransition(async () => {
      try {
        await work();
        toast.success(message);
        close?.();
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : 'Could not save record'
        );
      }
    });
  const pay = (record: Purchase) => {
    const outstanding = Number(record.total) - Number(record.paidAmount);
    const entered = window.prompt(
      `Outstanding: ${formatCurrency(outstanding, currency)}\nEnter payment amount`,
      outstanding.toFixed(2)
    );
    if (entered === null) return;
    const amount = Number(entered);
    if (!Number.isFinite(amount) || amount <= 0)
      return toast.error('Enter a valid payment amount');
    const reference =
      window.prompt('Payment reference (optional)') || undefined;
    run(
      () => recordPurchasePayment({ purchaseId: record.id, amount, reference }),
      'Supplier payment recorded'
    );
  };

  return (
    <div className="space-y-5">
      {canManage && (
        <div className="flex flex-wrap gap-2">
          <Dialog open={supplierOpen} onOpenChange={setSupplierOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <UserPlus className="h-4 w-4" />
                New supplier
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add supplier</DialogTitle>
                <DialogDescription>
                  Set contact details and normal payment and delivery terms.
                </DialogDescription>
              </DialogHeader>
              <form
                action={(form) =>
                  run(
                    () =>
                      createSupplier({
                        name: String(form.get('name')),
                        contactPerson: String(form.get('contactPerson') || ''),
                        phone: String(form.get('phone') || ''),
                        email: String(form.get('email') || ''),
                        taxId: String(form.get('taxId') || ''),
                        address: String(form.get('address') || ''),
                        paymentTermsDays: Number(
                          form.get('paymentTermsDays') || 0
                        ),
                        leadTimeDays: Number(form.get('leadTimeDays') || 0),
                        notes: String(form.get('notes') || ''),
                      }),
                    'Supplier added',
                    () => setSupplierOpen(false)
                  )
                }
                className="space-y-4"
              >
                <Field name="name" label="Supplier name" required />
                <Field name="contactPerson" label="Contact person" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field name="phone" label="Phone" />
                  <Field name="email" label="Email" type="email" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field name="taxId" label="Tax or registration ID" />
                  <Field name="address" label="Address" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    name="paymentTermsDays"
                    label="Payment terms (days)"
                    type="number"
                    min="0"
                    defaultValue="0"
                  />
                  <Field
                    name="leadTimeDays"
                    label="Lead time (days)"
                    type="number"
                    min="0"
                    defaultValue="0"
                  />
                </div>
                <Field name="notes" label="Notes" />
                <Button disabled={pending} className="w-full">
                  Save supplier
                </Button>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
            <DialogTrigger asChild>
              <Button
                disabled={
                  !activeSuppliers.length ||
                  !products.length ||
                  !branches.length
                }
                className="gap-2 bg-[#e42527] font-bold text-white hover:bg-[#c91f21]"
              >
                <Plus className="h-4 w-4" />
                Quick receive
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Receive a direct purchase</DialogTitle>
                <DialogDescription>
                  Use this for a simple one-product delivery. Use a purchase
                  order below for multi-line or tracked goods.
                </DialogDescription>
              </DialogHeader>
              <form
                action={(form) =>
                  run(
                    () =>
                      receivePurchase({
                        supplierId: String(form.get('supplierId')),
                        productId: String(form.get('productId')),
                        branchId: String(form.get('branchId')),
                        quantity: Number(form.get('quantity')),
                        unitCost: Number(form.get('unitCost')),
                        amountPaid: Number(form.get('amountPaid') || 0),
                        reference: String(form.get('reference') || ''),
                        notes: String(form.get('notes') || ''),
                      }),
                    'Purchase received and stock updated',
                    () => setReceiptOpen(false)
                  )
                }
                className="space-y-4"
              >
                <SelectField
                  name="supplierId"
                  label="Supplier"
                  items={activeSuppliers.map((item) => ({
                    value: item.id,
                    label: item.name,
                  }))}
                />
                <SelectField
                  name="branchId"
                  label="Receiving location"
                  defaultValue={branches[0]?.id}
                  items={branches.map((item) => ({
                    value: item.id,
                    label: item.name,
                  }))}
                />
                <SelectField
                  name="productId"
                  label="Product"
                  defaultValue={initialProductId}
                  items={products.map((item) => ({
                    value: item.id,
                    label: `${item.name} · ${item.stock} ${item.unit}`,
                  }))}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    name="quantity"
                    label="Quantity received"
                    type="number"
                    required
                    min="1"
                  />
                  <Field
                    name="unitCost"
                    label={`Unit cost (${currency})`}
                    type="number"
                    required
                    min="0"
                    step="0.01"
                  />
                </div>
                <Field
                  name="amountPaid"
                  label={`Amount paid now (${currency})`}
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue="0"
                />
                <Field name="reference" label="Supplier invoice/reference" />
                <Field name="notes" label="Notes" />
                <Button
                  disabled={pending}
                  className="w-full bg-[#e42527] text-white hover:bg-[#c91f21]"
                >
                  {pending ? 'Receiving…' : 'Receive and update stock'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      )}

      <section className="rounded-xl border bg-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold">Suppliers</h2>
            <p className="text-sm text-muted-foreground">
              Contacts, terms, lead times and availability.
            </p>
          </div>
          <span className="text-sm font-semibold">
            {activeSuppliers.length} active
          </span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {suppliers.map((vendor) => (
            <article key={vendor.id} className="rounded-lg border p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold">{vendor.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {vendor.contactPerson ||
                      vendor.phone ||
                      vendor.email ||
                      'No contact entered'}
                  </p>
                </div>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">
                  {vendor.status}
                </span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Payment: {vendor.paymentTermsDays} days · Lead time:{' '}
                {vendor.leadTimeDays} days
              </p>
              {canManage && (
                <Button
                  className="mt-3"
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() =>
                    run(
                      () =>
                        setSupplierStatus(
                          vendor.id,
                          vendor.status === 'active' ? 'inactive' : 'active'
                        ),
                      `Supplier ${vendor.status === 'active' ? 'deactivated' : 'activated'}`
                    )
                  }
                >
                  {vendor.status === 'active' ? 'Deactivate' : 'Activate'}
                </Button>
              )}
            </article>
          ))}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,.65fr)]">
        <section className="overflow-hidden rounded-xl border bg-card">
          <div className="border-b px-5 py-4">
            <h2 className="font-bold">Purchase and payable history</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Received goods, invoices and supplier balances.
            </p>
          </div>
          {purchases.length ? (
            <div className="divide-y">
              {purchases.map((record) => {
                const lines = itemsByPurchase.get(record.id) ?? [];
                const outstanding = Math.max(
                  0,
                  Number(record.total) - Number(record.paidAmount)
                );
                return (
                  <article key={record.id} className="px-4 py-4 sm:px-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#fff3be]">
                        <Truck className="h-4 w-4" />
                      </span>
                      <button
                        className="min-w-0 flex-1 text-left"
                        onClick={() =>
                          setExpanded(
                            expanded === record.id ? undefined : record.id
                          )
                        }
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-bold">{record.purchaseNo}</p>
                          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold capitalize">
                            {record.paymentStatus}
                          </span>
                          {expanded === record.id ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5" />
                          )}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {record.supplierName} ·{' '}
                          {formatDateTime(record.createdAt)}
                          {record.reference ? ` · ${record.reference}` : ''}
                        </p>
                      </button>
                      <div className="text-right">
                        <p className="font-extrabold tabular-nums">
                          {formatCurrency(record.total, currency)}
                        </p>
                        {outstanding > 0 && (
                          <p className="text-xs text-amber-700">
                            Due {formatCurrency(outstanding, currency)}
                          </p>
                        )}
                      </div>
                      {canManage && outstanding > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={pending}
                          onClick={() => pay(record)}
                        >
                          <CreditCard className="mr-1 h-3.5 w-3.5" />
                          Pay
                        </Button>
                      )}
                    </div>
                    {expanded === record.id && (
                      <div className="mt-3 rounded-lg bg-muted/50 p-3 text-sm">
                        <div className="space-y-1">
                          {lines.map((line) => (
                            <div
                              key={line.id}
                              className="flex justify-between gap-3"
                            >
                              <span>
                                {line.productName} × {line.quantity}
                              </span>
                              <span>
                                {formatCurrency(line.totalCost, currency)}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 flex justify-between border-t pt-2 font-semibold">
                          <span>Paid</span>
                          <span>
                            {formatCurrency(record.paidAmount, currency)}
                          </span>
                        </div>
                        {record.dueDate && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Due date: {formatDateTime(record.dueDate)}
                          </p>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <Empty text="No purchases received" />
          )}
        </section>
        <section className="overflow-hidden rounded-xl border bg-card">
          <div className="border-b px-5 py-4">
            <h2 className="font-bold">Stock movement ledger</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Latest auditable stock changes.
            </p>
          </div>
          {movements.length ? (
            <div className="divide-y">
              {movements.map((item) => (
                <div key={item.id} className="px-5 py-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-bold">
                      {item.productName}
                    </p>
                    <span
                      className={
                        item.quantity > 0
                          ? 'font-bold text-emerald-700'
                          : 'font-bold text-red-600'
                      }
                    >
                      {item.quantity > 0 ? '+' : ''}
                      {item.quantity}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.stockBefore} → {item.stockAfter} ·{' '}
                    {item.type.replace(/_/g, ' ')} ·{' '}
                    {formatDateTime(item.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <Empty text="Stock movements appear after receiving goods" />
          )}
        </section>
      </div>
    </div>
  );
}

function Field({
  name,
  label,
  ...props
}: {
  name: string;
  label: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} {...props} />
    </div>
  );
}
function SelectField({
  name,
  label,
  items,
  defaultValue,
}: {
  name: string;
  label: string;
  items: { value: string; label: string }[];
  defaultValue?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select name={name} defaultValue={defaultValue ?? items[0]?.value}>
        <SelectTrigger>
          <SelectValue placeholder={`Choose ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="p-8 text-center text-sm text-muted-foreground">{text}</div>
  );
}
