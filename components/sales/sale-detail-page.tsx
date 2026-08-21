'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check, ChevronDown, Clipboard, Copy, Download, Printer, Receipt as ReceiptIcon, RotateCcw, WalletCards } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { voidSale, type getSaleWithItems } from '@/app/actions/sales'
import type { getBusinessSettings } from '@/app/actions/business'
import { ReceiptTemplate } from '@/components/receipt/receipt-template'
import { RefundDialog } from '@/components/pos/refund-dialog'
import type { SaleItem } from '@/lib/db/schema'
import { CashierPosMark, GoogleCalendarMark, GoogleContactsMark, GoogleMapsMark } from '@/components/ui/contact-marks'

type Detail = NonNullable<Awaited<ReturnType<typeof getSaleWithItems>>>
type Settings = Awaited<ReturnType<typeof getBusinessSettings>>

export function SaleDetailPage({ detail, settings }: { detail: Detail; settings: Settings }) {
  const router = useRouter()
  const [copied, setCopied] = useState(false)
  const [refundOpen, setRefundOpen] = useState(false)
  const [refundConfirmOpen, setRefundConfirmOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(true)
  const [voidOpen, setVoidOpen] = useState(false)
  const [voidReason, setVoidReason] = useState('')
  const [voiding, setVoiding] = useState(false)
  const refunded = detail.returns.reduce((sum, item) => sum + Number(item.amount), 0)
  const netTotal = Number(detail.record.total) - refunded

  const copyReceipt = async () => {
    await navigator.clipboard.writeText(detail.record.receiptNo)
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }
  const downloadReceipt = () => {
    const lines = [`Receipt: ${detail.record.receiptNo}`, `Date: ${formatDateTime(detail.record.createdAt)}`, `Customer: ${detail.customerName ?? 'Walk-in'}`, '', ...detail.items.map((item) => `${item.productName} x${item.quantity} ${formatCurrency(item.totalPrice)}`), '', `Total: ${formatCurrency(detail.record.total)}`]
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' }))
    link.download = `${detail.record.receiptNo}.txt`
    link.click()
    URL.revokeObjectURL(link.href)
  }
  const confirmVoid = async () => {
    setVoiding(true)
    try {
      await voidSale({ saleId: detail.record.id, reason: voidReason })
      toast.success('Sale voided and inventory restored')
      router.push('/dashboard/sales')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not void sale')
    } finally {
      setVoiding(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1180px] space-y-5 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/dashboard/sales" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"><ArrowLeft className="h-4 w-4" />Back to sales</Link>
        <div className="flex flex-wrap gap-2">
          <Action onClick={copyReceipt} icon={Clipboard}>{copied ? 'Copied' : 'Copy receipt'}</Action>
          <Action onClick={() => window.print()} icon={Printer}>Print</Action>
          <Action onClick={downloadReceipt} icon={Download}>Download</Action>
        </div>
      </div>

      <header className="overflow-hidden rounded-xl border border-[#eadca9] bg-gradient-to-r from-[#fffefa] via-[#fffdf4] to-[#fff5c9] shadow-sm dark:border-[#ffd60a]/15 dark:from-[#14130f] dark:via-[#19170f] dark:to-[#211c0c]">
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-center gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#fff7d6] text-[#8a6500] ring-1 ring-[#ead48d]/70 dark:bg-[#ffd60a]/10 dark:text-[#ffd60a] dark:ring-[#ffd60a]/15"><ReceiptIcon className="h-5 w-5" /></span>
            <div><p className="text-[11px] font-semibold uppercase tracking-[.12em] text-muted-foreground">Transaction receipt</p><h1 className="mt-1 font-mono text-xl font-bold tracking-[-0.025em] text-foreground sm:text-2xl">{detail.record.receiptNo}</h1><p className="mt-1 text-xs text-muted-foreground">Created {formatDateTime(detail.record.createdAt)}</p></div>
          </div>
          <div className="flex items-center justify-between gap-4 sm:min-w-[280px] sm:justify-end"><Status status={detail.record.status} /><span className="h-9 w-px bg-[#ddca82]/70 dark:bg-white/10" aria-hidden="true" /><div className="text-right"><p className="text-[10px] font-medium uppercase tracking-[.08em] text-muted-foreground">Total paid</p><p className="mt-0.5 text-xl font-bold tracking-[-0.02em] tabular-nums text-foreground">{formatCurrency(netTotal)}</p></div></div>
        </div>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(320px,.75fr)]">
        <div className="space-y-5">
          <section className="overflow-hidden rounded-xl border bg-card shadow-sm dark:border-white/10">
            <div className="border-b px-5 py-4"><h2 className="text-base font-semibold">Items purchased</h2><p className="mt-0.5 text-xs text-muted-foreground">{detail.items.length} {detail.items.length === 1 ? 'line item' : 'line items'} in this transaction</p></div>
            <div className="divide-y">
              {detail.items.map((item) => <LineItem key={item.id} item={item} canViewCost={detail.canViewCost} />)}
            </div>
          </section>

          <section className="rounded-xl border bg-card p-5 shadow-sm dark:border-white/10">
            <div className="flex items-center justify-between gap-3"><h2 className="text-base font-semibold">Payment</h2><span className="text-xs text-muted-foreground">{detail.payments.length || 1} {(detail.payments.length || 1) === 1 ? 'payment' : 'payments'}</span></div>
            <div className="mt-4 space-y-2">
              {detail.payments.length ? detail.payments.map((payment) => <PaymentRow key={payment.id} method={payment.method} amount={payment.amount} reference={payment.reference} status={payment.status} createdAt={payment.createdAt} />) : <PaymentRow method={detail.record.paymentMethod} amount={detail.record.total} reference={detail.record.mpesaRef} status={detail.record.status} createdAt={detail.record.createdAt} />}
            </div>
            {detail.record.paymentMethod === 'cash' && detail.record.amountReceived && <div className="mt-3 grid grid-cols-2 gap-3 border-t pt-3 text-sm"><div><p className="text-xs text-muted-foreground">Cash received</p><p className="mt-0.5 font-semibold tabular-nums">{formatCurrency(detail.record.amountReceived)}</p></div><div><p className="text-xs text-muted-foreground">Change given</p><p className="mt-0.5 font-semibold tabular-nums">{formatCurrency(detail.record.change ?? 0)}</p></div></div>}
            {detail.returns.length > 0 && <div className="mt-4 border-t pt-4"><p className="text-sm font-semibold">Refund history</p>{detail.returns.map((item) => <p key={item.id} className="mt-2 text-sm text-muted-foreground">{formatCurrency(item.amount)} · {item.refundMethod} · {item.reason} · {formatDateTime(item.createdAt)}</p>)}</div>}
          </section>

          {previewOpen && <section className="rounded-xl border bg-card p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">Receipt preview</h2><button onClick={() => setPreviewOpen(false)} className="text-sm font-medium text-muted-foreground hover:text-foreground">Close</button></div><Receipt detail={detail} settings={settings} /></section>}
          <div className="receipt-preview-origin hidden print:block"><Receipt detail={detail} settings={settings} /></div>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-5">
          <section className="rounded-xl border bg-card p-5 shadow-sm dark:border-white/10">
            <h2 className="text-base font-semibold">Sale summary</h2>
            <div className="mt-4 space-y-2.5 text-sm"><Amount label="Subtotal" value={detail.record.subtotal} /><Amount label="Discount" value={detail.record.discountAmount} negative /><Amount label="VAT / Tax" value={detail.record.taxAmount} /><Amount label="Rounding" value={detail.record.roundingAmount} /><Amount label="Refunded" value={refunded} negative /><div className="flex justify-between border-t pt-3 text-base font-bold"><span>Net total</span><span className="tabular-nums">{formatCurrency(netTotal)}</span></div></div>
          </section>

          <section className="font-sans rounded-xl border bg-card p-5 shadow-sm dark:border-white/10">
            <h2 className="text-base font-semibold tracking-[-0.01em]">Transaction information</h2>
            <div className="mt-4 space-y-3.5"><Meta icon={<GoogleContactsMark className="h-5 w-5" />} label="Customer" value={detail.customerName ?? 'Walk-in'} href={detail.record.customerId ? `/dashboard/customers/${detail.record.customerId}?mode=view` : undefined} /><Meta icon={<CashierPosMark className="h-5 w-5" />} label="Cashier" value={detail.cashierName ?? '—'} /><Meta icon={<GoogleMapsMark className="h-5 w-5" />} label="Location" value={detail.branchName ?? '—'} /><Meta icon={<GoogleCalendarMark className="h-5 w-5" />} label="Created" value={formatDateTime(detail.record.createdAt)} /></div>
            <div className="mt-5 border-t pt-4"><p className="mb-3 text-[10px] font-semibold uppercase tracking-[.12em] text-muted-foreground">Technical metadata</p><div className="space-y-3 rounded-lg bg-secondary/40 p-3"><CopyValue label="Transaction ID" value={detail.record.id} />{detail.session?.sessionNo && <CopyValue label="POS session" value={detail.session.sessionNo} />}</div></div>
          </section>

          <section className="rounded-xl border bg-card p-5 shadow-sm dark:border-white/10"><div className="grid gap-2"><button onClick={() => setPreviewOpen(true)} className="rounded-lg border px-3 py-2.5 text-sm font-semibold transition-all hover:-translate-y-0.5 hover:bg-secondary hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">Preview receipt</button>{detail.customerEmail && <a href={`mailto:${detail.customerEmail}?subject=Receipt ${detail.record.receiptNo}`} className="rounded-lg border px-3 py-2.5 text-center text-sm font-semibold transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">Email receipt</a>}{['completed', 'partially_refunded'].includes(detail.record.status) && <button onClick={() => setRefundConfirmOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"><RotateCcw className="h-4 w-4" />Refund / return</button>}{['completed', 'pending'].includes(detail.record.status) && <button onClick={() => setVoidOpen(true)} className="rounded-lg border border-red-300 px-3 py-2.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 dark:hover:bg-red-400/10">Void sale</button>}</div></section>
        </aside>
      </div>

      {voidOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"><div className="w-full max-w-md rounded-xl border bg-background p-6 shadow-2xl"><h2 className="text-lg font-semibold">Void this sale?</h2><p className="mt-1 text-sm text-muted-foreground">Inventory will be restored and the transaction will remain in the audit history.</p><textarea value={voidReason} onChange={(event) => setVoidReason(event.target.value)} placeholder="Reason for void (at least 3 characters)" className="mt-4 min-h-24 w-full rounded-lg border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-primary/20" /><div className="mt-4 flex justify-end gap-2"><button onClick={() => setVoidOpen(false)} className="rounded-lg border px-4 py-2 text-sm font-semibold">Cancel</button><button disabled={voiding || voidReason.trim().length < 3} onClick={confirmVoid} className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{voiding ? 'Voiding…' : 'Confirm void'}</button></div></div></div>}
      {refundConfirmOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"><div role="alertdialog" aria-modal="true" aria-labelledby="refund-confirm-title" className="w-full max-w-md rounded-xl border bg-background p-6 shadow-2xl"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-700 dark:bg-red-400/10 dark:text-red-300"><RotateCcw className="h-4 w-4" /></span><h2 id="refund-confirm-title" className="mt-4 text-lg font-semibold">Start a refund or return?</h2><p className="mt-1 text-sm text-muted-foreground">This opens the refund workflow for {detail.record.receiptNo}. You will still choose the items, method, and reason before any refund is processed.</p><div className="mt-5 flex justify-end gap-2"><button onClick={() => setRefundConfirmOpen(false)} className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-secondary">Cancel</button><button onClick={() => { setRefundConfirmOpen(false); setRefundOpen(true) }} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Continue</button></div></div></div>}
      {refundOpen && <RefundDialog sale={{ ...detail.record, items: detail.items as SaleItem[] }} onClose={() => setRefundOpen(false)} onSuccess={() => { setRefundOpen(false); router.refresh() }} />}
    </div>
  )
}

function titleCase(value: string) {
  return value.toLocaleLowerCase().replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase())
}

function LineItem({ item, canViewCost }: { item: Detail['items'][number]; canViewCost: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const unitCost = 'unitCostAtSale' in item ? item.unitCostAtSale : undefined
  return <div className="px-5 py-4"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="font-medium">{titleCase(item.productName)}</p><p className="mt-1 text-xs text-muted-foreground">{item.quantity} × {formatCurrency(item.unitPrice)} · {titleCase(item.categoryName ?? 'Uncategorized')}</p></div><p className="shrink-0 font-semibold tabular-nums">{formatCurrency(item.totalPrice)}</p></div>{(item.sku || (canViewCost && unitCost !== undefined)) && <div className="mt-2"><button type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded} className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">Details <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? 'rotate-180' : ''}`} /></button>{expanded && <div className="mt-2 space-y-1 rounded-lg bg-secondary/40 px-3 py-2 text-[11px] text-muted-foreground">{item.sku && <p className="break-all"><span className="font-medium">SKU:</span> {item.sku}</p>}{canViewCost && unitCost !== undefined && <p><span className="font-medium">Unit cost:</span> {formatCurrency(unitCost)}</p>}</div>}</div>}</div>
}

function PaymentRow({ method, amount, reference, status, createdAt }: { method: string; amount: string | number; reference?: string | null; status: string; createdAt: Date | string }) {
  const completed = status === 'completed'
  return <div className="flex flex-col gap-3 rounded-lg bg-secondary/50 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-center gap-3"><PaymentLogo method={method} /><div className="min-w-0"><p className="truncate text-sm font-semibold capitalize">{method.replaceAll('_', ' ')}</p><p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground"><span className="h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/50" /><span>{status.replaceAll('_', ' ')}</span><span>· {formatDateTime(createdAt)}</span></p>{reference && <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground" title={reference}>Ref: {reference}</p>}</div></div><div className="pl-12 sm:pl-0 sm:text-right"><p className={`text-[10px] font-semibold uppercase tracking-wide ${completed ? 'text-emerald-700 dark:text-emerald-300' : 'text-muted-foreground'}`}>{completed ? 'Paid' : 'Amount'}</p><p className="text-base font-bold tabular-nums text-foreground">{formatCurrency(amount)}</p></div></div>
}

function PaymentLogo({ method }: { method: string }) {
  const logos: Record<string, { src: string; alt: string; className: string }> = {
    cash: { src: '/payment-logos/cash-kes.svg', alt: 'Cash', className: 'h-7 w-11' },
    mpesa: { src: '/payment-logos/mpesa.svg', alt: 'M-Pesa', className: 'h-6 w-11' },
    card: { src: '/payment-logos/visa.svg', alt: 'Card', className: 'h-5 w-10' },
  }
  const logo = logos[method]
  return <span className="flex h-10 w-14 shrink-0 items-center justify-center rounded-lg border bg-white p-1.5 shadow-sm dark:border-white/10">{logo ? <Image src={logo.src} alt={logo.alt} width={48} height={28} className={`${logo.className} object-contain`} /> : <WalletCards className="h-5 w-5 text-muted-foreground" />}</span>
}

function CopyValue({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1200) }
  return <div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="text-[10px] text-muted-foreground">{label}</p><p className="truncate font-mono text-[11px] text-muted-foreground" title={value}>{value}</p></div><button type="button" onClick={copy} aria-label={`Copy ${label}`} className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">{copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}</button></div>
}

function Status({ status }: { status: string }) { const green = status === 'completed'; return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${green ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-300' : 'bg-secondary text-secondary-foreground'}`}>{status.replaceAll('_', ' ')}</span> }
function Action({ icon: Icon, children, onClick }: { icon: typeof Clipboard; children: React.ReactNode; onClick: () => void }) { return <button onClick={onClick} className="inline-flex h-9 items-center gap-2 rounded-lg border bg-card px-3 text-sm font-semibold shadow-sm hover:bg-secondary"><Icon className="h-3.5 w-3.5" />{children}</button> }
function Amount({ label, value, negative }: { label: string; value: string | number; negative?: boolean }) { const amount = Number(value); if (!amount) return null; return <div className={`flex justify-between ${negative ? 'text-red-600' : 'text-muted-foreground'}`}><span>{label}</span><span className="font-medium tabular-nums text-foreground">{negative ? '-' : ''}{formatCurrency(amount)}</span></div> }
function Meta({ icon, label, value, href }: { icon: React.ReactNode; label: string; value: string; href?: string }) { const content = <span className="block truncate text-sm font-medium leading-5 text-foreground">{value}</span>; return <div className="flex min-w-0 items-center gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary/70 text-muted-foreground dark:bg-white/[0.06]">{icon}</span><div className="min-w-0"><p className="text-[11px] font-medium leading-4 text-muted-foreground">{label}</p>{href ? <Link href={href} className="block max-w-full text-blue-700 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:text-blue-300">{content}</Link> : content}</div></div> }
function Receipt({ detail, settings }: { detail: Detail; settings: Settings }) { return <ReceiptTemplate sale={{ ...detail.record, items: detail.items as SaleItem[] }} businessName={settings.receiptBusinessName} businessPhone={settings.receiptPhone} businessAddress={settings.receiptAddress} receiptFooter={settings.receiptFooter} cashierName={detail.cashierName ?? 'Cashier'} customerName={detail.customerName ?? 'Walk-in'} taxName={settings.taxName} layout={settings.receiptLayout} template={settings.receiptTemplate} logoUrl={settings.receiptLogoUrl} showPhone={settings.receiptShowPhone} showAddress={settings.receiptShowAddress} showCashier={settings.receiptShowCashier} showCustomer={settings.receiptShowCustomer} showPayment={settings.receiptShowPayment} showQrCode={settings.receiptShowQrCode} showItemSku={settings.receiptShowItemSku} /> }
