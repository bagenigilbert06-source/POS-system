'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  ClipboardCheck,
  Download,
  History,
  PackageCheck,
  PackagePlus,
  Search,
  Settings2,
  ShoppingCart,
  SlidersHorizontal,
  WalletCards,
  X,
} from 'lucide-react';
import { receiveStock } from '@/app/actions/receive-stock';
import { notify } from '@/lib/notify';
import {
  approveStockAdjustment,
  authorizeInventoryExport,
  createStockAdjustment,
  rejectStockAdjustment,
  startStockCountSession,
  updateReorderLevel,
} from '@/app/actions/stock-adjustments';
import { Button } from '@/components/ui/button';
import { ProductImage } from '@/components/products/product-image';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
  InventoryBalance,
  Product,
  StockAdjustment,
  StockAdjustmentItem,
  StockMovement,
} from '@/lib/db/schema';
import {
  estimatedStockCoverDays,
  inventoryStatus,
  recommendedOrderQuantity,
  type InventoryStatus,
} from '@/lib/inventory/rules';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { useWorkspace } from '@/lib/context/workspace-context';
import {
  getProductTerminology,
  type ProductTerminology,
} from '@/lib/products/terminology';

type Tab = 'stock' | 'replenishment' | 'counts' | 'movements';
type InventoryProduct = Product & {
  unitsSoldMonth: number;
  categoryName?: string | null;
  onHand?: number;
  reserved?: number;
  unavailable?: number;
  incoming?: number;
};
const INVENTORY_PAGE_SIZE = 25;

interface InventoryManagerProps {
  products: InventoryProduct[];
  movements: StockMovement[];
  adjustments: StockAdjustment[];
  adjustmentItems: StockAdjustmentItem[];
  balances: InventoryBalance[];
  branches: Branch[];
  currency: string;
  canAdjust: boolean;
  canReceive: boolean;
  canStartCounts: boolean;
  canSubmitAdjustments: boolean;
  canExport: boolean;
  canApproveAdjustments: boolean;
  currentUserId: string;
  initialReceiveProductId?: string;
  canPurchase: boolean;
}

