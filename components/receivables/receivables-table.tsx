'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, ReceiptText, Search, WalletCards } from 'lucide-react'
import { recordCreditPayment } from '@/app/actions/credit-sales'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoadingSpinner } from '@/components/ui/page-loader'
import { notify } from '@/lib/notify'

type Row = { id: string; customerId: string; customerName: string; customerPhone: string | null; saleId: string; saleReference: string; branchId: string | null; invoiceId: string | null; invoiceNo: string | null; amount: string; amountPaid: string; creditedAmount: string; balance: string; dueDate: Date | null; createdAt: Date; storedStatus: string; age: { days: number; bucket: 'current' | '1-30' | '31-60' | '61-90' | '90+' } }
const currency = (value: string | number) => `KES ${Number(value).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export function ReceivablesTable({ rows, branches, filters, pagination, canManage }: { rows: Row[]; branches: { id: string; name: string }[]; filters: { q: string; status: string; age: string; branch: string }; pagination: { page: number; pages: number; total: number }; canManage: boolean }) {
  const router = useRouter(), pathname = usePathname(), currentParams = useSearchParams()
  const [query, setQuery] = useState(filters.q)
  const [selected, setSelected] = useState<Row | null>(null)
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('cash')
  const [reference, setReference] = useState('')
  const [busy, setBusy] = useState(false)
  const idempotencyKey = useRef(crypto.randomUUID())
  const navigate = (patch: Record<string, string | undefined>) => { const next = new URLSearchParams(currentParams); Object.entries(patch).forEach(([key, value]) => { if (!value || value === 'all') next.delete(key); else next.set(key, value) }); if (!('page' in patch)) next.delete('page'); router.push(`${pathname}?${next}`) }
  const collect = async () => {
    if (!selected) return
    setBusy(true)
    try {
      await recordCreditPayment({ creditSaleId: selected.id, amount: Number(amount), method: method as 'cash' | 'mpesa' | 'card' | 'bank_transfer' | 'other', reference: reference || undefined, idempotencyKey: idempotencyKey.current })
      notify.success('Customer payment recorded')
      setSelected(null); setAmount(''); setReference(''); idempotencyKey.current = crypto.randomUUID(); router.refresh()
    } catch (error) { notify.error(error instanceof Error ? error.message : 'Could not record payment') } finally { setBusy(false) }
  }

  return <section className="overflow-hidden rounded-lg border bg-card">
    <div className="flex flex-wrap gap-3 border-b p-4">
      <form className="relative min-w-56 flex-1 sm:max-w-sm" onSubmit={(event) => { event.preventDefault(); navigate({ q: query }) }}><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Customer, invoice, or receipt" className="pl-9" /></form>
      <select aria-label="Receivable status" value={filters.status} onChange={(event) => navigate({ status: event.target.value })} className="h-9 rounded-md border bg-background px-3 text-sm"><option value="all">All open balances</option><option value="overdue">Overdue</option><option value="due_soon">Due in 7 days</option></select>
      <select aria-label="Age bucket" value={filters.age} onChange={(event) => navigate({ age: event.target.value })} className="h-9 rounded-md border bg-background px-3 text-sm"><option value="all">All ageing</option><option value="current">Current</option><option value="1-30">1–30 days</option><option value="31-60">31–60 days</option><option value="61-90">61–90 days</option><option value="90+">90+ days</option></select>
      {branches.length > 1 && <select aria-label="Branch" value={filters.branch} onChange={(event) => navigate({ branch: event.target.value })} className="h-9 rounded-md border bg-background px-3 text-sm"><option value="all">All branches</option>{branches.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}
    </div>
    {rows.length === 0 ? <div className="flex min-h-64 flex-col items-center justify-center text-center"><ReceiptText className="h-9 w-9 text-muted-foreground/50" /><p className="mt-3 text-sm font-medium">No outstanding receivables</p><p className="mt-1 text-xs text-muted-foreground">Customer credit balances matching these filters will appear here.</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[1120px] text-sm"><thead className="bg-muted/50 text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-3 text-left">Customer</th><th className="px-4 py-3 text-left">Invoice / receipt</th><th className="px-4 py-3 text-right">Original</th><th className="px-4 py-3 text-right">Paid</th><th className="px-4 py-3 text-right">Balance</th><th className="px-4 py-3 text-left">Issued</th><th className="px-4 py-3 text-left">Due</th><th className="px-4 py-3 text-left">Age</th><th className="px-4 py-3 text-left">Status</th><th className="w-32" /></tr></thead><tbody>{rows.map((row) => {
      const overdue = !!row.dueDate && row.age.days > 0
      return <tr key={row.id} className="border-t hover:bg-muted/30"><td className="px-4 py-3"><Link href={`/dashboard/receivables/customer/${row.customerId}`} className="font-medium hover:underline">{row.customerName}</Link><p className="text-xs text-muted-foreground">{row.customerPhone || 'No phone'}</p></td><td className="px-4 py-3"><p className="font-mono text-xs font-semibold">{row.invoiceNo || row.saleReference}</p><p className="text-xs text-muted-foreground">{row.invoiceNo ? row.saleReference : 'Credit sale'}</p></td><td className="px-4 py-3 text-right">{currency(row.amount)}</td><td className="px-4 py-3 text-right text-emerald-700">{currency(row.amountPaid)}</td><td className="px-4 py-3 text-right font-semibold">{currency(row.balance)}</td><td className="px-4 py-3">{new Date(row.createdAt).toLocaleDateString()}</td><td className="px-4 py-3">{row.dueDate ? new Date(row.dueDate).toLocaleDateString() : 'No due date'}</td><td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium">{row.age.bucket}</span></td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${overdue ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}`}>{overdue ? `${row.age.days} days overdue` : row.storedStatus.replaceAll('_', ' ')}</span></td><td className="px-4 py-3 text-right">{row.invoiceId ? <Button asChild size="sm" variant="outline"><Link href="/dashboard/invoices">Open invoice</Link></Button> : canManage ? <Button size="sm" onClick={() => { setSelected(row); setAmount(row.balance) }}><WalletCards className="mr-2 h-4 w-4" />Collect</Button> : null}</td></tr>
    })}</tbody></table></div>}
    <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground"><span>{pagination.total} outstanding record{pagination.total === 1 ? '' : 's'}</span><div className="flex items-center gap-2"><Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => navigate({ page: String(pagination.page - 1) })}><ChevronLeft className="h-4 w-4" /></Button><span>Page {pagination.page} of {pagination.pages}</span><Button variant="outline" size="sm" disabled={pagination.page >= pagination.pages} onClick={() => navigate({ page: String(pagination.page + 1) })}><ChevronRight className="h-4 w-4" /></Button></div></div>
    <Dialog open={!!selected} onOpenChange={(open) => { if (!open && !busy) setSelected(null) }}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>Record customer payment</DialogTitle><DialogDescription>{selected ? `${selected.customerName} owes ${currency(selected.balance)} on ${selected.saleReference}.` : ''}</DialogDescription></DialogHeader><div className="space-y-4"><div className="space-y-2"><Label htmlFor="ar-amount">Amount</Label><Input id="ar-amount" type="number" min="0.01" max={selected?.balance} step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} /></div><div className="space-y-2"><Label htmlFor="ar-method">Payment method</Label><select id="ar-method" value={method} onChange={(event) => setMethod(event.target.value)} className="h-9 w-full rounded-md border bg-background px-3 text-sm"><option value="cash">Cash</option><option value="mpesa">M-Pesa</option><option value="card">Card</option><option value="bank_transfer">Bank transfer</option><option value="other">Other</option></select></div><div className="space-y-2"><Label htmlFor="ar-reference">Reference</Label><Input id="ar-reference" value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Required for non-cash payments" /></div></div><div className="flex justify-end gap-2"><Button variant="outline" disabled={busy} onClick={() => setSelected(null)}>Cancel</Button><Button disabled={busy || Number(amount) <= 0} onClick={collect}>{busy && <LoadingSpinner className="mr-2 h-4 w-4" />}Record payment</Button></div></DialogContent></Dialog>
  </section>
}
