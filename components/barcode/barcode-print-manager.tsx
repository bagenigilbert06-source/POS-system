'use client'

import Image from 'next/image'
import { useMemo, useState } from 'react'
import {
  Barcode,
  CheckCircle2,
  Eye,
  MapPin,
  Minus,
  PackageSearch,
  Plus,
  Printer,
  RotateCcw,
  Search,
  Store,
  Trash2,
} from 'lucide-react'
import { notify } from '@/lib/notify'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatCurrency } from '@/lib/utils'

type Location = { id: string; code: string; name: string; isMain: boolean }
type Product = {
  id: string
  name: string
  sku: string | null
  barcode: string | null
  price: number
  imageUrl: string | null
}
type PrintLine = Product & { quantity: number }

const CODE_128_PATTERNS = [
  '212222','222122','222221','121223','121322','131222','122213','122312','132212','221213','221312','231212','112232','122132','122231','113222','123122','123221','223211','221132','221231','213212','223112','312131','311222','321122','321221','312212','322112','322211','212123','212321','232121','111323','131123','131321','112313','132113','132311','211313','231113','231311','112133','112331','132131','113123','113321','133121','313121','211331','231131','213113','213311','213131','311123','311321','331121','312113','312311','332111','314111','221411','431111','111224','111422','121124','121421','141122','141221','112214','112412','122114','122411','142112','142211','241211','221114','413111','241112','134111','111242','121142','121241','114212','124112','124211','411212','421112','421211','212141','214121','412121','111143','111341','131141','114113','114311','411113','411311','113141','114131','311141','411131','211412','211214','211232','2331112',
]

const PAPER_OPTIONS = {
  a4_3x8: { label: 'A4 · 24 labels (3 × 8)', columns: 3, width: '210mm', height: '297mm' },
  a4_2x7: { label: 'A4 · 14 labels (2 × 7)', columns: 2, width: '210mm', height: '297mm' },
  thermal_50x30: { label: 'Thermal · 50 × 30 mm', columns: 1, width: '50mm', height: '30mm' },
  thermal_40x30: { label: 'Thermal · 40 × 30 mm', columns: 1, width: '40mm', height: '30mm' },
} as const

type PaperSize = keyof typeof PAPER_OPTIONS

function normalizedCode(product: Product) {
  const candidate = (product.barcode || product.sku || product.id).trim()
  const printable = Array.from(candidate).filter((character) => {
    const code = character.charCodeAt(0)
    return code >= 32 && code <= 126
  }).join('')
  return printable || product.id.slice(0, 16)
}

function code128Svg(value: string, height = 54) {
  const safeValue = Array.from(value).filter((character) => {
    const code = character.charCodeAt(0)
    return code >= 32 && code <= 126
  }).join('').slice(0, 80) || 'PESABY'
  const values = Array.from(safeValue, (character) => character.charCodeAt(0) - 32)
  let checksum = 104
  values.forEach((code, index) => { checksum += code * (index + 1) })
  const symbols = [104, ...values, checksum % 103, 106]
  const quiet = 10
  const modules = symbols.reduce((total, symbol) => total + CODE_128_PATTERNS[symbol].split('').reduce((sum, width) => sum + Number(width), 0), quiet * 2)
  let x = quiet
  const rects: string[] = []
  for (const symbol of symbols) {
    CODE_128_PATTERNS[symbol].split('').forEach((width, index) => {
      const barWidth = Number(width)
      if (index % 2 === 0) rects.push(`<rect x="${x}" y="0" width="${barWidth}" height="${height}" fill="#050505"/>`)
      x += barWidth
    })
  }
  return `<svg viewBox="0 0 ${modules} ${height}" role="img" aria-label="Barcode ${escapeHtml(safeValue)}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">${rects.join('')}</svg>`
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] || character)
}

