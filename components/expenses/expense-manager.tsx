'use client'

import { useMemo, useState, useTransition } from 'react'
import { Plus, Search, Trash2, WalletCards } from 'lucide-react'
import { toast } from 'sonner'
import { createExpense, deleteExpense } from '@/app/actions/expenses'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import type { Expense } from '@/lib/db/schema'

const categories = ['stock', 'rent', 'utilities', 'payroll', 'transport', 'marketing', 'tax', 'maintenance', 'general'] as const
const titleCase = (value: string) => value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())

export function ExpenseManager({ initialExpenses, currency }: { initialExpenses: Expense[]; currency: string }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [pending, startTransition] = useTransition()
  const visible = useMemo(() => initialExpenses.filter((item) => `${item.title} ${item.category} ${item.notes || ''}`.toLowerCase().includes(query.toLowerCase())), [initialExpenses, query])

  function submit(formData: FormData) {
    startTransition(async () => {
      try {
        await createExpense({ title: String(formData.get('title')), amount: Number(formData.get('amount')), category: String(formData.get('category')) as typeof categories[number], notes: String(formData.get('notes') || '') })
        toast.success('Expense recorded')
        setOpen(false)
      } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not record expense') }
    })
  }

  function remove(id: string) {
    if (!window.confirm('Delete this expense record? This cannot be undone.')) return
    startTransition(async () => {
      try { await deleteExpense(id); toast.success('Expense deleted') }
      catch { toast.error('Could not delete expense') }
    })
  }

  return <>
    <div className="flex flex-col gap-3 rounded-xl border bg-white p-3 sm:flex-row sm:items-center sm:justify-between dark:bg-card">
      <div className="relative w-full sm:max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search expenses" className="pl-9" /></div>
      <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button className="gap-2 bg-[#e42527] font-bold text-white hover:bg-[#c91f21]"><Plus className="h-4 w-4" />Record expense</Button></DialogTrigger><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Record an expense</DialogTitle></DialogHeader><form action={submit} className="space-y-4 pt-2"><div className="space-y-2"><Label htmlFor="expense-title">Description</Label><Input id="expense-title" name="title" required minLength={2} maxLength={120} placeholder="e.g. July shop rent" /></div><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="expense-amount">Amount ({currency})</Label><Input id="expense-amount" name="amount" type="number" required min="0.01" step="0.01" placeholder="0.00" /></div><div className="space-y-2"><Label>Category</Label><Select name="category" defaultValue="general"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{categories.map((category) => <SelectItem key={category} value={category}>{titleCase(category)}</SelectItem>)}</SelectContent></Select></div></div><div className="space-y-2"><Label htmlFor="expense-notes">Notes <span className="font-normal text-muted-foreground">(optional)</span></Label><textarea id="expense-notes" name="notes" maxLength={500} rows={3} className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="Reference, supplier, or other context" /></div><Button disabled={pending} className="w-full bg-[#e42527] font-bold text-white hover:bg-[#c91f21]">{pending ? 'Saving…' : 'Save expense'}</Button></form></DialogContent></Dialog>
    </div>
    <section className="overflow-hidden rounded-xl border bg-white dark:bg-card"><div className="border-b px-4 py-4 sm:px-5"><h2 className="font-bold">Expense records</h2><p className="mt-1 text-sm text-muted-foreground">Latest operating costs in this workspace.</p></div>{visible.length ? <div className="divide-y">{visible.map((item) => <article key={item.id} className="flex items-center gap-3 px-4 py-3.5 sm:px-5"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#fff3be] text-[#5f4900]"><WalletCards className="h-4 w-4" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-bold">{item.title}</p><span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">{titleCase(item.category)}</span></div><p className="mt-1 truncate text-xs text-muted-foreground">{formatDateTime(item.createdAt)}{item.notes ? ` · ${item.notes}` : ''}</p></div><p className="shrink-0 text-sm font-extrabold tabular-nums">{formatCurrency(item.amount, currency)}</p><button disabled={pending} onClick={() => remove(item.id)} className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label={`Delete ${item.title}`}><Trash2 className="h-4 w-4" /></button></article>)}</div> : <div className="flex min-h-56 flex-col items-center justify-center p-8 text-center"><WalletCards className="h-8 w-8 text-muted-foreground/40" /><p className="mt-3 text-sm font-semibold">{query ? 'No matching expenses' : 'No expenses recorded'}</p><p className="mt-1 text-sm text-muted-foreground">{query ? 'Try a different search.' : 'Record operating costs to make profit reporting accurate.'}</p></div>}</section>
  </>
}
