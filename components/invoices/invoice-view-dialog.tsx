'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Download, Printer } from 'lucide-react'
import { getInvoiceWithItems } from '@/app/actions/invoice-actions'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { LoadingSpinner } from '@/components/ui/page-loader'
import type { Invoice } from '@/lib/db/schema'
import { notify } from '@/lib/notify'

type Detail = Awaited<ReturnType<typeof getInvoiceWithItems>>
type Snapshot = Record<string, string | null | undefined>
const snapshot = (value: unknown): Snapshot => value && typeof value === 'object' && !Array.isArray(value) ? value as Snapshot : {}
const amount = (value: string | number) => `KES ${Number(value).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const date = (value: Date | string | null | undefined) => value ? new Intl.DateTimeFormat('en-KE', { dateStyle: 'medium' }).format(new Date(value)) : '—'

export function InvoiceViewDialog({ invoice, open, onOpenChange }: { invoice: Invoice; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [detail, setDetail] = useState<Detail | null>(null)
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [qrUrl, setQrUrl] = useState('')
  const documentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    getInvoiceWithItems(invoice.id).then(setDetail).catch((error) => notify.error(error instanceof Error ? error.message : 'Could not load invoice')).finally(() => setLoading(false))
  }, [invoice.id, open])

  useEffect(() => {
    const qrData = detail?.fiscal?.qrData || (detail?.fiscal?.verificationData ? JSON.stringify(detail.fiscal.verificationData) : '')
    if (!qrData) return setQrUrl('')
    import('qrcode').then((QRCode) => QRCode.toDataURL(qrData, { width: 180, margin: 1 })).then(setQrUrl).catch(() => setQrUrl(''))
  }, [detail?.fiscal])

  const printInvoice = () => {
    if (!documentRef.current) return
    const frame = document.createElement('iframe')
    frame.style.position = 'fixed'; frame.style.width = '0'; frame.style.height = '0'; frame.style.border = '0'
    document.body.appendChild(frame)
    const target = frame.contentDocument
    if (!target) return frame.remove()
    const styles = Array.from(document.querySelectorAll('style,link[rel="stylesheet"]')).map((node) => node.outerHTML).join('')
    target.open()
    target.write(`<html><head><title>${invoice.invoiceNo}</title>${styles}<style>@page{size:A4;margin:12mm}body{margin:0;background:#fff}.invoice-document{max-width:none!important;width:100%!important;margin:0!important;box-shadow:none!important;padding:0!important}tr{break-inside:avoid}</style></head><body>${documentRef.current.outerHTML}</body></html>`)
    target.close()
    frame.onload = () => { frame.contentWindow?.focus(); frame.contentWindow?.print(); window.setTimeout(() => frame.remove(), 1000) }
  }

  const downloadPdf = async () => {
    if (!documentRef.current) return
    setDownloading(true)
    try {
      const { jsPDF } = await import('jspdf')
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
      await pdf.html(documentRef.current, { margin: [12, 12, 12, 12], autoPaging: 'text', width: 186, windowWidth: 900, html2canvas: { scale: 0.75, useCORS: true, backgroundColor: '#ffffff' } })
      pdf.save(`${invoice.invoiceNo}.pdf`)
    } catch { notify.error('Could not generate the invoice PDF') } finally { setDownloading(false) }
  }

  const record = detail?.invoice ?? invoice
  const business = snapshot(record.businessSnapshot)
  const customer = snapshot(record.customerSnapshot)

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[95vh] max-w-5xl overflow-y-auto bg-muted/30 p-0">
      <DialogHeader className="sticky top-0 z-10 flex-row items-center justify-between border-b bg-background px-5 py-4">
        <DialogTitle>Invoice {invoice.invoiceNo}</DialogTitle>
        <div className="flex gap-2 pr-8"><Button variant="outline" size="sm" onClick={printInvoice} disabled={!detail}><Printer className="mr-2 h-4 w-4" />Print</Button><Button size="sm" onClick={downloadPdf} disabled={!detail || downloading}>{downloading ? <LoadingSpinner className="mr-2 h-4 w-4" /> : <Download className="mr-2 h-4 w-4" />}PDF</Button></div>
      </DialogHeader>
      {loading && !detail ? <div className="flex min-h-96 items-center justify-center"><LoadingSpinner className="h-8 w-8" /></div> : <div ref={documentRef} className="invoice-document mx-auto my-6 w-[min(900px,calc(100%-32px))] bg-white p-8 text-slate-900 shadow-sm sm:p-12">
        <header className="flex items-start justify-between gap-8 border-b border-slate-200 pb-8">
          <div className="flex items-start gap-4">{business.logoUrl && <Image src={business.logoUrl} alt="Business logo" width={56} height={56} unoptimized className="h-14 w-14 object-contain" />}<div><h2 className="text-xl font-bold">{business.name || 'Pesaby business'}</h2><p className="mt-1 max-w-sm whitespace-pre-line text-xs leading-5 text-slate-500">{[business.address, business.phone, business.email, business.kraPin ? `KRA PIN: ${business.kraPin}` : null].filter(Boolean).join('\n')}</p></div></div>
          <div className="text-right"><h1 className="text-3xl font-semibold tracking-tight">INVOICE</h1><p className="mt-2 font-mono text-sm font-semibold text-amber-700">{record.invoiceNo}</p><span className="mt-3 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase">{record.status.replaceAll('_', ' ')}</span></div>
        </header>
        <div className="grid gap-8 py-8 sm:grid-cols-2">
          <div><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Bill to</p><p className="mt-2 font-semibold">{customer.name || 'General customer'}</p><p className="mt-1 whitespace-pre-line text-xs leading-5 text-slate-500">{[customer.address, customer.phone, customer.email, customer.kraPin ? `KRA PIN: ${customer.kraPin}` : null].filter(Boolean).join('\n')}</p></div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:justify-self-end"><dt className="text-slate-500">Issue date</dt><dd className="text-right font-medium">{date(record.issuedAt ?? record.createdAt)}</dd><dt className="text-slate-500">Due date</dt><dd className="text-right font-medium">{date(record.dueDate)}</dd><dt className="text-slate-500">Fiscal status</dt><dd className="text-right font-medium capitalize">{record.fiscalStatus.replaceAll('_', ' ')}</dd>{record.fiscalReference && <><dt className="text-slate-500">Fiscal reference</dt><dd className="text-right font-medium">{record.fiscalReference}</dd></>}</dl>
        </div>
        <div className="overflow-hidden"><table className="w-full border-collapse text-xs"><thead><tr className="border-b border-slate-300 text-left uppercase text-slate-500"><th className="py-2">Description</th><th>SKU</th><th className="text-right">Qty</th><th>Unit</th><th className="text-right">Unit price</th><th className="text-right">Discount</th><th className="text-right">Tax</th><th className="text-right">Total</th></tr></thead><tbody>{detail?.items.map((item) => <tr key={item.id} className="border-b border-slate-100"><td className="py-3 font-medium">{item.description}</td><td>{item.sku || '—'}</td><td className="text-right">{item.quantity}</td><td>{item.unit}</td><td className="text-right">{amount(item.unitPrice)}</td><td className="text-right">{amount(Number(item.discountAmount) + Number(item.invoiceDiscountShare))}</td><td className="text-right">{amount(item.taxAmount)}</td><td className="text-right font-medium">{amount(item.total)}</td></tr>)}</tbody></table></div>
        <div className="ml-auto mt-8 w-full max-w-sm space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{amount(record.subtotal)}</span></div>
          {Number(record.discountAmount) > 0 && <div className="flex justify-between"><span className="text-slate-500">Discounts</span><span>- {amount(record.discountAmount)}</span></div>}
          {Number(record.shippingAmount) > 0 && <div className="flex justify-between"><span className="text-slate-500">Shipping</span><span>{amount(record.shippingAmount)}</span></div>}
          <div className="flex justify-between"><span className="text-slate-500">Tax{Number(record.taxRate) > 0 ? ` (${Number(record.taxRate)}%)` : ''}</span><span>{amount(record.taxAmount)}</span></div>
          {Number(record.roundingAmount) !== 0 && <div className="flex justify-between"><span className="text-slate-500">Rounding</span><span>{amount(record.roundingAmount)}</span></div>}
          <div className="flex justify-between border-t border-slate-300 pt-3 text-base font-bold"><span>Total</span><span>{amount(record.total)}</span></div>
          <div className="flex justify-between text-emerald-700"><span>Paid</span><span>{amount(record.amountPaid)}</span></div>
          {Number(record.creditedAmount) > 0 && <div className="flex justify-between text-purple-700"><span>Credit notes</span><span>- {amount(record.creditedAmount)}</span></div>}
          <div className="flex justify-between rounded-md bg-amber-50 p-3 text-base font-bold text-amber-900"><span>Balance due</span><span>{amount(record.balanceDue)}</span></div>
        </div>
        {!!detail?.payments.length && <section className="mt-10"><h3 className="mb-3 text-sm font-semibold">Payment history</h3><table className="w-full text-xs"><thead><tr className="border-b text-left uppercase text-slate-500"><th className="py-2">Date</th><th>Method</th><th>Reference</th><th className="text-right">Amount</th></tr></thead><tbody>{detail.payments.map((payment) => <tr key={payment.id} className="border-b"><td className="py-2">{date(payment.createdAt)}</td><td className="capitalize">{payment.method.replaceAll('_', ' ')}</td><td>{payment.reference || '—'}</td><td className="text-right">{amount(payment.amount)}</td></tr>)}</tbody></table></section>}
        {!!detail?.creditNotes.length && <section className="mt-10"><h3 className="mb-3 text-sm font-semibold">Credit notes</h3><table className="w-full text-xs"><thead><tr className="border-b text-left uppercase text-slate-500"><th className="py-2">Date</th><th>Credit note</th><th>Reason</th><th>Fiscal</th><th className="text-right">Amount</th></tr></thead><tbody>{detail.creditNotes.map((note) => <tr key={note.id} className="border-b"><td className="py-2">{date(note.createdAt)}</td><td className="font-mono">{note.creditNoteNo}</td><td>{note.reason}</td><td className="capitalize">{note.fiscalStatus.replaceAll('_', ' ')}</td><td className="text-right">{amount(note.amount)}</td></tr>)}</tbody></table></section>}
        {(record.notes || qrUrl) && <footer className="mt-10 flex items-end justify-between gap-6 border-t border-slate-200 pt-6"><div>{record.notes && <><h3 className="text-sm font-semibold">Notes</h3><p className="mt-2 max-w-xl whitespace-pre-line text-xs leading-5 text-slate-500">{record.notes}</p></>}</div>{qrUrl && <div className="text-center"><Image src={qrUrl} alt="Fiscal verification QR code" width={90} height={90} unoptimized /><p className="mt-1 text-[9px] text-slate-400">Fiscal verification</p></div>}</footer>}
        <p className="mt-12 border-t border-slate-200 pt-5 text-center text-xs text-slate-400">Thank you for your business.</p>
      </div>}
    </DialogContent>
  </Dialog>
}