export function BarcodePrintManager({ locations, products, storeName, currency }: { locations: Location[]; products: Product[]; storeName: string; currency: string }) {
  const defaultLocation = locations.find((location) => location.isMain)?.id || locations[0]?.id || ''
  const [warehouseId, setWarehouseId] = useState(defaultLocation)
  const [storeId, setStoreId] = useState(defaultLocation)
  const [query, setQuery] = useState('')
  const [lines, setLines] = useState<PrintLine[]>([])
  const [paperSize, setPaperSize] = useState<PaperSize>('a4_3x8')
  const [showStoreName, setShowStoreName] = useState(true)
  const [showProductName, setShowProductName] = useState(true)
  const [showPrice, setShowPrice] = useState(true)
  const [previewOpen, setPreviewOpen] = useState(false)

  const selectedStore = locations.find((location) => location.id === storeId)
  const searchResults = useMemo(() => {
    const value = query.trim().toLocaleLowerCase()
    if (!value) return []
    return products.filter((item) => [item.name, item.sku, item.barcode].some((field) => field?.toLocaleLowerCase().includes(value))).slice(0, 7)
  }, [products, query])
  const labels = useMemo(() => lines.flatMap((line) => Array.from({ length: line.quantity }, () => line)).slice(0, 200), [lines])
  const totalLabels = lines.reduce((total, line) => total + line.quantity, 0)

  const addProduct = (item: Product) => {
    setLines((current) => {
      const existing = current.find((line) => line.id === item.id)
      return existing
        ? current.map((line) => line.id === item.id ? { ...line, quantity: Math.min(99, line.quantity + 1) } : line)
        : [...current, { ...item, quantity: 1 }]
    })
    setQuery('')
  }
  const updateQuantity = (id: string, amount: number) => setLines((current) => current.map((line) => line.id === id ? { ...line, quantity: Math.max(1, Math.min(99, line.quantity + amount)) } : line))
  const reset = () => {
    setLines([])
    setQuery('')
    setPaperSize('a4_3x8')
    setShowStoreName(true)
    setShowProductName(true)
    setShowPrice(true)
  }
  const ensureLabels = () => {
    if (!lines.length) {
      notify.error('Select at least one product to generate labels.')
      return false
    }
    if (!warehouseId || !storeId) {
      notify.error('Select a warehouse and store first.')
      return false
    }
    if (totalLabels > 200) {
      notify.error('A print job can contain at most 200 labels.')
      return false
    }
    return true
  }
  const generate = () => {
    if (ensureLabels()) setPreviewOpen(true)
  }
  const printLabels = () => {
    if (!ensureLabels()) return
    const paper = PAPER_OPTIONS[paperSize]
    const thermal = paperSize.startsWith('thermal_')
    const printableStore = selectedStore?.name || storeName
    const labelMarkup = labels.map((item) => {
      const code = normalizedCode(item)
      return `<article class="label">${showStoreName ? `<p class="store">${escapeHtml(printableStore)}</p>` : ''}${showProductName ? `<p class="product">${escapeHtml(item.name)}</p>` : ''}<div class="barcode">${code128Svg(code, 52)}</div><p class="code">${escapeHtml(code)}</p>${showPrice ? `<p class="price">${escapeHtml(formatCurrency(item.price, currency))}</p>` : ''}</article>`
    }).join('')
    const popup = window.open('', '_blank', 'width=980,height=760')
    if (!popup) {
      notify.error('Allow pop-ups to open the printer window.')
      return
    }
    popup.document.write(`<!doctype html><html><head><title>Pesaby barcode labels</title><style>@page{size:${paper.width} ${paper.height};margin:${thermal ? '2mm' : '6mm'}}*{box-sizing:border-box}body{margin:0;background:#fff;color:#111;font-family:Arial,sans-serif}.sheet{display:${thermal ? 'block' : 'grid'};grid-template-columns:repeat(${paper.columns},minmax(0,1fr));gap:3mm}.label{min-width:0;break-inside:avoid;border:${thermal ? '0' : '1px solid #ddd'};border-radius:2mm;padding:${thermal ? '1mm' : '2.5mm'};text-align:center;display:flex;flex-direction:column;justify-content:center;overflow:hidden;${thermal ? 'height:26mm;page-break-after:always' : ''}}.store{margin:0 0 1mm;font-size:8pt;font-weight:700;text-transform:uppercase;letter-spacing:.04em}.product{margin:0 0 1.2mm;font-size:9pt;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.barcode{height:${thermal ? '10mm' : '15mm'}}.barcode svg{display:block;width:100%;height:100%}.code{margin:1mm 0 0;font:7.5pt monospace;letter-spacing:.08em}.price{margin:.7mm 0 0;font-size:9pt;font-weight:700}@media print{.label{border-color:#bbb}}</style></head><body><main class="sheet">${labelMarkup}</main><script>window.addEventListener('load',()=>{window.print()});window.addEventListener('afterprint',()=>{window.close()});<\/script></body></html>`)
    popup.document.close()
    popup.opener = null
    notify.success(`${totalLabels} barcode label${totalLabels === 1 ? '' : 's'} sent to the print dialog.`)
  }

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] shadow-[0_2px_10px_rgba(16,24,40,.05)]">
        <div className="grid gap-4 border-b border-[var(--dashboard-border)] p-5 lg:grid-cols-2">
          <SelectField icon={MapPin} label="Warehouse" required value={warehouseId} onChange={setWarehouseId} locations={locations} placeholder="Select warehouse" />
          <SelectField icon={Store} label="Store" required value={storeId} onChange={setStoreId} locations={locations} placeholder="Select store" />
          <div className="relative lg:col-span-2 lg:max-w-[760px]">
            <label htmlFor="barcode-product-search" className="mb-2 block text-sm font-semibold text-[var(--dashboard-text)]">Product <span className="text-red-500">*</span></label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--dashboard-muted)]" />
              <input id="barcode-product-search" value={query} onChange={(event) => setQuery(event.target.value)} autoComplete="off" placeholder="Search product by name, SKU or barcode" className="h-11 w-full rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] pl-10 pr-4 text-sm text-[var(--dashboard-text)] outline-none transition focus:border-[var(--dashboard-accent)] focus:ring-2 focus:ring-[var(--dashboard-accent-soft)]" />
            </div>
            {query.trim() && (
              <div className="absolute z-20 mt-2 max-h-72 w-full overflow-auto rounded-xl border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] p-1.5 shadow-xl">
                {searchResults.length ? searchResults.map((item) => (
                  <button key={item.id} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => addProduct(item)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-[var(--dashboard-surface-subtle)]">
                    <ProductThumb product={item} />
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{item.name}</span><span className="block truncate text-xs text-[var(--dashboard-muted)]">{item.sku || 'No SKU'} · {item.barcode || 'Uses SKU as barcode'}</span></span>
                    <span className="text-xs font-semibold text-[var(--dashboard-accent)]">Add</span>
                  </button>
                )) : <p className="px-3 py-5 text-center text-sm text-[var(--dashboard-muted)]">No matching product found.</p>}
              </div>
            )}
          </div>
        </div>

        <div className="p-5">
          <div className="overflow-hidden rounded-xl border border-[var(--dashboard-border)]">
            <div className="hidden grid-cols-[minmax(280px,2fr)_minmax(140px,.7fr)_minmax(170px,.8fr)_170px_52px] gap-3 bg-[var(--dashboard-surface-subtle)] px-5 py-3 text-xs font-bold uppercase tracking-[.08em] text-[var(--dashboard-muted)] md:grid">
              <span>Product</span><span>SKU</span><span>Code</span><span>Qty</span><span className="sr-only">Remove</span>
            </div>
            {lines.length ? <div className="divide-y divide-[var(--dashboard-border)]">{lines.map((item) => (
              <div key={item.id} className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(280px,2fr)_minmax(140px,.7fr)_minmax(170px,.8fr)_170px_52px] md:items-center md:px-5">
                <div className="flex min-w-0 items-center gap-3"><ProductThumb product={item} /><div className="min-w-0"><p className="truncate text-sm font-semibold">{item.name}</p><p className="text-xs text-[var(--dashboard-muted)]">{formatCurrency(item.price, currency)}</p></div></div>
                <DataCell label="SKU" value={item.sku || '—'} mono />
                <DataCell label="Code" value={normalizedCode(item)} mono />
                <div className="flex items-center justify-between md:justify-start"><span className="text-xs font-semibold text-[var(--dashboard-muted)] md:hidden">Qty</span><QuantityControl quantity={item.quantity} decrease={() => updateQuantity(item.id, -1)} increase={() => updateQuantity(item.id, 1)} /></div>
                <button type="button" onClick={() => setLines((current) => current.filter((line) => line.id !== item.id))} aria-label={`Remove ${item.name}`} title="Remove product" className="inline-flex h-9 w-9 items-center justify-center justify-self-end rounded-lg border border-[var(--dashboard-border)] text-[var(--dashboard-muted)] transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:hover:border-red-900 dark:hover:bg-red-950/30"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}</div> : (
              <div className="flex min-h-44 flex-col items-center justify-center px-5 py-10 text-center"><span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--dashboard-accent-soft)] text-[var(--dashboard-accent)]"><PackageSearch className="h-6 w-6" /></span><p className="text-sm font-semibold">No products selected</p><p className="mt-1 max-w-sm text-xs text-[var(--dashboard-muted)]">Search the catalogue above to build your barcode print job.</p></div>
            )}
          </div>
        </div>

        <div className="grid gap-5 border-t border-[var(--dashboard-border)] p-5 lg:grid-cols-[minmax(300px,1.2fr)_2fr] lg:items-end">
          <div><label htmlFor="barcode-paper-size" className="mb-2 block text-sm font-semibold">Paper size <span className="text-red-500">*</span></label><select id="barcode-paper-size" value={paperSize} onChange={(event) => setPaperSize(event.target.value as PaperSize)} className="h-11 w-full rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] px-3 text-sm outline-none focus:border-[var(--dashboard-accent)] focus:ring-2 focus:ring-[var(--dashboard-accent-soft)]">{Object.entries(PAPER_OPTIONS).map(([value, option]) => <option key={value} value={value}>{option.label}</option>)}</select></div>
          <div className="grid gap-3 sm:grid-cols-3"><OptionSwitch label="Show store name" checked={showStoreName} onChange={setShowStoreName} /><OptionSwitch label="Show product name" checked={showProductName} onChange={setShowProductName} /><OptionSwitch label="Show price" checked={showPrice} onChange={setShowPrice} /></div>
        </div>

        <div className="flex flex-col gap-3 border-t border-[var(--dashboard-border)] bg-[var(--dashboard-surface-subtle)] px-5 py-4 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-2 text-xs text-[var(--dashboard-muted)]"><CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" /><span>System print dialog ready</span><span aria-hidden="true">·</span><strong className="text-[var(--dashboard-text)]">{totalLabels} label{totalLabels === 1 ? '' : 's'}</strong></div>
          <div className="flex flex-wrap justify-end gap-2"><ActionButton icon={Eye} label="Generate barcode" onClick={generate} tone="gold" /><ActionButton icon={RotateCcw} label="Reset barcode" onClick={reset} tone="dark" /><ActionButton icon={Printer} label="Print barcode" onClick={printLabels} tone="red" /></div>
        </div>
      </section>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-h-[88vh] max-w-5xl overflow-hidden p-0">
          <DialogHeader className="border-b px-6 py-5"><DialogTitle>Barcode preview</DialogTitle><DialogDescription>{totalLabels} label{totalLabels === 1 ? '' : 's'} · {PAPER_OPTIONS[paperSize].label}</DialogDescription></DialogHeader>
          <div className={`grid max-h-[62vh] gap-3 overflow-auto bg-[#eef1f4] p-5 dark:bg-[#090909] ${paperSize.startsWith('a4_3') ? 'sm:grid-cols-3' : paperSize.startsWith('a4_2') ? 'sm:grid-cols-2' : 'mx-auto max-w-md grid-cols-1'}`}>
            {labels.slice(0, 48).map((item, index) => <BarcodeLabel key={`${item.id}-${index}`} product={item} storeName={selectedStore?.name || storeName} currency={currency} showStoreName={showStoreName} showProductName={showProductName} showPrice={showPrice} />)}
          </div>
          <div className="flex items-center justify-between gap-3 border-t px-6 py-4"><p className="text-xs text-[var(--dashboard-muted)]">Select your connected label or office printer in the next dialog.</p><ActionButton icon={Printer} label="Print barcode" onClick={printLabels} tone="red" /></div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function ProductThumb({ product }: { product: Product }) {
  return product.imageUrl ? <Image src={product.imageUrl} alt="" width={40} height={40} unoptimized={product.imageUrl.startsWith('http')} className="h-10 w-10 shrink-0 rounded-lg border border-[var(--dashboard-border)] object-cover" /> : <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--dashboard-surface-subtle)] text-[var(--dashboard-muted)]"><Barcode className="h-5 w-5" /></span>
}

