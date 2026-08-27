'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { archiveProduct } from '@/app/actions/products';
import { formatCurrency, normalizeBarcode } from '@/lib/utils';
import { getGrossMargin } from '@/lib/pricing/gross-margin';
import { cn } from '@/lib/utils';
import {
  Archive,
  Eye,
  Pencil,
  Plus,
  Search,
  Package,
  AlertTriangle,
  Tag,
  Grid2X2,
  List,
  ShoppingCart,
  Smartphone,
} from 'lucide-react';
import type { Product } from '@/lib/db/schema';
import { notify } from '@/lib/notify';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { WirelessScannerPairing } from '@/components/barcode/wireless-scanner-pairing';
import {
  getProductTerminology,
  type ProductTerminology,
} from '@/lib/products/terminology';

interface ProductsTableProps {
  initialProducts: Array<Product & { unitsSoldMonth: number; categoryName?: string | null }>;
  terminology?: ProductTerminology;
}

export function ProductsTable({
  initialProducts,
  terminology = getProductTerminology(),
}: ProductsTableProps) {
  const router = useRouter();
  const [products, setProducts] = useState(initialProducts);
  const [search, setSearch] = useState('');
  const [archiving, setArchiving] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<
    (Product & { unitsSoldMonth: number; categoryName?: string | null }) | null
  >(null);
  const [filter, setFilter] = useState<
    'all' | 'active' | 'low-stock' | 'critical' | 'out' | 'archived'
  >('all');
  // A compact list is the calmer default for a catalogue; users can still opt
  // into the visual card view when images are useful.
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [sort, setSort] = useState<
    'newest' | 'name' | 'price-low' | 'stock-low'
  >('newest');
  const [zoomedImage, setZoomedImage] = useState<{
    src: string;
    name: string;
  } | null>(null);
  const [showPhoneScanner, setShowPhoneScanner] = useState(false);

  useEffect(() => {
    setProducts(initialProducts);
    const savedView = window.localStorage.getItem('products-view');
    if (savedView === 'grid' || savedView === 'list') setViewMode(savedView);
  }, [initialProducts]);

  useEffect(() => {
    if (!zoomedImage) return;
    const closeOnEscape = (event: KeyboardEvent) =>
      event.key === 'Escape' && setZoomedImage(null);
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [zoomedImage]);

  const changeView = (nextView: 'grid' | 'list') => {
    setViewMode(nextView);
    window.localStorage.setItem('products-view', nextView);
  };

  const openScannedProduct = (rawBarcode: string) => {
    const barcode = normalizeBarcode(rawBarcode);
    if (!barcode) return false;
    const matches = products.filter(
      (item) =>
        item.isActive && normalizeBarcode(item.barcode ?? '') === barcode
    );
    setShowPhoneScanner(false);
    if (matches.length === 1) {
      notify.success(`${matches[0].name} found`);
      router.push(`/dashboard/products/${matches[0].id}?edit=true`);
      return true;
    }
    if (matches.length > 1) {
      notify.error(
        `This barcode is assigned to multiple ${terminology.pluralLower}. Correct the duplicate records first.`
      );
      return false;
    }
    notify.info('New barcode scanned', {
      description: `Complete the ${terminology.singularLower} details to add it to your catalogue.`,
    });
    router.push(
      `/dashboard/products/new?barcode=${encodeURIComponent(barcode)}`
    );
    return true;
  };

  const stockStatus = (p: Product) => {
    if (p.stock === 0) return 'out';
    if (p.stock <= Math.max(1, Math.floor(p.minStock * 0.25)))
      return 'critical';
    if (p.stock <= p.minStock) return 'low';
    return 'ok';
  };

  const filtered = products
    .filter((p) => {
      const matchSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.sku ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (p.barcode ?? '').toLowerCase().includes(search.toLowerCase());

      const status = stockStatus(p);
      if (filter === 'all') return matchSearch && p.isActive;
      if (filter === 'low-stock')
        return matchSearch && p.isActive && status === 'low';
      if (filter === 'critical')
        return matchSearch && p.isActive && status === 'critical';
      if (filter === 'out')
        return matchSearch && p.isActive && status === 'out';
      if (filter === 'active') return matchSearch && p.isActive;
      if (filter === 'archived') return matchSearch && !p.isActive;
      return matchSearch;
    })
    .sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'price-low')
        return Number(a.sellingPrice) - Number(b.sellingPrice);
      if (sort === 'stock-low') return a.stock - b.stock;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const handleArchive = async () => {
    if (!archiveTarget) return;
    setArchiving(archiveTarget.id);
    try {
      await archiveProduct(archiveTarget.id);
      setProducts((prev) =>
        prev.map((item) =>
          item.id === archiveTarget.id ? { ...item, isActive: false } : item
        )
      );
      notify.success(`${terminology.singular} archived`);
    } catch {
      notify.error(`Failed to archive ${terminology.singularLower}`);
    } finally {
      setArchiving(null);
      setArchiveTarget(null);
    }
  };


  const unitLabel = (unit: string, quantity: number) => {
    const normalized = unit === 'pcs' ? 'piece' : unit;
    return `${quantity} ${normalized}${quantity === 1 ? '' : 's'}`;
  };

  const stockBadge = {
    ok: 'bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))]',
    low: 'bg-[hsl(var(--warning)/0.1)] text-[hsl(var(--warning))]',
    critical: 'bg-orange-100 text-orange-700',
    out: 'bg-destructive/10 text-destructive',
  };

  const activeProducts = products.filter((product) => product.isActive);
  const lowStockCount = activeProducts.filter(
    (product) => stockStatus(product) === 'low'
  ).length;
  const criticalCount = activeProducts.filter(
    (product) => stockStatus(product) === 'critical'
  ).length;
  const outOfStockCount = activeProducts.filter(
    (product) => stockStatus(product) === 'out'
  ).length;

  const tabCounts = {
    all: activeProducts.length,
    active: activeProducts.length,
    'low-stock': activeProducts.filter(
      (product) => stockStatus(product) === 'low'
    ).length,
    critical: criticalCount,
    out: outOfStockCount,
    archived: products.filter((product) => !product.isActive).length,
  };
  const filterTabs = [
    { key: 'all', label: terminology.all },
    { key: 'active', label: 'Active' },
    { key: 'low-stock', label: 'Low Stock' },
    { key: 'critical', label: 'Critical' },
    { key: 'out', label: 'Out of Stock' },
    { key: 'archived', label: 'Archived' },
  ] as const;
  const emptyCopy = {
    all: [
      `No ${terminology.pluralLower} yet`,
      `Add your first ${terminology.singularLower} to start selling and tracking stock.`,
      true,
    ],
    active: [
      `No active ${terminology.pluralLower}`,
      `Active ${terminology.pluralLower} available for sale will appear here.`,
      false,
    ],
    'low-stock': [
      `No low-stock ${terminology.pluralLower}`,
      `${terminology.plural} that reach their low-stock alert level will appear here.`,
      false,
    ],
    critical: [
      `No critically low ${terminology.pluralLower}`,
      `${terminology.plural} that are nearly out of stock will appear here.`,
      false,
    ],
    out: [
      `No out-of-stock ${terminology.pluralLower}`,
      `${terminology.plural} with zero available stock will appear here.`,
      false,
    ],
    archived: [
      `No archived ${terminology.pluralLower}`,
      `${terminology.plural} you archive will appear here.`,
      false,
    ],
  }[filter];

  return (
    <div className="products-table [font-feature-settings:'ss01','cv02','cv03']">
      {zoomedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#050a1f]/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`Preview ${zoomedImage.name}`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setZoomedImage(null);
          }}
        >
          <div className="relative flex max-h-[90vh] max-w-[min(92vw,900px)] items-center justify-center rounded-xl bg-white p-2 shadow-2xl">
            <button
              type="button"
              onClick={() => setZoomedImage(null)}
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-lg text-[#344054] shadow-md hover:bg-[#fff8dc]"
              aria-label="Close image preview"
            >
              ×
            </button>
            <Image
              src={zoomedImage.src}
              alt={zoomedImage.name}
              width={1200}
              height={900}
              unoptimized
              className="max-h-[84vh] w-auto max-w-full rounded-lg object-contain"
            />
          </div>
        </div>
      )}
      <AlertDialog
        open={Boolean(archiveTarget)}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this {terminology.singularLower}?</AlertDialogTitle>
            <AlertDialogDescription>
              {archiveTarget?.name} will no longer appear in active {terminology.singularLower} and
              POS lists. Existing sales records remain unchanged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep {terminology.singularLower}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchive}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Archive {terminology.singularLower}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 rounded-xl border border-[#e4e7ec] bg-white p-3 shadow-[0_1px_2px_rgba(16,24,40,.03)] sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:bg-[#161616]">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={terminology.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter') return;
                const barcode = normalizeBarcode(search);
                if (!barcode) return;
                event.preventDefault();
                openScannedProduct(barcode);
              }}
              className="w-full rounded-lg border border-[#d0d5dd] bg-[#fbfbfc] py-2.5 pl-9 pr-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-white/10 dark:bg-[#1c1c1c]"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPhoneScanner(true)}
              className="inline-flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm font-semibold text-foreground hover:border-[#f9b21d] hover:bg-[#fff8e6] dark:hover:bg-[#2a2111]"
            >
              <Smartphone className="h-4 w-4" /> Scan to add
            </button>
            <Link
              href="/dashboard/products/categories"
              className="rounded-lg border bg-background px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary"
            >
              Categories
            </Link>
            <Link
              href="/dashboard/products/new"
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 flex-shrink-0"
            >
              <Plus className="h-4 w-4" />
              {terminology.add}
            </Link>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex max-w-full gap-5 overflow-x-auto border-b border-[#e4e7ec] px-1 dark:border-white/10">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={cn(
                'whitespace-nowrap border-b-2 px-1 pb-2.5 pt-1 text-sm font-medium transition-colors',
                filter === tab.key
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:border-[#d0d5dd] hover:text-foreground'
              )}
            >
              {tab.label}{' '}
              <span className="ml-1 text-xs text-muted-foreground">
                {tabCounts[tab.key]}
              </span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Sort by
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as typeof sort)}
              className="rounded-md border bg-background px-2 py-1.5 text-xs font-medium text-foreground outline-none focus:border-primary"
            >
              <option value="newest">Newest</option>
              <option value="name">Name</option>
              <option value="price-low">Price: low to high</option>
              <option value="stock-low">Stock: low to high</option>
            </select>
          </label>
          <div
            className="flex items-center rounded-lg border bg-white p-0.5 dark:bg-[#161616]"
            aria-label={`${terminology.singular} layout`}
          >
            <button
              type="button"
              onClick={() => changeView('grid')}
              aria-pressed={viewMode === 'grid'}
              aria-label="Grid view"
              className={cn(
                'rounded p-1.5',
                viewMode === 'grid'
                  ? 'bg-[#fff3bd] text-[#765800] dark:bg-[#332b10] dark:text-[#f5c542]'
                  : 'text-muted-foreground hover:bg-muted'
              )}
            >
              <Grid2X2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => changeView('list')}
              aria-pressed={viewMode === 'list'}
              aria-label="List view"
              className={cn(
                'rounded p-1.5',
                viewMode === 'list'
                  ? 'bg-[#fff3bd] text-[#765800] dark:bg-[#332b10] dark:text-[#f5c542]'
                  : 'text-muted-foreground hover:bg-muted'
              )}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
        {filter === 'low-stock' && (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/70 dark:bg-amber-950/30">
              <p className="text-xs font-medium text-amber-800 dark:text-amber-300">Low-stock {terminology.pluralLower}</p>
              <p className="mt-1 text-xl font-semibold text-amber-900 dark:text-amber-200">
                {lowStockCount}
              </p>
            </div>
            <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 dark:border-orange-900/70 dark:bg-orange-950/30">
              <p className="text-xs font-medium text-orange-800 dark:text-orange-300">Critical {terminology.pluralLower}</p>
              <p className="mt-1 text-xl font-semibold text-orange-900 dark:text-orange-200">
                {criticalCount}
              </p>
            </div>
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/70 dark:bg-red-950/30">
              <p className="text-xs font-medium text-red-800 dark:text-red-300">Out of stock</p>
              <p className="mt-1 text-xl font-semibold text-red-900 dark:text-red-200">
                {outOfStockCount}
              </p>
            </div>
          </div>
        )}

        {/* Product cards */}
        {filtered.length > 0 && viewMode === 'grid' && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {filtered.map((p) => {
              const buying = parseFloat(p.buyingPrice);
              const selling = parseFloat(p.sellingPrice);
              const profit = selling - buying;
              const grossMargin = getGrossMargin(selling, buying);
              const incompleteData = buying <= 0 || !p.sku;
              const status = stockStatus(p);
              const statusLabel =
                status === 'out'
                  ? 'Out of stock'
                  : status === 'critical'
                    ? 'Critical'
                    : status === 'low'
                      ? 'Low stock'
                      : 'In stock';
              return (
                <article
                  key={`card-${p.id}`}
                  className="relative flex h-full w-full min-w-0 flex-col overflow-hidden rounded-xl border border-[#e4e7ec] bg-white text-sm shadow-[0_1px_2px_rgba(16,24,40,.04)] dark:border-white/10 dark:bg-[#121212] dark:shadow-none"
                >
                  <div className="relative overflow-hidden bg-[#fffaf0] dark:bg-[#101010]">
                    <Link
                      href={`/dashboard/products/${p.id}`}
                      className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#e42527]"
                      aria-label={`View ${p.name} details`}
                    >
                      {p.imageUrl ? (
                        <Image
                          src={p.imageUrl}
                          alt={`${p.name} preview`}
                          width={320}
                          height={220}
                          unoptimized
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            setZoomedImage({ src: p.imageUrl!, name: p.name });
                          }}
                          className={`h-36 w-full cursor-zoom-in object-cover sm:h-40 lg:h-44 ${p.stock !== 0 ? '' : 'opacity-50'}`}
                        />
                      ) : (
                        <div className="flex h-36 items-center justify-center text-[#8a6500] dark:bg-[#1b180d] dark:text-[#d5aa2e] sm:h-40 lg:h-44">
                          <Package className="h-12 w-12 stroke-[1.35]" />
                        </div>
                      )}
                    </Link>
                    <div className="absolute left-2 top-2 z-10 flex flex-col items-start gap-1.5">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[11px] font-medium shadow-sm backdrop-blur-sm dark:bg-black/65',
                          status === 'ok'
                            ? 'text-[#28743c] dark:text-emerald-400'
                            : status === 'low'
                              ? 'text-[#9a6900] dark:text-amber-400'
                              : 'text-destructive dark:text-red-400'
                        )}
                      >
                        <Tag className="h-3.5 w-3.5" />
                        {!p.isActive ? 'Archived' : statusLabel}
                      </span>
                    </div>
                  </div>
                  <Link
                    href={`/dashboard/products/${p.id}`}
                    className="flex min-w-0 flex-1 flex-col gap-2 px-3 pb-2 pt-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#e42527]"
                    aria-label={`View ${p.name} details`}
                  >
                    <div className="min-w-0">
                      <h3 className="line-clamp-1 font-semibold leading-5 text-[#101828] dark:text-slate-100">
                        {p.name}
                      </h3>
                    </div>
                    <div className="flex min-h-5 min-w-0 items-center gap-1.5 overflow-hidden">
                      {p.categoryName && <span className="truncate text-[10px] font-medium text-[#875b00] dark:text-[#d6aa2d]">{p.categoryName}</span>}
                      {incompleteData && <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[10px] font-medium text-orange-700 dark:border-orange-900/70 dark:bg-orange-950/35 dark:text-orange-300"><AlertTriangle className="h-3 w-3" />Incomplete data</span>}
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-0.5">
                      <p className="text-[15px] font-semibold tabular-nums text-[#8a6200] dark:text-[#e6b832]">
                        {formatCurrency(selling)}
                      </p>
                      <span
                        className={cn(
                          'text-[11px] font-medium',
                          profit >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-destructive'
                        )}
                      >
                        {grossMargin.valid ? `${grossMargin.percent.toFixed(1)}% profit` : 'Check cost price'}
                      </span>
                    </div>
                  </Link>
                  <div className="flex min-h-10 items-center justify-between gap-2 px-3 pb-2 pt-1">
                    <span className="truncate text-[11px] text-muted-foreground">
                      {p.stock} {p.unit}{p.stock === 1 ? '' : 's'} available
                    </span>
                    <div className="flex shrink-0 items-center gap-2">
                      {p.isActive && status !== 'ok' && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            window.location.assign('/dashboard/inventory');
                          }}
                          className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                        >
                          <ShoppingCart className="h-3.5 w-3.5" />
                          Restock
                        </button>
                      )}
                      <div className="inline-flex items-center overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#171717]">
                        <Link
                          href={`/dashboard/products/${p.id}`}
                          onClick={(event) => event.stopPropagation()}
                          className="inline-flex h-8 w-8 items-center justify-center text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
                          aria-label={`View ${p.name}`}
                          title={`View ${terminology.singularLower}`}
                        >
                          <Eye className="h-4 w-4" aria-hidden="true" />
                        </Link>
                        <Link
                          href={`/dashboard/products/${p.id}?edit=true`}
                          onClick={(event) => event.stopPropagation()}
                          className="inline-flex h-8 w-8 items-center justify-center border-l border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
                          aria-label={`Edit ${p.name}`}
                          title={`Edit ${terminology.singularLower}`}
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </Link>
                        {p.isActive && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setArchiveTarget(p);
                            }}
                            disabled={archiving === p.id}
                            className="inline-flex h-8 w-8 items-center justify-center border-l border-slate-200 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-500 disabled:opacity-40 dark:border-white/10 dark:text-slate-400 dark:hover:bg-red-950/35 dark:hover:text-red-400"
                            aria-label={`Archive ${p.name}`}
                            title={`Archive ${terminology.singularLower}`}
                          >
                            <Archive className="h-4 w-4" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#dfe3ea] bg-white py-16 text-center">
            <Package className="mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-medium">
              {search ? `No ${terminology.pluralLower} found` : emptyCopy[0]}
            </p>
            <p className="mt-1 max-w-md text-xs text-muted-foreground">
              {search ? 'Try a different search term.' : emptyCopy[1]}
            </p>
            {emptyCopy[2] && !search && (
              <Link
                href="/dashboard/products/new"
                className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                Add {terminology.singularLower}
              </Link>
            )}
          </div>
        )}

        {/* Table */}
        <div
          className={cn(
            'rounded-lg border bg-card overflow-hidden',
            viewMode === 'grid' && 'hidden'
          )}
        >
          {filtered.length > 0 ? (
            <>
              <div className="grid gap-3 p-3 md:hidden">
                {filtered.map((p) => {
                  const status = stockStatus(p);
                  return (
                    <article
                      key={p.id}
                      className="rounded-xl border bg-white p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-bold">{p.name}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {p.sku ? `SKU ${p.sku}` : 'No SKU'} ·{' '}
                            {p.isActive ? 'Active' : 'Archived'}
                          </p>
                        </div>
                        <Link
                          href={`/dashboard/products/${p.id}?edit=true`}
                          className="app-icon-button"
                          aria-label={`Edit ${p.name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </div>
                      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <dt className="text-xs text-muted-foreground">
                            Selling price
                          </dt>
                          <dd className="mt-1 font-bold tabular-nums">
                            {formatCurrency(p.sellingPrice)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted-foreground">
                            Stock
                          </dt>
                          <dd className="mt-1">
                            <span
                              className={cn(
                                'rounded-full px-2 py-1 text-xs font-semibold',
                                stockBadge[status]
                              )}
                            >
                              {p.stock} {p.unit}
                            </span>
                          </dd>
                        </div>
                      </dl>
                      {p.isActive && (
                        <button
                          onClick={() => setArchiveTarget(p)}
                          className="mt-4 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-muted-foreground"
                        >
                          <Archive className="h-4 w-4" />
                          Archive
                        </button>
                      )}
                    </article>
                  );
                })}
              </div>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                        {terminology.singular}
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                        Buying
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                        Selling
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                        Profit %
                      </th>
                      <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                        Stock
                      </th>
                      <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                        Unit
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => {
                      const buying = parseFloat(p.buyingPrice);
                      const selling = parseFloat(p.sellingPrice);
                      const profit = selling - buying;
                      const grossMargin = getGrossMargin(selling, buying);
                      const status = stockStatus(p);

                      return (
                        <tr
                          key={p.id}
                          className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#fff8e8] text-[#8a6500]">
                                {p.imageUrl ? (
                                  <Image
                                    src={p.imageUrl}
                                    alt={`${p.name} preview`}
                                    width={48}
                                    height={48}
                                    unoptimized
                                    onClick={() =>
                                      setZoomedImage({
                                        src: p.imageUrl!,
                                        name: p.name,
                                      })
                                    }
                                    className="h-full w-full cursor-zoom-in object-cover"
                                  />
                                ) : (
                                  <Package className="h-4 w-4" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium truncate max-w-[200px]">
                                  {p.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {p.sku ? `SKU: ${p.sku}` : 'No SKU'}
                                </p>
                                {(buying <= 0 || !p.sku) && <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[10px] font-medium text-orange-700 dark:border-orange-900/70 dark:bg-orange-950/35 dark:text-orange-300"><AlertTriangle className="h-3 w-3" />Incomplete data</span>}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {formatCurrency(buying)}
                          </td>
                          <td className="px-4 py-3 text-right font-medium tabular-nums">
                            {formatCurrency(selling)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            <span
                              className={cn(
                                'text-xs',
                                profit >= 0
                                  ? 'text-[hsl(var(--success))]'
                                  : 'text-destructive'
                              )}
                            >
                              {grossMargin.valid ? `${grossMargin.percent.toFixed(1)}%` : 'Check cost price'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {status !== 'ok' && (
                                <AlertTriangle className="h-3.5 w-3.5 text-[hsl(var(--warning))]" />
                              )}
                              <span
                                className={cn(
                                  'rounded-full px-2.5 py-0.5 text-xs font-medium',
                                  stockBadge[status]
                                )}
                              >
                                {p.stock} {p.unit}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center text-xs text-muted-foreground">
                            {p.unit}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="inline-flex items-center overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#171717]">
                              <Link
                                href={`/dashboard/products/${p.id}`}
                                className="inline-flex h-8 w-8 items-center justify-center text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
                                aria-label={`View ${p.name}`}
                                title={`View ${terminology.singularLower}`}
                              >
                                <Eye className="h-4 w-4" aria-hidden="true" />
                              </Link>
                              <Link
                                href={`/dashboard/products/${p.id}?edit=true`}
                                className="inline-flex h-8 w-8 items-center justify-center border-l border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
                                aria-label={`Edit ${p.name}`}
                                title={`Edit ${terminology.singularLower}`}
                              >
                                <Pencil className="h-4 w-4" aria-hidden="true" />
                              </Link>
                              {p.isActive && (
                                <button
                                  onClick={() => setArchiveTarget(p)}
                                  disabled={archiving === p.id}
                                  className="inline-flex h-8 w-8 items-center justify-center border-l border-slate-200 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-500 disabled:opacity-40 dark:border-white/10 dark:text-slate-400 dark:hover:bg-red-950/35 dark:hover:text-red-400"
                                  aria-label={`Archive ${p.name}`}
                                  title={`Archive ${terminology.singularLower}`}
                                >
                                  <Archive className="h-4 w-4" aria-hidden="true" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </div>

        <p className="text-xs text-muted-foreground">
          Showing {filtered.length} of {products.length} {terminology.pluralLower}
        </p>
      </div>
      <WirelessScannerPairing
        open={showPhoneScanner}
        onClose={() => setShowPhoneScanner(false)}
        onBarcode={openScannedProduct}
      />
    </div>
  );
}
