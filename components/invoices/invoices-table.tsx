'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, FileCheck2, MoreHorizontal, ReceiptText, Search, Trash2, WalletCards, XCircle } from 'lucide-react'
import { cancelInvoice, deleteInvoice, issueInvoice, issueInvoiceCreditNote, recordInvoicePayment } from '@/app/actions/invoice-actions'
import { InvoiceViewDialog } from './invoice-view-dialog'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoadingSpinner } from '@/components/ui/page-loader'
import type { Invoice } from '@/lib/db/schema'
import { notify } from '@/lib/notify'

type Permissions = { canIssue: boolean; canRecordPayment: boolean; canCancel: boolean; canCreditNote: boolean }
type Modal = { type: 'payment' | 'credit' | 'cancel' | 'delete'; invoice: Invoice } | null
type Snapshot = Record<string, string | null | undefined>
const snapshot = (value: unknown): Snapshot => value && typeof value === 'object' && !Array.isArray(value) ? value as Snapshot : {}
const currency = (value: string | number) => `KES ${Number(value).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const statusStyle: Record<string, string> = { draft: 'bg-slate-100 text-slate-700', issued: 'bg-blue-100 text-blue-700', partially_paid: 'bg-amber-100 text-amber-800', paid: 'bg-emerald-100 text-emerald-700', overdue: 'bg-red-100 text-red-700', cancelled: 'bg-slate-200 text-slate-500', credited: 'bg-purple-100 text-purple-700' }

export function InvoicesTable({ invoices, permissions }: { invoices: Invoice[]; permissions: Permissions }) {
  const router = useRouter()
  const [query, setQuery] = useState(''), [status, setStatus] = useState('all'), [selected, setSelected] = useState<Invoice | null>(null), [modal, setModal] = useState<Modal>(null), [busy, setBusy] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState(''), [method, setMethod] = useState('cash'), [reference, setReference] = useState(''), [reason, setReason] = useState('')
  const actionKey = useRef(crypto.randomUUID())
  const rows = useMemo(() => invoices.filter((item) => `${item.invoiceNo} ${snapshot(item.customerSnapshot).name ?? ''}`.toLowerCase().includes(query.toLowerCase()) && (status === 'all' || item.status === status)), [invoices, query, status])

  const resetModal = () => { setModal(null); setPaymentAmount(''); setReference(''); setReason(''); actionKey.current = crypto.randomUUID() }
  const runIssue = async (item: Invoice) => { setBusy(true); try { await issueInvoice(item.id); notify.success('Invoice issued'); router.refresh() } catch (error) { notify.error(error instanceof Error ? error.message : 'Could not issue invoice') } finally { setBusy(false) } }
  const runAction = async () => {
    if (!modal) return
    setBusy(true)
    try {
      if (modal.type === 'payment') {
        await recordInvoicePayment({ invoiceId: modal.invoice.id, amount: Number(paymentAmount), method: method as 'cash' | 'mpesa' | 'card' | 'bank_transfer' | 'other', reference: reference || undefined, idempotencyKey: actionKey.current })
        notify.success('Payment recorded')
      } else if (modal.type === 'credit') {
        await issueInvoiceCreditNote({ invoiceId: modal.invoice.id, amount: Number(paymentAmount), reason, idempotencyKey: actionKey.current })
        notify.success('Credit note issued')
      } else if (modal.type === 'cancel') {
        await cancelInvoice(modal.invoice.id, reason); notify.success('Invoice cancelled')
      } else {
        await deleteInvoice(modal.invoice.id); notify.success('Draft invoice deleted')
      }
      resetModal(); router.refresh()
    } catch (error) { notify.error(error instanceof Error ? error.message : 'Invoice action failed') } finally { setBusy(false) }
  }
  const openAmountAction = (type: 'payment' | 'credit', item: Invoice) => { setPaymentAmount(item.balanceDue); setReason(''); actionKey.current = crypto.randomUUID(); setModal({ type, invoice: item }) }

  return <>
    <div className="flex flex-wrap items-center gap-3 border-b p-4">
      <div className="relative min-w-56 flex-1 sm:max-w-sm"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search number or customer" className="pl-9" /></div>
      <select aria-label="Invoice status" value={status} onChange={(event) => setStatus(event.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm"><option value="all">All statuses</option><option value="draft">Draft</option><option value="issued">Issued</option><option value="partially_paid">Partially paid</option><option value="paid">Paid</option><option value="overdue">Overdue</option><option value="cancelled">Cancelled</option><option value="credited">Credited</option></select>
      <span className="text-xs text-muted-foreground">{rows.length} invoice{rows.length === 1 ? '' : 's'}</span>
    </div>
    {rows.length === 0 ? <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center"><FileCheck2 className="h-9 w-9 text-muted-foreground/50" /><p className="mt-3 text-sm font-medium">No invoices match this view</p><p className="mt-1 text-xs text-muted-foreground">Create an invoice or change the filters.</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[1040px] text-sm"><thead className="bg-muted/50 text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-3 text-left">Invoice</th><th className="px-4 py-3 text-left">Customer</th><th className="px-4 py-3 text-left">Issue / due</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3 text-right">Paid</th><th className="px-4 py-3 text-right">Credits</th><th className="px-4 py-3 text-right">Balance</th><th className="px-4 py-3 text-left">Status</th><th className="w-14" /></tr></thead><tbody>{rows.map((item) => {
      const customer = snapshot(item.customerSnapshot)
      return <tr key={item.id} className="border-t hover:bg-muted/30">
        <td className="px-4 py-3 font-mono text-xs font-semibold">{item.invoiceNo}</td>
        <td className="px-4 py-3"><p className="font-medium">{customer.name || 'General customer'}</p>{customer.phone && <p className="text-xs text-muted-foreground">{customer.phone}</p>}</td>
        <td className="px-4 py-3 text-xs"><p>{new Date(item.issuedAt ?? item.createdAt).toLocaleDateString()}</p><p className="text-muted-foreground">Due {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : '—'}</p></td>
        <td className="px-4 py-3 text-right font-medium">{currency(item.total)}</td><td className="px-4 py-3 text-right text-emerald-700">{currency(item.amountPaid)}</td><td className="px-4 py-3 text-right text-purple-700">{currency(item.creditedAmount)}</td><td className="px-4 py-3 text-right font-semibold">{currency(item.balanceDue)}</td>
        <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusStyle[item.status] ?? statusStyle.draft}`}>{item.status.replaceAll('_', ' ')}</span></td>
        <td className="px-3 py-3 text-right"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="sm" aria-label={`Actions for ${item.invoiceNo}`} disabled={busy}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setSelected(item)}><Eye className="mr-2 h-4 w-4" />View / PDF</DropdownMenuItem>
          {permissions.canIssue && item.status === 'draft' && <DropdownMenuItem onClick={() => runIssue(item)}><FileCheck2 className="mr-2 h-4 w-4" />Issue invoice</DropdownMenuItem>}
          {permissions.canRecordPayment && ['issued', 'partially_paid', 'overdue'].includes(item.status) && <DropdownMenuItem onClick={() => openAmountAction('payment', item)}><WalletCards className="mr-2 h-4 w-4" />Record payment</DropdownMenuItem>}
          {permissions.canCreditNote && !item.saleId && ['issued', 'partially_paid', 'overdue'].includes(item.status) && Number(item.balanceDue) > 0 && <DropdownMenuItem onClick={() => openAmountAction('credit', item)}><ReceiptText className="mr-2 h-4 w-4" />Issue credit note</DropdownMenuItem>}
          {permissions.canCancel && ['draft', 'issued', 'overdue'].includes(item.status) && <DropdownMenuItem onClick={() => setModal({ type: 'cancel', invoice: item })}><XCircle className="mr-2 h-4 w-4" />Cancel invoice</DropdownMenuItem>}
          {permissions.canCancel && item.status === 'draft' && <DropdownMenuItem className="text-destructive" onClick={() => setModal({ type: 'delete', invoice: item })}><Trash2 className="mr-2 h-4 w-4" />Delete draft</DropdownMenuItem>}
        </DropdownMenuContent></DropdownMenu></td>
      </tr>
    })}</tbody></table></div>}
    {selected && <InvoiceViewDialog invoice={selected} open onOpenChange={(next) => { if (!next) setSelected(null) }} />}
    <Dialog open={!!modal} onOpenChange={(next) => { if (!next && !busy) resetModal() }}><DialogContent className="max-w-md">
      <DialogHeader><DialogTitle>{modal?.type === 'payment' ? 'Record invoice payment' : modal?.type === 'credit' ? 'Issue credit note' : modal?.type === 'cancel' ? 'Cancel invoice' : 'Delete draft invoice'}</DialogTitle><DialogDescription>{modal?.type === 'payment' || modal?.type === 'credit' ? `Outstanding balance: ${modal ? currency(modal.invoice.balanceDue) : ''}` : modal?.type === 'cancel' ? 'Cancellation preserves the invoice and audit history.' : 'Only unpaid draft invoices can be deleted.'}</DialogDescription></DialogHeader>
      {modal?.type === 'payment' && <div className="space-y-4"><AmountField id="payment-amount" label="Amount" value={paymentAmount} max={modal.invoice.balanceDue} onChange={setPaymentAmount} /><div className="space-y-2"><Label htmlFor="payment-method">Payment method</Label><select id="payment-method" value={method} onChange={(event) => setMethod(event.target.value)} className="h-9 w-full rounded-md border bg-background px-3 text-sm"><option value="cash">Cash</option><option value="mpesa">M-Pesa</option><option value="card">Card</option><option value="bank_transfer">Bank transfer</option><option value="other">Other</option></select></div><div className="space-y-2"><Label htmlFor="payment-reference">Reference</Label><Input id="payment-reference" value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Required for non-cash payments" /></div></div>}
      {modal?.type === 'credit' && <div className="space-y-4"><AmountField id="credit-amount" label="Credit amount" value={paymentAmount} max={modal.invoice.balanceDue} onChange={setPaymentAmount} /><ReasonField id="credit-reason" value={reason} onChange={setReason} /></div>}
      {modal?.type === 'cancel' && <ReasonField id="cancel-reason" value={reason} onChange={setReason} />}
      <div className="flex justify-end gap-2"><Button variant="outline" disabled={busy} onClick={resetModal}>Keep invoice</Button><Button variant={modal?.type === 'payment' ? 'default' : 'destructive'} disabled={busy || ((modal?.type === 'payment' || modal?.type === 'credit') && Number(paymentAmount) <= 0) || ((modal?.type === 'credit' || modal?.type === 'cancel') && reason.trim().length < 3)} onClick={runAction}>{busy && <LoadingSpinner className="mr-2 h-4 w-4" />}{modal?.type === 'payment' ? 'Record payment' : modal?.type === 'credit' ? 'Issue credit note' : modal?.type === 'cancel' ? 'Cancel invoice' : 'Delete draft'}</Button></div>
    </DialogContent></Dialog>
  </>
}

function AmountField({ id, label, value, max, onChange }: { id: string; label: string; value: string; max: string; onChange: (value: string) => void }) { return <div className="space-y-2"><Label htmlFor={id}>{label}</Label><Input id={id} type="number" min="0.01" max={max} step="0.01" value={value} onChange={(event) => onChange(event.target.value)} /></div> }
function ReasonField({ id, value, onChange }: { id: string; value: string; onChange: (value: string) => void }) { return <div className="space-y-2"><Label htmlFor={id}>Reason</Label><textarea id={id} value={value} onChange={(event) => onChange(event.target.value)} rows={3} className="w-full rounded-md border bg-background px-3 py-2 text-sm" /></div> }