function SelectField({ icon: Icon, label, value, onChange, locations, placeholder, required }: { icon: typeof Store; label: string; value: string; onChange: (value: string) => void; locations: Location[]; placeholder: string; required?: boolean }) {
  return <label className="grid gap-2 text-sm font-semibold"><span className="inline-flex items-center gap-2"><Icon className="h-4 w-4 text-[var(--dashboard-accent)]" />{label}{required && <span className="text-red-500">*</span>}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="h-11 rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] px-3 text-sm font-normal outline-none focus:border-[var(--dashboard-accent)] focus:ring-2 focus:ring-[var(--dashboard-accent-soft)]"><option value="">{placeholder}</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.name} · {location.code}</option>)}</select></label>
}

function DataCell({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return <div className="flex min-w-0 items-center justify-between gap-3 md:block"><span className="text-xs font-semibold text-[var(--dashboard-muted)] md:hidden">{label}</span><span className={`truncate text-sm ${mono ? 'font-mono text-xs' : ''}`}>{value}</span></div>
}

function QuantityControl({ quantity, decrease, increase }: { quantity: number; decrease: () => void; increase: () => void }) {
  return <div className="inline-flex h-10 items-center rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)]"><button type="button" onClick={decrease} disabled={quantity <= 1} aria-label="Decrease quantity" className="inline-flex h-full w-10 items-center justify-center text-[var(--dashboard-muted)] hover:text-[var(--dashboard-text)] disabled:opacity-30"><Minus className="h-4 w-4" /></button><span className="min-w-10 border-x border-[var(--dashboard-border)] text-center text-sm font-bold tabular-nums">{quantity}</span><button type="button" onClick={increase} disabled={quantity >= 99} aria-label="Increase quantity" className="inline-flex h-full w-10 items-center justify-center text-[var(--dashboard-muted)] hover:text-[var(--dashboard-text)] disabled:opacity-30"><Plus className="h-4 w-4" /></button></div>
}

function OptionSwitch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] px-3.5 py-2 text-left text-sm font-semibold"><span>{label}</span><span className={`relative h-5 w-9 shrink-0 rounded-full transition ${checked ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}><span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition ${checked ? 'left-[18px]' : 'left-0.5'}`} /></span></button>
}