export function InventoryManager({
  products: organizationProducts,
  movements,
  adjustments,
  adjustmentItems,
  balances,
  branches,
  currency,
  canAdjust,
  canReceive,
  canStartCounts,
  canSubmitAdjustments,
  canExport,
  canApproveAdjustments,
  currentUserId,
  initialReceiveProductId,
  canPurchase,
}: InventoryManagerProps) {
  const { config } = useWorkspace();
  const productTerms = getProductTerminology(
    config?.businessType,
    config?.businessCategory
  );
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<Tab>('stock');
  const [pages, setPages] = useState<Record<Tab, number>>({
    stock: 1,
    replenishment: 1,
    counts: 1,
    movements: 1,
  });
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | InventoryStatus>(
    'all'
  );
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [movementFilter, setMovementFilter] = useState('all');
  const [movementProductId, setMovementProductId] = useState('all');
  const [movementFrom, setMovementFrom] = useState(() => {
    const value = new Date();
    value.setDate(value.getDate() - 30);
    return value.toISOString().slice(0, 10);
  });
  const [movementTo, setMovementTo] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [countProduct, setCountProduct] = useState<InventoryProduct | null>(
    null
  );
  const [startCountOpen, setStartCountOpen] = useState(false);
  const [countLines, setCountLines] = useState<
    Array<{ productId: string; quantityAfter: number }>
  >([]);
  const [reorderProduct, setReorderProduct] = useState<InventoryProduct | null>(
    null
  );
  const [receiveProduct, setReceiveProduct] = useState<InventoryProduct | null>(
    () =>
      (canReceive
        ? organizationProducts.find(
            (item) => item.id === initialReceiveProductId
          )
        : null) ?? null
  );
  const [receiveQuantity, setReceiveQuantity] = useState(1);
  const [receiveUnit, setReceiveUnit] = useState<
    'base' | 'case' | 'pack' | 'crate' | 'carton'
  >('base');
  const [branchId, setBranchId] = useState('all');
  const products = useMemo(() => {
    const balancesByProduct = new Map<string, InventoryBalance[]>();
    balances
      .filter((item) => branchId === 'all' || item.branchId === branchId)
      .forEach((item) =>
        balancesByProduct.set(item.productId, [
          ...(balancesByProduct.get(item.productId) ?? []),
          item,
        ])
      );

    return organizationProducts.map((item) => {
      const productBalances = balancesByProduct.get(item.id) ?? [];
      const onHand = productBalances.reduce(
        (sum, balance) => sum + Number(balance.onHand),
        0
      );
      const reserved = productBalances.reduce(
        (sum, balance) => sum + Number(balance.reserved),
        0
      );
      const unavailable = productBalances.reduce(
        (sum, balance) => sum + Number(balance.unavailable),
        0
      );
      const incoming = productBalances.reduce(
        (sum, balance) => sum + Number(balance.incoming),
        0
      );
      const reorderPoint =
        branchId === 'all'
          ? productBalances.reduce(
              (sum, balance) => sum + Number(balance.reorderPoint),
              0
            )
          : Number(productBalances[0]?.reorderPoint ?? item.minStock);

      return {
        ...item,
        minStock: reorderPoint || Number(item.minStock),
        stock: Math.max(0, onHand - reserved - unavailable),
        onHand,
        reserved,
        unavailable,
        incoming,
      };
    });
  }, [organizationProducts, balances, branchId]);
  const openCount = (item: InventoryProduct) => {
    setCountProduct(item);
    setCountLines([
      { productId: item.id, quantityAfter: item.onHand ?? item.stock },
    ]);
  };

  const statusOf = (item: InventoryProduct): InventoryStatus =>
    inventoryStatus(item.stock, item.minStock);
  const normalizedSearch = search.trim().toLowerCase();
  const visibleProducts = useMemo(
    () =>
      products
        .filter((item) => {
          const matchesSearch =
            !normalizedSearch ||
            [item.name, item.sku, item.barcode, item.brand].some((value) =>
              value?.toLowerCase().includes(normalizedSearch)
            );
          return (
            matchesSearch &&
            (categoryFilter === 'all' || item.categoryId === categoryFilter) &&
            (stockFilter === 'all' || statusOf(item) === stockFilter)
          );
        })
        .sort((a, b) => a.stock - b.stock || a.name.localeCompare(b.name)),
    [products, normalizedSearch, categoryFilter, stockFilter]
  );
  const categories = useMemo(
    () =>
      [
        ...new Map(
          products
            .filter((item) => item.categoryId)
            .map((item) => [
              item.categoryId!,
              item.categoryName || 'Uncategorised',
            ])
        ).entries(),
      ].sort((a, b) => a[1].localeCompare(b[1])),
    [products]
  );
  const activeBranchId = branchId === 'all' ? branches[0]?.id : branchId;
  const openReceive = (item: InventoryProduct) => {
    setReceiveProduct(item);
    setReceiveQuantity(1);
    setReceiveUnit('base');
  };
  const replenishment = products
    .filter((item) => item.stock + (item.incoming ?? 0) <= item.minStock)
    .sort((a, b) => a.stock - a.minStock - (b.stock - b.minStock));
  const pendingCounts = adjustments.filter(
    (item) =>
      ['pending', 'submitted', 'under_review'].includes(item.status) &&
      (branchId === 'all' || item.branchId === branchId)
  );
  const movementTypes = [...new Set(movements.map((item) => item.type))].sort();
  const visibleMovements = movements.filter((item) => {
    const movementProduct = products.find(
      (product) => product.id === item.productId
    );
    const matchesSearch =
      !normalizedSearch ||
      [
        item.productName,
        movementProduct?.sku,
        item.reason,
        item.referenceType,
        item.referenceId,
      ].some((value) => value?.toLowerCase().includes(normalizedSearch));
    const matchesType =
      movementFilter === 'all' || item.type === movementFilter;
    const matchesProduct =
      movementProductId === 'all' || item.productId === movementProductId;
    const matchesLocation = branchId === 'all' || item.branchId === branchId;
    const createdAt = item.createdAt.toISOString().slice(0, 10);
    return (
      matchesSearch &&
      matchesType &&
      matchesProduct &&
      matchesLocation &&
      createdAt >= movementFrom &&
      createdAt <= movementTo
    );
  });
  const itemsByAdjustment = new Map<string, StockAdjustmentItem[]>();
  adjustmentItems.forEach((item) =>
    itemsByAdjustment.set(item.adjustmentId, [
      ...(itemsByAdjustment.get(item.adjustmentId) ?? []),
      item,
    ])
  );

  const run = (
    action: () => Promise<unknown>,
    success: string,
    after?: () => void
  ) =>
    startTransition(async () => {
      try {
        await notify.track(action, {
          loading: 'Saving inventory changesâ€¦',
          success,
          error: (error) =>
            error instanceof Error ? error.message : 'Inventory action failed',
        });
        after?.();
        router.refresh();
      } catch { /* notify.track reports the failure */ }
    });

  const exportCurrentTab = async () => {
    try {
      await authorizeInventoryExport();
    } catch (error) {
      notify.error(
        error instanceof Error ? error.message : 'Export permission denied'
      );
      return;
    }
    const escape = (value: unknown) =>
      `"${String(value ?? '').replaceAll('"', '""')}"`;
    const stockRows = [
      [
        productTerms.singular,
        'SKU',
        'Barcode',
        'On hand',
        'Unit',
        'Reorder level',
        'Units sold this month',
        'Estimated cover days',
        'Status',
        'Unit cost',
        'Stock value',
      ],
      ...visibleProducts.map((item) => [
        item.name,
        item.sku ?? '',
        item.barcode ?? '',
        item.stock,
        item.unit,
        item.minStock,
        item.unitsSoldMonth,
        estimatedStockCoverDays(item.stock, item.unitsSoldMonth)?.toFixed(1) ??
          '',
        statusOf(item),
        item.buyingPrice,
        Number(item.buyingPrice) * item.stock,
      ]),
    ];
    const rows =
      tab === 'stock'
        ? stockRows
        : tab === 'replenishment'
          ? [
              [
                productTerms.singular,
                'SKU',
                'Available',
                'Incoming',
                'Reorder level',
                '30-day demand',
                'Suggested restock',
                'Estimated cost',
              ],
              ...replenishment.map((item) => {
                const suggested = recommendedOrderQuantity(
                  item.stock + (item.incoming ?? 0),
                  item.minStock,
                  item.unitsSoldMonth
                );
                return [
                  item.name,
                  item.sku ?? '',
                  item.stock,
                  item.incoming ?? 0,
                  item.minStock,
                  item.unitsSoldMonth,
                  suggested,
                  Number(item.buyingPrice) * suggested,
                ];
              }),
            ]
          : tab === 'counts'
            ? [
                [
                  'Adjustment',
                  'Type',
                  'Status',
                  'Location',
                  'Submitted',
                  'Notes',
                ],
                ...adjustments.map((item) => [
                  item.adjustmentNo,
                  item.type,
                  item.status,
                  branches.find((branch) => branch.id === item.branchId)
                    ?.name ?? '',
                  formatDateTime(item.createdAt),
                  item.notes ?? '',
                ]),
              ]
            : [
                [
                  'Date',
                  productTerms.singular,
                  'Movement',
                  'Change',
                  'Balance before',
                  'Balance after',
                  'Reference',
                  'Reason',
                ],
                ...visibleMovements.map((item) => [
                  formatDateTime(item.createdAt),
                  item.productName,
                  item.type,
                  item.quantity,
                  item.stockBefore,
                  item.stockAfter,
                  item.referenceId ?? item.referenceType ?? '',
                  item.reason ?? '',
                ]),
              ];
    const blob = new Blob(
      [rows.map((row) => row.map(escape).join(',')).join('\n')],
      { type: 'text/csv;charset=utf-8' }
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `inventory-${tab}-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const tabs: {
    id: Tab;
    label: string;
    count?: number;
    icon: React.ElementType;
  }[] = [
    {
      id: 'stock',
      label: 'Stock on hand',
      count: products.length,
      icon: PackageCheck,
    },
    {
      id: 'replenishment',
      label: 'Replenishment',
      count: replenishment.length,
      icon: ShoppingCart,
    },
    {
      id: 'counts',
      label: 'Counts & adjustments',
      count: pendingCounts.length,
      icon: ClipboardCheck,
    },
    {
      id: 'movements',
      label: 'Movement ledger',
      count: movements.length,
      icon: History,
    },
  ];
  const setPage = (target: Tab, page: number) =>
    setPages((current) => ({ ...current, [target]: page }));
  const resetPage = (target: Tab) => setPage(target, 1);

  return (
    <>
      <InventorySummary
        products={products}
        currency={currency}
        statusOf={statusOf}
        terminology={productTerms}
        onViewStatus={(status) => {
          setTab('stock');
          setStockFilter(status);
          resetPage('stock');
        }}
      />
      <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="flex gap-1 overflow-x-auto border-b bg-muted/20 p-2">
          {tabs.map(({ id, label, count, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                'inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors',
                tab === id
                  ? 'bg-background text-foreground shadow-sm ring-1 ring-border'
                  : 'text-muted-foreground hover:bg-background/60 hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
              {typeof count === 'number' && (
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-[0.65rem]',
                    tab === id
                      ? 'bg-[#fff3bd] text-[#765800] dark:bg-[rgba(255,214,10,.12)] dark:text-[#ffd60a]'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                resetPage(tab);
              }}
              placeholder={
                tab === 'movements'
                  ? `Search ${productTerms.singularLower}, reason or reference…`
                  : `Search ${productTerms.singularLower}, SKU or barcode…`
              }
              className="h-10 pl-9"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {branches.length > 1 && (
              <Select
                value={branchId}
                onValueChange={(value) => {
                  setBranchId(value);
                  setPages({
                    stock: 1,
                    replenishment: 1,
                    counts: 1,
                    movements: 1,
                  });
                }}
              >
                <SelectTrigger className="h-10 w-[190px]">
                  <SelectValue placeholder="Inventory location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All locations</SelectItem>
                  {branches.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {tab === 'stock' && (
              <>
                {categories.length > 0 && (
                  <Select
                    value={categoryFilter}
                    onValueChange={(value) => {
                      setCategoryFilter(value);
                      resetPage('stock');
                    }}
                  >
                    <SelectTrigger className="h-10 w-[170px]">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All categories</SelectItem>
                      {categories.map(([id, name]) => (
                        <SelectItem key={id} value={id}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Select
                  value={stockFilter}
                  onValueChange={(value) => {
                    setStockFilter(value as typeof stockFilter);
                    resetPage('stock');
                  }}
                >
                  <SelectTrigger className="h-10 w-[150px]">
                    <SlidersHorizontal className="mr-2 h-4 w-4" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All stock</SelectItem>
                    <SelectItem value="healthy">In stock</SelectItem>
                    <SelectItem value="low">Low stock</SelectItem>
                    <SelectItem value="out">Out of stock</SelectItem>
                  </SelectContent>
                </Select>
              </>
            )}
            {tab === 'movements' && (
              <>
                <Input
                  type="date"
                  value={movementFrom}
                  max={movementTo}
                  onChange={(event) => {
                    setMovementFrom(event.target.value);
                    resetPage('movements');
                  }}
                  aria-label="Ledger start date"
                  className="h-10 w-[146px]"
                />
                <Input
                  type="date"
                  value={movementTo}
                  min={movementFrom}
                  onChange={(event) => {
                    setMovementTo(event.target.value);
                    resetPage('movements');
                  }}
                  aria-label="Ledger end date"
                  className="h-10 w-[146px]"
                />
                <Select
                  value={movementProductId}
                  onValueChange={(value) => {
                    setMovementProductId(value);
                    resetPage('movements');
                  }}
                >
                  <SelectTrigger className="h-10 w-[180px]">
                    <SelectValue placeholder={`All ${productTerms.pluralLower}`} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All {productTerms.pluralLower}</SelectItem>
                    {products.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={movementFilter}
                  onValueChange={(value) => {
                    setMovementFilter(value);
                    resetPage('movements');
                  }}
                >
                  <SelectTrigger className="h-10 w-[180px]">
                    <Settings2 className="mr-2 h-4 w-4" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All movement types</SelectItem>
                    {movementTypes.map((type) => (
                      <SelectItem
                        key={type}
                        value={type}
                        className="capitalize"
                      >
                        {type.replaceAll('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
            {canExport && (
              <Button
                type="button"
                variant="outline"
                onClick={() => void exportCurrentTab()}
                className="h-10 gap-2"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            )}
            {canReceive && tab !== 'movements' && (
              <Button
                type="button"
                onClick={() => products[0] && openReceive(products[0])}
                disabled={!products.length || !activeBranchId}
                className="h-10 gap-2"
              >
                <PackagePlus className="h-4 w-4" />
                Receive stock
              </Button>
            )}
            {canStartCounts && tab !== 'movements' && (
              <Button
                type="button"
                onClick={() => setStartCountOpen(true)}
                disabled={!products.length}
                className="h-10 gap-2"
              >
                <ClipboardCheck className="h-4 w-4" />
                Count stock
              </Button>
            )}
            {canSubmitAdjustments && tab === 'counts' && (
              <Button
                type="button"
                variant="outline"
                onClick={() => products[0] && openCount(products[0])}
                disabled={!products.length}
                className="h-10 gap-2"
              >
                <ClipboardCheck className="h-4 w-4" />
                New adjustment
              </Button>
            )}
            {tab === 'counts' && (
              <Button asChild variant="outline" className="h-10">
                <Link href="/dashboard/inventory/counts">
                  View all sessions
                </Link>
              </Button>
            )}
            {tab === 'movements' && (
              <Button asChild variant="outline" className="h-10">
                <Link href="/dashboard/inventory/movements">
                  Open full ledger
                </Link>
              </Button>
            )}
          </div>
        </div>

        {tab === 'stock' && (
          <StockTable
            products={visibleProducts}
            currency={currency}
            statusOf={statusOf}
            terminology={productTerms}
            canReceive={canReceive}
            onReceive={openReceive}
            page={pages.stock}
            onPageChange={(page) => setPage('stock', page)}
          />
        )}
        {tab === 'replenishment' && (
          <Replenishment
            products={replenishment}
            currency={currency}
            canPurchase={canPurchase}
            canReceive={canReceive}
            canAdjust={canAdjust}
            onReorder={setReorderProduct}
            onReceive={openReceive}
            page={pages.replenishment}
            onPageChange={(page) => setPage('replenishment', page)}
          />
        )}
        {tab === 'counts' && (
          <AdjustmentHistory
            adjustments={adjustments}
            itemsByAdjustment={itemsByAdjustment}
            pending={pending}
            canApprove={canApproveAdjustments}
            currentUserId={currentUserId}
            run={run}
            page={pages.counts}
            onPageChange={(page) => setPage('counts', page)}
          />
        )}
        {tab === 'movements' && (
          <MovementLedger
            movements={visibleMovements}
            terminology={productTerms}
            page={pages.movements}
            onPageChange={(page) => setPage('movements', page)}
          />
        )}
      </section>

      <Dialog open={startCountOpen} onOpenChange={setStartCountOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Start a stock count</DialogTitle>
            <DialogDescription>
              Creates a count session for every active {productTerms.singularLower} at the selected
              location. Stock changes only after the submitted variances are
              approved.
            </DialogDescription>
          </DialogHeader>
          <form
            action={(form) =>
              startTransition(async () => {
                try {
                  const result = await startStockCountSession({
                    branchId: String(form.get('branchId')),
                    name: String(form.get('name')),
                    countMode: 'full',
                    blindCount: form.get('blindCount') === 'on',
                    notes: String(form.get('notes') || ''),
                  });
                  notify.success('Stock count session started');
                  setStartCountOpen(false);
                  router.push(
                    `/dashboard/inventory/counts/${result.sessionId}`
                  );
                } catch (error) {
                  notify.error(
                    error instanceof Error
                      ? error.message
                      : 'Could not start stock count'
                  );
                }
              })
            }
            className="space-y-4 pt-2"
          >
            <div className="space-y-2">
              <Label htmlFor="count-name">Count name / reference</Label>
              <Input
                id="count-name"
                name="name"
                minLength={3}
                maxLength={120}
                placeholder={`Full count · ${new Date().toLocaleDateString()}`}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Select name="branchId" defaultValue={activeBranchId} required>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-start gap-3 rounded-lg border p-3 text-sm">
              <input type="checkbox" name="blindCount" className="mt-1" />
              <span>
                <strong className="block">Blind count</strong>
                <span className="text-xs text-muted-foreground">
                  Hide expected quantities from the counter to reduce bias.
                </span>
              </span>
            </label>
            <div className="space-y-2">
              <Label htmlFor="count-session-notes">Notes (optional)</Label>
              <Input
                id="count-session-notes"
                name="notes"
                maxLength={500}
                placeholder="Area, shelf range, or counting instructions"
              />
            </div>
            <Button disabled={pending || !activeBranchId} className="w-full">
              {pending ? 'Starting…' : 'Start full-location count'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(receiveProduct)}
        onOpenChange={(open) => !open && setReceiveProduct(null)}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Receive stock</DialogTitle>
            <DialogDescription>
              Record stock that has physically arrived. Quantities are converted
              to the {productTerms.singularLower}&apos;s base inventory unit and added to the
              movement ledger.
            </DialogDescription>
          </DialogHeader>
          {receiveProduct && activeBranchId && (
            <form
              action={(form) =>
                run(
                  () =>
                    receiveStock({
                      productId: receiveProduct.id,
                      branchId: String(form.get('branchId')),
                      quantity: Number(form.get('quantity')),
                      unit: receiveUnit,
                      unitCost: form.get('unitCost')
                        ? Number(form.get('unitCost'))
                        : undefined,
                      source: String(form.get('source') || ''),
                      reference: String(form.get('reference') || ''),
                      note: String(form.get('note') || ''),
                      receivedAt: new Date(String(form.get('receivedAt'))),
                    }),
                  `${receiveProduct.name} stock received`,
                  () => setReceiveProduct(null)
                )
              }
              className="space-y-4 pt-2"
            >
              <div className="flex items-center gap-3 rounded-xl border bg-muted/20 p-3">
                <ProductThumbnail product={receiveProduct} large />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{receiveProduct.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Current stock:{' '}
                    {receiveProduct.onHand ?? receiveProduct.stock}{' '}
                    {receiveProduct.unit}
                  </p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{productTerms.singular}</Label>
                  <Select
                    value={receiveProduct.id}
                    onValueChange={(id) => {
                      const next = products.find((item) => item.id === id);
                      if (next) openReceive(next);
                    }}
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
                </div>
                <div className="space-y-2">
                  <Label>Location / branch</Label>
                  <Select
                    name="branchId"
                    defaultValue={activeBranchId}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="receive-quantity">Quantity received</Label>
                  <Input
                    id="receive-quantity"
                    name="quantity"
                    type="number"
                    min="1"
                    max="1000000"
                    value={receiveQuantity}
                    onChange={(event) =>
                      setReceiveQuantity(Number(event.target.value))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Select
                    value={receiveUnit}
                    onValueChange={(value) =>
                      setReceiveUnit(value as typeof receiveUnit)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="base">
                        {receiveProduct.unit || 'Piece'} (base unit)
                      </SelectItem>
                      {receiveProduct.unitsPerPack &&
                        Number(receiveProduct.unitsPerPack) > 0 && (
                          <>
                            <SelectItem value="case">Case</SelectItem>
                            <SelectItem value="pack">Pack</SelectItem>
                            <SelectItem value="crate">Crate</SelectItem>
                            <SelectItem value="carton">Carton</SelectItem>
                          </>
                        )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-200">
                {receiveUnit === 'base'
                  ? `${receiveQuantity || 0} ${receiveProduct.unit}`
                  : `${receiveQuantity || 0} ${receiveUnit}${receiveQuantity === 1 ? '' : 's'} × ${receiveProduct.unitsPerPack} = ${(receiveQuantity || 0) * Number(receiveProduct.unitsPerPack || 0)} ${receiveProduct.unit}`}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="receive-cost">
                    Cost per selected unit (optional)
                  </Label>
                  <Input
                    id="receive-cost"
                    name="unitCost"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="receive-date">Date received</Label>
                  <Input
                    id="receive-date"
                    name="receivedAt"
                    type="date"
                    max={new Date().toISOString().slice(0, 10)}
                    defaultValue={new Date().toISOString().slice(0, 10)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="receive-source">
                    Supplier / source (optional)
                  </Label>
                  <Input
                    id="receive-source"
                    name="source"
                    maxLength={120}
                    placeholder="Where the stock came from"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="receive-reference">
                    Invoice / reference (optional)
                  </Label>
                  <Input
                    id="receive-reference"
                    name="reference"
                    maxLength={120}
                    placeholder="INV-00124"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="receive-note">Note (optional)</Label>
                <Input
                  id="receive-note"
                  name="note"
                  maxLength={500}
                  placeholder="Condition, delivery details, or other context"
                />
              </div>
              <Button disabled={pending} className="w-full gap-2">
                <PackagePlus className="h-4 w-4" />
                {pending
                  ? 'Receiving…'
                  : `Receive ${(receiveQuantity || 0) * (receiveUnit === 'base' ? 1 : Number(receiveProduct.unitsPerPack || 0))} ${receiveProduct.unit}`}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(countProduct)}
        onOpenChange={(open) => !open && setCountProduct(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Submit a stock adjustment</DialogTitle>
            <DialogDescription>
              Record an exception such as breakage, damage, loss or a data
              correction. The change remains pending until independently
              approved.
            </DialogDescription>
          </DialogHeader>
          {countProduct && (
            <form
              action={(form) =>
                run(
                  () =>
                    createStockAdjustment({
                      branchId: activeBranchId,
                      type: String(form.get('type')) as
                        | 'stocktake'
                        | 'breakage'
                        | 'damage'
                        | 'missing'
                        | 'theft_loss'
                        | 'expired_unsellable'
                        | 'promotional_use'
                        | 'staff_use'
                        | 'correction'
                        | 'data_entry'
                        | 'other',
                      items: countLines,
                      notes: String(form.get('notes')),
                    }),
                  'Stock adjustment submitted for approval',
                  () => setCountProduct(null)
                )
              }
              className="space-y-4 pt-2"
            >
              <div className="space-y-2">
                <Label>{productTerms.plural} adjusted</Label>
                {countLines.map((line, index) => {
                  const selected = products.find(
                    (item) => item.id === line.productId
                  );
                  return (
                    <div
                      key={`${line.productId}-${index}`}
                      className="grid grid-cols-[1fr_110px_36px] gap-2"
                    >
                      <Select
                        value={line.productId}
                        onValueChange={(id) => {
                          const item = products.find(
                            (product) => product.id === id
                          );
                          setCountLines((current) =>
                            current.map((entry, lineIndex) =>
                              lineIndex === index
                                ? {
                                    productId: id,
                                    quantityAfter:
                                      item?.onHand ?? item?.stock ?? 0,
                                  }
                                : entry
                            )
                          );
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {products
                            .filter(
                              (item) =>
                                item.id === line.productId ||
                                !countLines.some(
                                  (entry) => entry.productId === item.id
                                )
                            )
                            .map((item) => (
                              <SelectItem key={item.id} value={item.id}>
                                {item.name} · {item.onHand ?? item.stock}{' '}
                                {item.unit} on hand
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <Input
                        aria-label={`Physical quantity for ${selected?.name ?? productTerms.singularLower}`}
                        type="number"
                        min="0"
                        max="10000000"
                        value={line.quantityAfter}
                        onChange={(event) =>
                          setCountLines((current) =>
                            current.map((entry, lineIndex) =>
                              lineIndex === index
                                ? {
                                    ...entry,
                                    quantityAfter: Number(event.target.value),
                                  }
                                : entry
                            )
                          )
                        }
                        required
                      />
                      <button
                        type="button"
                        aria-label="Remove count line"
                        disabled={countLines.length === 1}
                        onClick={() =>
                          setCountLines((current) =>
                            current.filter(
                              (_, lineIndex) => lineIndex !== index
                            )
                          )
                        }
                        className="rounded-md text-muted-foreground hover:bg-muted disabled:opacity-30"
                      >
                        <X className="mx-auto h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={countLines.length >= products.length}
                  onClick={() => {
                    const next = products.find(
                      (item) =>
                        !countLines.some((line) => line.productId === item.id)
                    );
                    if (next)
                      setCountLines((current) => [
                        ...current,
                        {
                          productId: next.id,
                          quantityAfter: next.onHand ?? next.stock,
                        },
                      ]);
                  }}
                >
                  Add another {productTerms.singularLower}
                </Button>
              </div>
              <div className="space-y-2">
                <Label>Adjustment reason</Label>
                <Select name="type" defaultValue="breakage" required>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="breakage">Breakage</SelectItem>
                    <SelectItem value="damage">Damage</SelectItem>
                    <SelectItem value="missing">Missing stock</SelectItem>
                    <SelectItem value="theft_loss">Theft / loss</SelectItem>
                    <SelectItem value="expired_unsellable">
                      Expired / unsellable
                    </SelectItem>
                    <SelectItem value="promotional_use">
                      Promotional use
                    </SelectItem>
                    <SelectItem value="staff_use">
                      Staff / internal use
                    </SelectItem>
                    <SelectItem value="data_entry">
                      Data-entry correction
                    </SelectItem>
                    <SelectItem value="correction">
                      General correction
                    </SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="count-notes">Adjustment note</Label>
                <Input
                  id="count-notes"
                  name="notes"
                  minLength={3}
                  maxLength={500}
                  required
                  placeholder="Explain what happened and where"
                />
              </div>
              <Button disabled={pending} className="w-full">
                {pending ? 'Submitting…' : 'Submit adjustment for approval'}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(reorderProduct)}
        onOpenChange={(open) => !open && setReorderProduct(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update reorder level</DialogTitle>
            <DialogDescription>
              Pesaby flags this item when on-hand stock reaches this quantity.
            </DialogDescription>
          </DialogHeader>
          {reorderProduct && (
            <form
              action={(form) =>
                run(
                  () =>
                    updateReorderLevel({
                      productId: reorderProduct.id,
                      branchId: activeBranchId,
                      minStock: Number(form.get('minStock')),
                    }),
                  'Reorder level updated',
                  () => setReorderProduct(null)
                )
              }
              className="space-y-4 pt-2"
            >
              <div className="rounded-lg border bg-muted/20 px-4 py-3">
                <p className="font-semibold">{reorderProduct.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Currently {reorderProduct.onHand ?? reorderProduct.stock}{' '}
                  {reorderProduct.unit} on hand at this location
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reorder-level">Low-stock alert level</Label>
                <Input
                  id="reorder-level"
                  name="minStock"
                  type="number"
                  min="0"
                  max="10000000"
                  defaultValue={reorderProduct.minStock}
                  required
                />
              </div>
              <Button disabled={pending} className="w-full">
                {pending ? 'Saving…' : 'Save reorder level'}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function ProductThumbnail({
  product,
  large = false,
}: {
  product: InventoryProduct;
  large?: boolean;
}) {
  return (
    <span
      className={cn(
        'relative block shrink-0 overflow-hidden rounded-lg border bg-white',
        large ? 'h-16 w-16' : 'h-11 w-11'
      )}
    >
      <ProductImage
        src={product.imageUrl}
        alt={product.name}
        sizes={large ? '64px' : '44px'}
        className="transition-transform duration-200 group-hover:scale-105"
      />
    </span>
  );
}

function InventorySummary({
  products,
  currency,
  statusOf,
  onViewStatus,
  terminology,
}: {
  products: InventoryProduct[];
  currency: string;
  statusOf: (item: InventoryProduct) => InventoryStatus;
  onViewStatus: (status: InventoryStatus) => void;
  terminology: ProductTerminology;
}) {
  const inventoryValue = products.reduce(
    (sum, item) => sum + Number(item.buyingPrice) * (item.onHand ?? item.stock),
    0
  );
  const lowStock = products.filter((item) => statusOf(item) === 'low').length;
  const outOfStock = products.filter((item) => statusOf(item) === 'out').length;
  const healthyStock = Math.max(0, products.length - lowStock - outOfStock);
  const healthPercentage = products.length
    ? Math.round((healthyStock / products.length) * 100)
    : 0;
  const unitCount = products.reduce((sum, item) => sum + item.stock, 0);
  const metrics = [
    {
      label: 'Inventory value',
      value: formatCurrency(inventoryValue, currency),
      detail: `${unitCount} units at recorded buying cost`,
      icon: WalletCards,
      tone: 'default',
    },
    {
      label: 'Stock health',
      value: `${healthPercentage}%`,
      detail: `${healthyStock} of ${products.length} ${terminology.pluralLower} ready to sell`,
      icon: PackageCheck,
      tone: healthPercentage === 100 ? 'success' : 'default',
    },
    {
      label: 'Low stock',
      value: String(lowStock),
      detail: lowStock ? 'At or below reorder level' : `No low-stock ${terminology.pluralLower}`,
      icon: AlertTriangle,
      tone: lowStock ? 'warning' : 'success',
      status: 'low',
    },
    {
      label: 'Out of stock',
      value: String(outOfStock),
      detail: outOfStock
        ? 'Unavailable for sale'
        : `All active ${terminology.pluralLower} available`,
      icon: X,
      tone: outOfStock ? 'warning' : 'success',
      status: 'out',
    },
  ] as const;

  return (
    <section
      aria-label="Inventory summary"
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
    >
      {metrics.map(({ label, value, detail, icon: Icon, tone, ...metric }) => (
        <article key={label} className="metric-card min-h-[132px]">
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {label}
            </p>
            <span
              className={
                tone === 'warning'
                  ? 'flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300'
                  : tone === 'success'
                    ? 'flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                    : 'flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground'
              }
            >
              <Icon className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight tabular-nums">
            {value}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
          {'status' in metric && Number(value) > 0 && (
            <button
              type="button"
              onClick={() => onViewStatus(metric.status)}
              className="mt-2 text-xs font-semibold text-[var(--dashboard-accent)] hover:underline"
            >
              View items <ArrowRight className="ml-0.5 inline h-3 w-3" />
            </button>
          )}
        </article>
      ))}
    </section>
  );
}

function StockTable({
  products,
  currency,
  statusOf,
  terminology,
  canReceive,
  onReceive,
  page,
  onPageChange,
}: {
  products: InventoryProduct[];
  currency: string;
  statusOf: (item: InventoryProduct) => InventoryStatus;
  terminology: ProductTerminology;
  canReceive: boolean;
  onReceive: (item: InventoryProduct) => void;
  page: number;
  onPageChange: (page: number) => void;
}) {
  if (!products.length)
    return (
      <Empty
        title="No matching inventory"
        detail="Try changing the search or stock status filter."
      />
    );
  const pagination = paginate(products, page);
  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="border-b bg-muted/20 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-5 py-3 font-semibold">{terminology.singular}</th>
              <th className="px-4 py-3 text-right font-semibold">Available</th>
              <th className="px-4 py-3 text-right font-semibold">
                Sold (30 days)
              </th>
              <th className="px-4 py-3 text-right font-semibold">
                Stock value
              </th>
              <th className="px-4 py-3 text-center font-semibold">Status</th>
              <th className="px-5 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {pagination.items.map((item) => {
              const status = statusOf(item);
              return (
                <tr key={item.id} className="hover:bg-muted/20">
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/dashboard/inventory/${item.id}`}
                      className="group flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <span className="transition-transform group-hover:scale-[1.03]">
                        <ProductThumbnail product={item} />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold group-hover:text-primary group-hover:underline">
                          {item.name}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {[
                            item.categoryName,
                            item.volume
                              ? `${Number(item.volume)} ${item.volumeUnit || ''}`
                              : null,
                            item.sku || 'No SKU',
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3.5 text-right font-bold tabular-nums">
                    {item.stock}{' '}
                    <span className="font-normal text-muted-foreground">
                      {item.unit}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right tabular-nums">
                    {item.unitsSoldMonth}
                  </td>
                  <td className="px-4 py-3.5 text-right font-semibold tabular-nums">
                    {formatCurrency(
                      Number(item.buyingPrice) * (item.onHand ?? item.stock),
                      currency
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <StockBadge status={status} />
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex justify-end gap-1">
                      {canReceive && (
                        <button
                          type="button"
                          onClick={() => onReceive(item)}
                          className="rounded-md p-2 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
                          aria-label={`Receive ${item.name}`}
                          title="Receive stock"
                        >
                          <PackagePlus className="h-4 w-4" />
                        </button>
                      )}
                      <Link
                        href={`/dashboard/inventory/${item.id}`}
                        className="inline-flex items-center rounded-md px-2.5 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        View details <ArrowRight className="ml-1 h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Pagination {...pagination} onPageChange={onPageChange} />
    </>
  );
}

function Replenishment({
  products,
  currency,
  canPurchase,
  canReceive,
  canAdjust,
  onReorder,
  onReceive,
  page,
  onPageChange,
}: {
  products: InventoryProduct[];
  currency: string;
  canPurchase: boolean;
  canReceive: boolean;
  canAdjust: boolean;
  onReorder: (item: InventoryProduct) => void;
  onReceive: (item: InventoryProduct) => void;
  page: number;
  onPageChange: (page: number) => void;
}) {
  if (!products.length)
    return (
      <Empty
        title="Stock levels are healthy"
        detail="Nothing is currently at or below its reorder level."
        positive
      />
    );
  const pagination = paginate(products, page);
  return (
    <div>
      <div className="border-b bg-amber-50/60 px-5 py-4 text-sm dark:bg-amber-950/10">
        <p className="font-semibold text-amber-900 dark:text-amber-200">
          Recommendations use available stock, genuine transfer stock in
          transit, the safety level and recent 30-day demand.
        </p>
        <p className="mt-1 text-xs text-amber-800/80 dark:text-amber-300/70">
          They are informational only. Obtain stock externally, then record it
          with Receive Stock.
        </p>
      </div>
      <div className="divide-y">
        {pagination.items.map((item) => {
          const projected = item.stock + (item.incoming ?? 0);
          const suggested = recommendedOrderQuantity(
            projected,
            item.minStock,
            item.unitsSoldMonth
          );
          return (
            <article
              key={item.id}
              className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center"
            >
              <span
                className={cn(
                  'h-2.5 w-2.5 shrink-0 rounded-full',
                  item.stock <= 0 ? 'bg-red-500' : 'bg-amber-500'
                )}
              />
              <ProductThumbnail product={item} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{item.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.stock} {item.unit} available · {item.incoming ?? 0}{' '}
                  incoming · alert at {item.minStock} · {item.unitsSoldMonth}{' '}
                  sold this month ·{' '}
                  {formatCurrency(
                    Number(item.buyingPrice) * suggested,
                    currency
                  )}{' '}
                  estimated cost
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">
                    Suggested restock
                  </p>
                  <p className="font-bold tabular-nums">
                    {suggested} {item.unit}
                  </p>
                </div>
                {canAdjust && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onReorder(item)}
                  >
                    Edit level
                  </Button>
                )}
                {canReceive && (
                  <Button size="sm" onClick={() => onReceive(item)}>
                    <PackagePlus className="mr-1.5 h-4 w-4" />
                    Receive stock
                  </Button>
                )}
                {canPurchase && (
                  <Button asChild size="sm">
                    <Link href={`/dashboard/purchases?productId=${item.id}`}>
                      Receive stock
                    </Link>
                  </Button>
                )}
              </div>
            </article>
          );
        })}
      </div>
      <Pagination {...pagination} onPageChange={onPageChange} />
    </div>
  );
}

function AdjustmentHistory({
  adjustments,
  itemsByAdjustment,
  pending,
  canApprove,
  currentUserId,
  run,
  page,
  onPageChange,
}: {
  adjustments: StockAdjustment[];
  itemsByAdjustment: Map<string, StockAdjustmentItem[]>;
  pending: boolean;
  canApprove: boolean;
  currentUserId: string;
  run: (
    action: () => Promise<unknown>,
    success: string,
    after?: () => void
  ) => void;
  page: number;
  onPageChange: (page: number) => void;
}) {
  if (!adjustments.length)
    return (
      <Empty
        title="No stock counts yet"
        detail="Use Count stock to record the first physical count and variance."
      />
    );
  const pagination = paginate(adjustments, page);
  return (
    <>
      <div className="divide-y">
        {pagination.items.map((adjustment) => {
          const items = itemsByAdjustment.get(adjustment.id) ?? [];
          const variance = items.reduce((sum, item) => sum + item.variance, 0);
          const isSubmitter = adjustment.userId === currentUserId;
          return (
            <article key={adjustment.id} className="px-5 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold">
                      {adjustment.type === 'stocktake' ? (
                        <Link
                          href={`/dashboard/inventory/counts/${adjustment.id}`}
                          className="hover:text-primary hover:underline"
                        >
                          {adjustment.adjustmentNo}
                        </Link>
                      ) : (
                        adjustment.adjustmentNo
                      )}
                    </p>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[0.68rem] font-semibold capitalize">
                      {adjustment.type}
                    </span>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[0.68rem] font-bold capitalize',
                        ['approved', 'completed'].includes(adjustment.status)
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                          : adjustment.status === 'rejected'
                            ? 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300'
                      )}
                    >
                      {adjustment.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDateTime(adjustment.createdAt)} ·{' '}
                    {adjustment.notes || 'No notes'}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {items.map((item) => (
                      <span
                        key={item.id}
                        className="rounded-md border bg-muted/20 px-2 py-1 text-xs"
                      >
                        {item.productName}: {item.quantityBefore} →{' '}
                        {item.quantityAfter}{' '}
                        <strong
                          className={
                            item.variance >= 0
                              ? 'text-emerald-600'
                              : 'text-red-600'
                          }
                        >
                          ({item.variance >= 0 ? '+' : ''}
                          {item.variance})
                        </strong>
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={cn(
                      'mr-2 text-sm font-bold tabular-nums',
                      variance >= 0 ? 'text-emerald-600' : 'text-red-600'
                    )}
                  >
                    {variance >= 0 ? '+' : ''}
                    {variance} net
                  </span>
                  {canApprove &&
                    ['pending', 'submitted', 'under_review'].includes(
                      adjustment.status
                    ) &&
                    (isSubmitter ? (
                      <span
                        className="text-xs text-muted-foreground"
                        title="A different staff member must review this count"
                      >
                        Self-approval unavailable
                      </span>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          disabled={pending}
                          onClick={() =>
                            run(
                              () => approveStockAdjustment(adjustment.id),
                              'Stock count approved'
                            )
                          }
                          className="gap-1.5"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={pending}
                          onClick={() => {
                            const reason = window.prompt(
                              'Why are you rejecting this stock count?'
                            );
                            if (reason)
                              run(
                                () =>
                                  rejectStockAdjustment(adjustment.id, reason),
                                'Stock count rejected'
                              );
                          }}
                          className="gap-1.5"
                        >
                          <X className="h-3.5 w-3.5" />
                          Reject
                        </Button>
                      </>
                    ))}
                </div>
              </div>
            </article>
          );
        })}
      </div>
      <Pagination {...pagination} onPageChange={onPageChange} />
    </>
  );
}

function MovementLedger({
  movements,
  terminology,
  page,
  onPageChange,
}: {
  movements: StockMovement[];
  terminology: ProductTerminology;
  page: number;
  onPageChange: (page: number) => void;
}) {
  if (!movements.length)
    return (
      <Empty
        title="No matching stock movements"
        detail="Sales, receipts, returns, losses and approved counts appear here."
      />
    );
  const pagination = paginate(movements, page);
  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[850px] text-sm">
          <thead className="border-b bg-muted/20 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-5 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold">{terminology.singular}</th>
              <th className="px-4 py-3 font-semibold">Movement</th>
              <th className="px-4 py-3 text-right font-semibold">Change</th>
              <th className="px-4 py-3 text-right font-semibold">Balance</th>
              <th className="px-5 py-3 font-semibold">Reason / reference</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {pagination.items.map((item) => (
              <tr key={item.id} className="hover:bg-muted/20">
                <td className="whitespace-nowrap px-5 py-3 text-xs text-muted-foreground">
                  {formatDateTime(item.createdAt)}
                </td>
                <td className="px-4 py-3 font-semibold">{item.productName}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-muted px-2 py-1 text-xs font-semibold capitalize">
                    {item.type.replaceAll('_', ' ')}
                  </span>
                </td>
                <td
                  className={cn(
                    'px-4 py-3 text-right font-bold tabular-nums',
                    item.quantity >= 0 ? 'text-emerald-600' : 'text-red-600'
                  )}
                >
                  {item.quantity >= 0 ? (
                    <ArrowUp className="mr-1 inline h-3.5 w-3.5" />
                  ) : (
                    <ArrowDown className="mr-1 inline h-3.5 w-3.5" />
                  )}
                  {item.quantity > 0 ? '+' : ''}
                  {item.quantity}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {item.stockBefore} → <strong>{item.stockAfter}</strong>
                </td>
                <td className="max-w-xs px-5 py-3 text-xs text-muted-foreground">
                  <p className="truncate">{item.reason || 'No note'}</p>
                  {item.referenceId &&
                    (item.referenceType === 'sale' ? (
                      <Link
                        href={`/dashboard/sales/${item.referenceId}`}
                        className="mt-0.5 inline-block font-semibold text-primary hover:underline"
                      >
                        {item.referenceId}
                      </Link>
                    ) : (
                      <span className="mt-0.5 block font-semibold text-foreground">
                        {item.referenceId}
                      </span>
                    ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination {...pagination} onPageChange={onPageChange} />
    </>
  );
}

function paginate<T>(items: T[], requestedPage: number) {
  const pageCount = Math.max(1, Math.ceil(items.length / INVENTORY_PAGE_SIZE));
  const page = Math.min(Math.max(1, requestedPage), pageCount);
  const start = (page - 1) * INVENTORY_PAGE_SIZE;
  return {
    items: items.slice(start, start + INVENTORY_PAGE_SIZE),
    page,
    pageCount,
    start,
    total: items.length,
  };
}

function Pagination({
  page,
  pageCount,
  start,
  total,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  start: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  if (total <= INVENTORY_PAGE_SIZE) return null;
  const end = Math.min(start + INVENTORY_PAGE_SIZE, total);
  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3 dark:border-slate-800"
    >
      <p className="text-xs tabular-nums text-muted-foreground">
        Showing {start + 1}–{end} of {total}
      </p>
      <div className="inline-flex overflow-hidden rounded-lg border bg-background shadow-sm dark:border-slate-700">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="inline-flex h-8 items-center gap-1 px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Previous
        </button>
        <span className="flex h-8 items-center border-x px-3 text-xs tabular-nums text-muted-foreground dark:border-slate-700">
          {page} / {pageCount}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page === pageCount}
          className="inline-flex h-8 items-center gap-1 px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
        >
          Next
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </nav>
  );
}

function StockBadge({ status }: { status: InventoryStatus }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-1 text-xs font-bold',
        status === 'healthy'
          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
          : status === 'low'
            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300'
            : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300'
      )}
    >
      {status === 'healthy'
        ? 'In stock'
        : status === 'low'
          ? 'Low stock'
          : 'Out of stock'}
    </span>
  );
}

function Empty({
  title,
  detail,
  positive = false,
}: {
  title: string;
  detail: string;
  positive?: boolean;
}) {
  const Icon = positive ? Check : AlertTriangle;
  return (
    <div className="flex min-h-64 flex-col items-center justify-center p-8 text-center">
      <span
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-xl',
          positive
            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30'
            : 'bg-muted text-muted-foreground'
        )}
      >
        <Icon className="h-6 w-6" />
      </span>
      <p className="mt-3 font-semibold">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{detail}</p>
    </div>
  );
}
