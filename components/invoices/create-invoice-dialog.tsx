'use client'

import { useMemo, useRef, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { createInvoice, issueInvoice } from '@/app/actions/invoice-actions'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoadingSpinner } from '@/components/ui/page-loader'
import { calculateInvoiceTotals, type TaxPolicy } from '@/lib/finance/money'
import { notify } from '@/lib/notify'

type Option = { id: string; name: string }
type DraftLine = { description: string; sku: string; unit: string; quantity: number; unitPrice: number; discountAmount: number }
const emptyLine = (): DraftLine => ({ description: '', sku: '', unit: 'each', quantity: 1, unitPrice: 0, discountAmount: 0 })

export function CreateInvoiceDialog({ customers, branches, taxPolicy, canIssue }: { customers: Option[]; branches: Option[]; taxPolicy: TaxPolicy; canIssue: boolean }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [items, setItems] = useState<DraftLine[]>([emptyLine()])
  const [customerId, setCustomerId] = useState('')
  const [branchId, setBranchId] = useState(branches[0]?.id ?? '')
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [invoiceDiscount, setInvoiceDiscount] = useState(0)
  const idempotencyKey = useRef(crypto.randomUUID())
  const preview = useMemo(() => { try { return calculateInvoiceTotals(items, invoiceDiscount, taxPolicy) } catch { return null } }, [invoiceDiscount, items, taxPolicy])

  const reset = () => {
    setItems([emptyLine()]); setCustomerId(''); setBranchId(branches[0]?.id ?? ''); setDueDate(''); setNotes(''); setInvoiceDiscount(0)
    idempotencyKey.current = crypto.randomUUID()
  }
  const updateLine = (index: number, patch: Partial<DraftLine>) => setItems((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line))

  const submit = async (issueNow: boolean) => {
    if (!branchId) return notify.error('Select a branch')
    if (items.some((item) => !item.description.trim() || item.quantity <= 0 || item.unitPrice < 0)) return notify.error('Complete every invoice line')
    setBusy(true)
    try {
      const result = await createInvoice({ branchId, customerId: customerId || undefined, dueDate: dueDate ? new Date(`${dueDate}T12:00:00`) : undefined, notes: notes || undefined, discountAmount: invoiceDiscount, idempotencyKey: idempotencyKey.current, items: items.map((item) => ({ ...item, sku: item.sku || undefined })) })
      if (issueNow) await issueInvoice(result.invoice.id)
      notify.success(issueNow ? 'Invoice created and issued' : 'Invoice saved as draft')
      reset(); setOpen(false)
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Could not create invoice')
    } finally { setBusy(false) }
  }

  return <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next && !busy) reset() }}>
    <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" />New invoice</Button></DialogTrigger>
    <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
      <DialogHeader><DialogTitle>Create invoice</DialogTitle><DialogDescription>The invoice number and final totals are generated securely by Pesaby.</DialogDescription></DialogHeader>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2"><Label htmlFor="invoice-branch">Branch</Label><select id="invoice-branch" value={branchId} onChange={(event) => setBranchId(event.target.value)} className="h-9 w-full rounded-md border bg-background px-3 text-sm">{branches.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
        <div className="space-y-2"><Label htmlFor="invoice-customer">Customer</Label><select id="invoice-customer" value={customerId} onChange={(event) => setCustomerId(event.target.value)} className="h-9 w-full rounded-md border bg-background px-3 text-sm"><option value="">Walk-in / general customer</option>{customers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
        <div className="space-y-2"><Label htmlFor="invoice-due">Due date</Label><Input id="invoice-due" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></div>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-muted/60 text-xs uppercase text-muted-foreground"><tr><th className="px-3 py-2 text-left">Description</th><th className="px-3 py-2 text-left">SKU</th><th className="px-3 py-2 text-left">Unit</th><th className="px-3 py-2 text-right">Qty</th><th className="px-3 py-2 text-right">Unit price</th><th className="px-3 py-2 text-right">Discount</th><th className="w-10" /></tr></thead>
          <tbody>{items.map((item, index) => <tr key={index} className="border-t">
            <td className="p-2"><Input aria-label={`Description ${index + 1}`} value={item.description} onChange={(event) => updateLine(index, { description: event.target.value })} placeholder="Item or service" /></td>
            <td className="p-2"><Input aria-label={`SKU ${index + 1}`} value={item.sku} onChange={(event) => updateLine(index, { sku: event.target.value })} placeholder="Optional" /></td>
            <td className="p-2"><Input aria-label={`Unit ${index + 1}`} value={item.unit} onChange={(event) => updateLine(index, { unit: event.target.value })} /></td>
            <td className="p-2"><Input aria-label={`Quantity ${index + 1}`} type="number" min="1" step="1" value={item.quantity} onChange={(event) => updateLine(index, { quantity: Number(event.target.value) })} className="text-right" /></td>
            <td className="p-2"><Input aria-label={`Unit price ${index + 1}`} type="number" min="0" step="0.01" value={item.unitPrice} onChange={(event) => updateLine(index, { unitPrice: Number(event.target.value) })} className="text-right" /></td>
            <td className="p-2"><Input aria-label={`Line discount ${index + 1}`} type="number" min="0" step="0.01" value={item.discountAmount} onChange={(event) => updateLine(index, { discountAmount: Number(event.target.value) })} className="text-right" /></td>
            <td className="p-2"><Button type="button" variant="ghost" size="sm" disabled={items.length === 1} onClick={() => setItems((current) => current.filter((_, lineIndex) => lineIndex !== index))} aria-label="Remove line"><Trash2 className="h-4 w-4 text-destructive" /></Button></td>
          </tr>)}</tbody>
        </table>
        <Button type="button" variant="ghost" size="sm" onClick={() => setItems((current) => [...current, emptyLine()])} className="m-2 gap-2"><Plus className="h-4 w-4" />Add line</Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-[1fr_320px]">
        <div className="space-y-2"><Label htmlFor="invoice-notes">Notes / payment terms</Label><textarea id="invoice-notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={5} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Optional message shown on the invoice" /></div>
        <div className="space-y-2 rounded-lg border bg-muted/25 p-4 text-sm">
          <div className="flex items-center justify-between gap-4"><Label htmlFor="invoice-discount">Invoice discount</Label><Input id="invoice-discount" type="number" min="0" step="0.01" value={invoiceDiscount} onChange={(event) => setInvoiceDiscount(Number(event.target.value))} className="w-32 text-right" /></div>
          <div className="flex justify-between"><span>Subtotal</span><span>KES {preview?.subtotal.toFixed(2) ?? '—'}</span></div>
          <div className="flex justify-between"><span>Discounts</span><span>- KES {preview ? preview.lineDiscount.plus(preview.discountAmount).toFixed(2) : '—'}</span></div>
          <div className="flex justify-between"><span>{taxPolicy.enabled ? `Tax (${taxPolicy.ratePercent}%)` : 'Tax'}</span><span>KES {preview?.taxAmount.toFixed(2) ?? '—'}</span></div>
          <div className="flex justify-between border-t pt-2 text-base font-semibold"><span>Total estimate</span><span>KES {preview?.total.toFixed(2) ?? '—'}</span></div>
          <p className="text-xs text-muted-foreground">The server recalculates and saves the authoritative total.</p>
        </div>
      </div>
      <div className="flex flex-wrap justify-end gap-2 border-t pt-4"><Button variant="outline" disabled={busy} onClick={() => setOpen(false)}>Cancel</Button><Button variant="outline" disabled={busy || !preview} onClick={() => submit(false)}>{busy && <LoadingSpinner className="mr-2 h-4 w-4" />}Save draft</Button>{canIssue && <Button disabled={busy || !preview} onClick={() => submit(true)}>Create and issue</Button>}</div>
    </DialogContent>
  </Dialog>
}