function ActionButton({ icon: Icon, label, onClick, tone }: { icon: typeof Eye; label: string; onClick: () => void; tone: 'gold' | 'dark' | 'red' }) {
  const tones = { gold: 'bg-[#f3b600] text-[#16130a] hover:bg-[#dca500]', dark: 'bg-[#0b2e4f] text-white hover:bg-[#08233d]', red: 'bg-[#e2202d] text-white hover:bg-[#c91824]' }
  return <button type="button" onClick={onClick} className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold shadow-sm transition ${tones[tone]}`}><Icon className="h-4 w-4" />{label}</button>
}

function BarcodeLabel({ product, storeName, currency, showStoreName, showProductName, showPrice }: { product: Product; storeName: string; currency: string; showStoreName: boolean; showProductName: boolean; showPrice: boolean }) {
  const code = normalizedCode(product)
  return <article className="flex min-h-32 flex-col justify-center overflow-hidden rounded-lg border border-slate-300 bg-white p-3 text-center text-slate-950 shadow-sm">{showStoreName && <p className="truncate text-[9px] font-bold uppercase tracking-[.08em]">{storeName}</p>}{showProductName && <p className="mt-1 truncate text-xs font-bold">{product.name}</p>}<div className="mt-2 h-12 w-full" dangerouslySetInnerHTML={{ __html: code128Svg(code, 52) }} /><p className="mt-1 truncate font-mono text-[9px] tracking-[.08em]">{code}</p>{showPrice && <p className="mt-1 text-xs font-bold">{formatCurrency(product.price, currency)}</p>}</article>
}
