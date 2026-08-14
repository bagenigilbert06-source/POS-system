'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, PackagePlus, Send, Truck, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  approveInventoryTransfer,
  cancelInventoryTransfer,
  createInventoryTransfer,
  createPurchaseOrder,
  dispatchInventoryTransfer,
  receiveInventoryTransfer,
  receivePurchaseOrder,
  setPurchaseOrderStatus,
} from '@/app/actions/inventory-lifecycle';
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
import type {
  Branch,
  InventoryTransfer,
  InventoryTransferItem,
  Product,
  PurchaseOrder,
  PurchaseOrderItem,
  Supplier,
} from '@/lib/db/schema';
import { formatCurrency, formatDateTime } from '@/lib/utils';

type Line = { productId: string; quantity: number; unitCost: number };

export function InventoryLifecycleManager({
  products,
  suppliers,
  branches,
  purchaseOrders,
  poItems,
  transfers,
  transferItems,
  currency,
  canPurchase,
  canTransfer,
  showTransfers = true,
}: {
  products: Product[];
  suppliers: Supplier[];
  branches: Branch[];
  purchaseOrders: PurchaseOrder[];
  poItems: PurchaseOrderItem[];
  transfers: InventoryTransfer[];
  transferItems: InventoryTransferItem[];
  currency: string;
  canPurchase: boolean;
  canTransfer: boolean;
  showTransfers?: boolean;
}) {
  const router = useRouter(),
    [pending, startTransition] = useTransition();
  const [poOpen, setPoOpen] = useState(false),
    [transferOpen, setTransferOpen] = useState(false);
  const [poLines, setPoLines] = useState<Line[]>([
    {
      productId: products[0]?.id ?? '',
      quantity: 1,
      unitCost: Number(products[0]?.buyingPrice ?? 0),
    },
  ]);
  const [transferLines, setTransferLines] = useState<
    Array<{ productId: string; quantity: number }>
  >([{ productId: products[0]?.id ?? '', quantity: 1 }]);
  const byPo = useMemo(
    () =>
      new Map(
        purchaseOrders.map((po) => [
          po.id,
          poItems.filter((item) => item.poId === po.id),
        ])
      ),
    [purchaseOrders, poItems]
  );
  const byTransfer = useMemo(
    () =>
      new Map(
        transfers.map((transfer) => [
          transfer.id,
          transferItems.filter((item) => item.transferId === transfer.id),
        ])
      ),
    [transfers, transferItems]
  );
  const run = (
    work: () => Promise<unknown>,
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
          error instanceof Error ? error.message : 'Inventory action failed'
        );
      }
    });
  const updatePoLine = (index: number, patch: Partial<Line>) =>
    setPoLines((current) =>
      current.map((line, lineIndex) =>
        lineIndex === index ? { ...line, ...patch } : line
      )
    );
  const receiveRemainingOrder = (
    po: PurchaseOrder,
    lines: PurchaseOrderItem[]
  ) => {
    const receiptLines = lines
      .filter(
        (item) =>
          item.quantity >
          Number(item.receivedQuantity) + Number(item.rejectedQuantity)
      )
      .map((item) => {
        const catalogueItem = products.find(
          (product) => product.id === item.productId
        );
        const acceptedQuantity =
          item.quantity -
          Number(item.receivedQuantity) -
          Number(item.rejectedQuantity);
        let lotNumber: string | undefined,
          expiresAt: Date | undefined,
          serialNumbers: string[] = [];
        if (catalogueItem?.trackingMode === 'lot') {
          lotNumber =
            window
              .prompt(`Lot or batch number for ${item.description}`)
              ?.trim() || undefined;
          const expiry = window
            .prompt(`Expiry date for ${item.description} (YYYY-MM-DD)`)
            ?.trim();
          if (!lotNumber || !expiry)
            throw new Error(
              `${item.description} requires its lot and expiry date`
            );
          expiresAt = new Date(`${expiry}T00:00:00`);
          if (Number.isNaN(expiresAt.getTime()))
            throw new Error(`Invalid expiry date for ${item.description}`);
        }
        if (catalogueItem?.trackingMode === 'serial') {
          serialNumbers = (
            window.prompt(
              `Enter ${acceptedQuantity} serial numbers for ${item.description}, separated by commas`
            ) || ''
          )
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean);
          if (serialNumbers.length !== acceptedQuantity)
            throw new Error(
              `${item.description} needs exactly ${acceptedQuantity} serial numbers`
            );
        }
        return {
          poItemId: item.id,
          acceptedQuantity,
          rejectedQuantity: 0,
          lotNumber,
          expiresAt,
          serialNumbers,
        };
      });
    run(
      () =>
        receivePurchaseOrder({
          poId: po.id,
          idempotencyKey: crypto.randomUUID(),
          items: receiptLines,
        }),
      'Purchase order received'
    );
  };

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {canPurchase && (
          <Dialog open={poOpen} onOpenChange={setPoOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <PackagePlus className="h-4 w-4" />
                Create purchase order
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create purchase order</DialogTitle>
                <DialogDescription>
                  Order multiple products now and receive them partially when
                  deliveries arrive.
                </DialogDescription>
              </DialogHeader>
              <form
                action={(form) =>
                  run(
                    () =>
                      createPurchaseOrder({
                        supplierId: String(form.get('supplierId')),
                        branchId: String(form.get('branchId')),
                        expectedDelivery: form.get('expectedDelivery')
                          ? new Date(String(form.get('expectedDelivery')))
                          : undefined,
                        notes: String(form.get('notes') || ''),
                        shippingAmount: Number(form.get('shippingAmount') || 0),
                        otherCosts: Number(form.get('otherCosts') || 0),
                        items: poLines,
                      }),
                    'Purchase order created',
                    () => setPoOpen(false)
                  )
                }
                className="space-y-4"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <Choice
                    name="supplierId"
                    label="Supplier"
                    items={suppliers.map((item) => ({
                      value: item.id,
                      label: item.name,
                    }))}
                  />
                  <Choice
                    name="branchId"
                    label="Receiving location"
                    items={branches.map((item) => ({
                      value: item.id,
                      label: item.name,
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Products</Label>
                  {poLines.map((line, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-[1fr_90px_120px_36px] gap-2"
                    >
                      <Select
                        value={line.productId}
                        onValueChange={(productId) =>
                          updatePoLine(index, {
                            productId,
                            unitCost: Number(
                              products.find((item) => item.id === productId)
                                ?.buyingPrice ?? 0
                            ),
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        aria-label="Quantity"
                        type="number"
                        min="1"
                        value={line.quantity}
                        onChange={(event) =>
                          updatePoLine(index, {
                            quantity: Number(event.target.value),
                          })
                        }
                      />
                      <Input
                        aria-label="Unit cost"
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.unitCost}
                        onChange={(event) =>
                          updatePoLine(index, {
                            unitCost: Number(event.target.value),
                          })
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={poLines.length === 1}
                        onClick={() =>
                          setPoLines((current) =>
                            current.filter(
                              (_, lineIndex) => lineIndex !== index
                            )
                          )
                        }
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setPoLines((current) => [
                      ...current,
                      {
                        productId:
                          products.find(
                            (item) =>
                              !current.some(
                                (line) => line.productId === item.id
                              )
                          )?.id ??
                          products[0]?.id ??
                          '',
                        quantity: 1,
                        unitCost: 0,
                      },
                    ])
                  }
                >
                  Add line
                </Button>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field
                    name="expectedDelivery"
                    label="Expected delivery"
                    type="date"
                  />
                  <Field
                    name="shippingAmount"
                    label="Shipping"
                    type="number"
                    min="0"
                    step="0.01"
                  />
                  <Field
                    name="otherCosts"
                    label="Other landed costs"
                    type="number"
                    min="0"
                    step="0.01"
                  />
                </div>
                <Field name="notes" label="Order notes" />
                <Button
                  disabled={
                    pending ||
                    !suppliers.length ||
                    !branches.length ||
                    !products.length
                  }
                  className="w-full"
                >
                  Save draft order
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
        {canTransfer && branches.length > 1 && (
          <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Truck className="h-4 w-4" />
                Create transfer
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>Move stock between locations</DialogTitle>
                <DialogDescription>
                  Stock is reserved on approval, becomes in transit on dispatch,
                  and reaches the destination only after receipt.
                </DialogDescription>
              </DialogHeader>
              <form
                action={(form) =>
                  run(
                    () =>
                      createInventoryTransfer({
                        fromBranchId: String(form.get('fromBranchId')),
                        toBranchId: String(form.get('toBranchId')),
                        reference: String(form.get('reference') || ''),
                        notes: String(form.get('notes') || ''),
                        items: transferLines,
                      }),
                    'Transfer created',
                    () => setTransferOpen(false)
                  )
                }
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <Choice
                    name="fromBranchId"
                    label="From"
                    items={branches.map((item) => ({
                      value: item.id,
                      label: item.name,
                    }))}
                  />
                  <Choice
                    name="toBranchId"
                    label="To"
                    items={branches.map((item) => ({
                      value: item.id,
                      label: item.name,
                    }))}
                  />
                </div>
                {transferLines.map((line, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-[1fr_100px_36px] gap-2"
                  >
                    <Select
                      value={line.productId}
                      onValueChange={(productId) =>
                        setTransferLines((current) =>
                          current.map((item, lineIndex) =>
                            lineIndex === index ? { ...item, productId } : item
                          )
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min="1"
                      value={line.quantity}
                      onChange={(event) =>
                        setTransferLines((current) =>
                          current.map((item, lineIndex) =>
                            lineIndex === index
                              ? {
                                  ...item,
                                  quantity: Number(event.target.value),
                                }
                              : item
                          )
                        )
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={transferLines.length === 1}
                      onClick={() =>
                        setTransferLines((current) =>
                          current.filter((_, lineIndex) => lineIndex !== index)
                        )
                      }
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setTransferLines((current) => [
                      ...current,
                      { productId: products[0]?.id ?? '', quantity: 1 },
                    ])
                  }
                >
                  Add line
                </Button>
                <Field name="reference" label="Reference" />
                <Field name="notes" label="Transfer notes" />
                <Button disabled={pending} className="w-full">
                  Create transfer
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div
        className={showTransfers ? 'grid gap-5 xl:grid-cols-2' : 'grid gap-5'}
      >
        <div className="overflow-hidden rounded-2xl border bg-card">
          <div className="border-b px-5 py-4">
            <h2 className="font-bold">Purchase orders</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Draft, approve and receive supplier orders.
            </p>
          </div>
          {purchaseOrders.length ? (
            <div className="divide-y">
              {purchaseOrders.map((po) => {
                const lines = byPo.get(po.id) ?? [],
                  open = lines.reduce(
                    (sum, item) =>
                      sum +
                      item.quantity -
                      Number(item.receivedQuantity) -
                      Number(item.rejectedQuantity),
                    0
                  );
                return (
                  <article key={po.id} className="space-y-3 px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold">{po.poNo}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatDateTime(po.createdAt)} · {lines.length} lines
                          · {open} open units
                        </p>
                      </div>
                      <span className="rounded-full bg-muted px-2 py-1 text-xs font-bold capitalize">
                        {po.status.replaceAll('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm font-semibold">
                      {formatCurrency(Number(po.total), currency)}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {po.status === 'draft' && (
                        <>
                          <Button
                            size="sm"
                            disabled={pending}
                            onClick={() =>
                              run(
                                () => setPurchaseOrderStatus(po.id, 'sent'),
                                'Purchase order marked sent'
                              )
                            }
                          >
                            <Send className="mr-1 h-3.5 w-3.5" />
                            Send
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={pending}
                            onClick={() =>
                              run(
                                () =>
                                  setPurchaseOrderStatus(po.id, 'confirmed'),
                                'Purchase order confirmed'
                              )
                            }
                          >
                            Confirm
                          </Button>
                        </>
                      )}
                      {['confirmed', 'partially_received'].includes(
                        po.status
                      ) && (
                        <Button
                          size="sm"
                          disabled={pending}
                          onClick={() => {
                            try {
                              receiveRemainingOrder(po, lines);
                            } catch (error) {
                              toast.error(
                                error instanceof Error
                                  ? error.message
                                  : 'Could not prepare receipt'
                              );
                            }
                          }}
                        >
                          Receive remaining
                        </Button>
                      )}
                      {['draft', 'sent', 'confirmed', 'partially_received'].includes(po.status) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={pending}
                          onClick={() =>
                            run(
                              () => setPurchaseOrderStatus(po.id, 'cancelled'),
                              'Purchase order cancelled'
                            )
                          }
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <Empty text="No purchase orders yet" />
          )}
        </div>
        {showTransfers && (
          <div className="overflow-hidden rounded-2xl border bg-card">
            <div className="border-b px-5 py-4">
              <h2 className="font-bold">Location transfers</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Reserved, in-transit and received branch stock.
              </p>
            </div>
            {transfers.length ? (
              <div className="divide-y">
                {transfers.map((transfer) => {
                  const lines = byTransfer.get(transfer.id) ?? [];
                  return (
                    <article key={transfer.id} className="space-y-3 px-5 py-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-bold">{transfer.transferNo}</p>
                          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                            {branches.find(
                              (item) => item.id === transfer.fromLocation
                            )?.name ?? 'Source'}{' '}
                            <ArrowRight className="h-3 w-3" />{' '}
                            {branches.find(
                              (item) => item.id === transfer.toLocation
                            )?.name ?? 'Destination'}{' '}
                            · {lines.length} lines
                          </p>
                        </div>
                        <span className="rounded-full bg-muted px-2 py-1 text-xs font-bold capitalize">
                          {transfer.status.replaceAll('_', ' ')}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {transfer.status === 'pending' && (
                          <Button
                            size="sm"
                            disabled={pending}
                            onClick={() =>
                              run(
                                () => approveInventoryTransfer(transfer.id),
                                'Transfer approved'
                              )
                            }
                          >
                            <Check className="mr-1 h-3.5 w-3.5" />
                            Approve
                          </Button>
                        )}
                        {transfer.status === 'approved' && (
                          <Button
                            size="sm"
                            disabled={pending}
                            onClick={() =>
                              run(
                                () => dispatchInventoryTransfer(transfer.id),
                                'Transfer dispatched'
                              )
                            }
                          >
                            Dispatch
                          </Button>
                        )}
                        {['in_transit', 'partially_received'].includes(
                          transfer.status
                        ) && (
                          <Button
                            size="sm"
                            disabled={pending}
                            onClick={() =>
                              run(
                                () =>
                                  receiveInventoryTransfer({
                                    transferId: transfer.id,
                                    idempotencyKey: crypto.randomUUID(),
                                    items: lines.map((item) => ({
                                      itemId: item.id,
                                      receivedQuantity:
                                        Number(item.dispatchedQuantity) -
                                        Number(item.receivedQuantity) -
                                        Number(item.rejectedQuantity),
                                      rejectedQuantity: 0,
                                    })),
                                  }),
                                'Transfer received'
                              )
                            }
                          >
                            Receive remaining
                          </Button>
                        )}
                        {['pending', 'approved'].includes(transfer.status) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={pending}
                            onClick={() =>
                              run(
                                () => cancelInventoryTransfer(transfer.id),
                                'Transfer cancelled'
                              )
                            }
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <Empty text="No location transfers yet" />
            )}
          </div>
        )}
      </div>
    </section>
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
function Choice({
  name,
  label,
  items,
}: {
  name: string;
  label: string;
  items: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select name={name} defaultValue={items[0]?.value}>
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
    <div className="p-10 text-center text-sm text-muted-foreground">{text}</div>
  );
}
