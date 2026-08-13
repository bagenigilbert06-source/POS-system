'use client'

import { useTransition } from 'react'
import { AlertTriangle, ArchiveRestore, Banknote, Boxes, ClipboardCheck, Loader2, ReceiptText } from 'lucide-react'
import { toast } from 'sonner'
import { closePosSession, openPosSession, recordInventoryLoss, refundSale } from '@/app/actions/operations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { PosSession, Product, Sale } from '@/lib/db/schema'
import { formatDateTime } from '@/lib/utils'

type ActionPanelProps = {
  icon: React.ElementType
  title: string
  description: string
  children: React.ReactNode
  tone?: 'default' | 'danger'
}

export function OperationsControl({ products, sales, openSessions }: { products: Product[]; sales: Sale[]; openSessions: PosSession[] }) {
  const [pending, start] = useTransition()
  const run = (fn: () => Promise<unknown>, message: string) => start(async () => {
    try {
      await fn()
      toast.success(message)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Operation failed')
    }
  })

  return (
    <section id="supervisor-actions" aria-labelledby="supervisor-actions-title" className="scroll-mt-24">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-[#9a6700] dark:text-[#ffd60a]">Supervisor tools</p>
          <h2 id="supervisor-actions-title" className="mt-1 text-lg font-bold tracking-tight text-[#172033] dark:text-[#f5f5f7]">Take action</h2>
          <p className="mt-1 text-sm text-muted-foreground">Register, stock-loss and refund controls are recorded in the audit trail.</p>
        </div>
        {pending && <span className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" />Saving change…</span>}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <ActionPanel icon={Banknote} title={openSessions.length ? 'Close a cash register' : 'Open your cash register'} description={openSessions.length ? `${openSessions.length} register${openSessions.length === 1 ? ' is' : 's are'} currently open.` : 'Start a shift with the counted opening float.'}>
          <form action={(form) => openSessions.length
            ? run(() => closePosSession(Number(form.get('cash')), String(form.get('notes') || ''), String(form.get('sessionId') || '')), 'Register closed and reconciled')
            : run(() => openPosSession(Number(form.get('cash'))), 'Register opened')} className="space-y-3">
            {openSessions.length > 0 && <Field label="Register to reconcile"><Choice name="sessionId" placeholder="Choose an open register" required items={openSessions.map((session) => [session.id, `${session.sessionNo} · ${formatDateTime(session.openedAt)}`])} /></Field>}
            <Field label={openSessions.length ? 'Counted closing cash' : 'Opening float'}><Input name="cash" type="number" min="0" step="0.01" required placeholder="0.00" className="h-10 bg-background" /></Field>
            {openSessions.length > 0 && <Field label="Closing notes" optional><Input name="notes" maxLength={300} placeholder="Add a handover note" className="h-10 bg-background" /></Field>}
            <Button disabled={pending} className="h-10 w-full font-semibold">{pending ? 'Saving…' : openSessions.length ? 'Close and reconcile' : 'Open register'}</Button>
          </form>
        </ActionPanel>

        <ActionPanel icon={Boxes} title="Record inventory loss" description="Log damaged, expired, missing or stolen stock.">
          {products.length ? <form action={(form) => run(() => recordInventoryLoss({ productId: String(form.get('productId')), quantity: Number(form.get('quantity')), type: String(form.get('type')), reason: String(form.get('reason')) }), 'Stock loss recorded')} className="space-y-3">
            <Field label="Product"><Choice name="productId" placeholder="Choose product" required items={products.map((product) => [product.id, `${product.name} · ${product.stock} available`])} /></Field>
            <div className="grid grid-cols-[minmax(0,1fr)_105px] gap-3">
              <Field label="Loss type"><Choice name="type" placeholder="Select type" required items={['damaged', 'expired', 'lost', 'theft', 'count_adjustment'].map((type) => [type, type.replace('_', ' ')])} /></Field>
              <Field label="Quantity"><Input name="quantity" type="number" min="1" required placeholder="0" className="h-10 bg-background" /></Field>
            </div>
            <Field label="Reason or evidence"><Input name="reason" minLength={3} maxLength={300} required placeholder="Explain what happened" className="h-10 bg-background" /></Field>
            <Button disabled={pending} className="h-10 w-full font-semibold">{pending ? 'Saving…' : 'Record stock loss'}</Button>
          </form> : <EmptyAction icon={ArchiveRestore} title="No active stock" detail="There are no active inventory items available to adjust." />}
        </ActionPanel>

        <ActionPanel icon={ReceiptText} title="Refund a completed sale" description="Issue a full refund and decide how returned goods are handled." tone="danger">
          {sales.length ? <form action={(form) => run(() => refundSale({ saleId: String(form.get('saleId')), refundMethod: String(form.get('refundMethod')), disposition: String(form.get('disposition')), reason: String(form.get('reason')) }), 'Credit note and refund recorded')} className="space-y-3">
            <Field label="Receipt"><Choice name="saleId" placeholder="Choose receipt" required items={sales.map((record) => [record.id, `${record.receiptNo} · ${record.total}`])} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Refund method"><Choice name="refundMethod" placeholder="Choose method" required items={['cash', 'mpesa', 'card', 'store_credit'].map((method) => [method, method.replace('_', ' ')])} /></Field>
              <Field label="Returned goods"><Choice name="disposition" placeholder="Choose action" required items={[["restock", "Return to stock"], ["damaged", "Do not restock"]]} /></Field>
            </div>
            <Field label="Refund reason"><Input name="reason" minLength={3} maxLength={300} required placeholder="Explain why this is being refunded" className="h-10 bg-background" /></Field>
            <Button disabled={pending} variant="destructive" className="h-10 w-full bg-[#e42527] font-semibold text-white hover:bg-[#c91f21]">{pending ? 'Saving…' : 'Issue full refund'}</Button>
          </form> : <EmptyAction icon={AlertTriangle} title="No refundable receipts" detail="Completed, unrefunded receipts will appear here." />}
        </ActionPanel>
      </div>
    </section>
  )
}

function ActionPanel({ icon: Icon, title, description, children, tone = 'default' }: ActionPanelProps) {
  return <article className="overflow-hidden rounded-2xl border border-[#e2e7ef] bg-white shadow-[0_4px_14px_rgba(16,24,40,.05)] dark:border-[#292929] dark:bg-[#111]">
    <div className="flex items-start gap-3 border-b border-[#edf0f4] px-5 py-4 dark:border-[#292929]">
      <span className={tone === 'danger' ? 'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-[#d92d20] dark:bg-red-950/30 dark:text-red-400' : 'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fff7d6] text-[#9a6700] dark:bg-[rgba(255,214,10,.08)] dark:text-[#ffd60a]'}><Icon className="h-5 w-5" /></span>
      <div><h3 className="font-bold text-[#172033] dark:text-[#f5f5f7]">{title}</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p></div>
    </div>
    <div className="p-5">{children}</div>
  </article>
}

function Field({ label, optional = false, children }: { label: string; optional?: boolean; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-[#344054] dark:text-[#d0d5dd]">{label}{optional && <span className="font-normal text-muted-foreground">(optional)</span>}</span>{children}</label>
}

function Choice({ name, placeholder, items, required = false }: { name: string; placeholder: string; items: string[][]; required?: boolean }) {
  return <Select name={name} required={required}><SelectTrigger className="h-10 bg-background"><SelectValue placeholder={placeholder} /></SelectTrigger><SelectContent>{items.map(([value, label]) => <SelectItem key={value} value={value} className="capitalize">{label}</SelectItem>)}</SelectContent></Select>
}

function EmptyAction({ icon: Icon, title, detail }: { icon: React.ElementType; title: string; detail: string }) {
  return <div className="flex min-h-[214px] flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 px-5 text-center"><Icon className="h-7 w-7 text-muted-foreground" /><p className="mt-3 text-sm font-semibold">{title}</p><p className="mt-1 max-w-xs text-xs leading-5 text-muted-foreground">{detail}</p></div>
}
