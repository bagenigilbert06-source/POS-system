'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { openPosSession, closePosSession } from '@/app/actions/operations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Banknote, CircleDot, ReceiptText } from 'lucide-react'

export function CashierShiftStrip({ workspace }: { workspace: { session: { sessionNo: string; openingCash: string } | null; todaySales: number; transactionCount: number } }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [cash, setCash] = useState('')
  const [error, setError] = useState('')
  const [reconciliation, setReconciliation] = useState<{ expectedCash: number; countedCash: number; variance: number } | null>(null)
  const run = () => startTransition(async () => { try { setError(''); setReconciliation(null); if (workspace.session) setReconciliation(await closePosSession(Number(cash))); else await openPosSession(Number(cash)); setCash(''); router.refresh() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to update shift') } })
  return <section className="rounded-xl border border-border bg-card p-3 shadow-sm sm:p-4">
    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <dl className="grid min-w-0 flex-1 grid-cols-1 divide-y divide-border overflow-hidden rounded-lg border border-border bg-[var(--dashboard-surface)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="flex items-center gap-3 px-3 py-3 sm:px-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#fff7d6] text-[#946d00]"><Banknote className="h-4 w-4" /></span><div><dt className="text-[11px] font-semibold text-muted-foreground">My sales today</dt><dd className="mt-0.5 text-lg font-bold tabular-nums text-[var(--dashboard-text)]">KES {workspace.todaySales.toLocaleString()}</dd></div></div>
        <div className="flex items-center gap-3 px-3 py-3 sm:px-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f3f5f7] text-[#526078]"><ReceiptText className="h-4 w-4" /></span><div><dt className="text-[11px] font-semibold text-muted-foreground">My transactions</dt><dd className="mt-0.5 text-lg font-bold tabular-nums text-[var(--dashboard-text)]">{workspace.transactionCount}</dd></div></div>
        <div className="flex items-center gap-3 px-3 py-3 sm:px-4"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${workspace.session ? 'bg-emerald-50 text-emerald-700' : 'bg-[#f3f5f7] text-[#526078]'}`}><CircleDot className="h-4 w-4" /></span><div><dt className="text-[11px] font-semibold text-muted-foreground">Shift</dt><dd className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${workspace.session ? 'bg-emerald-50 text-emerald-700' : 'bg-[#f3f5f7] text-[#526078]'}`}>{workspace.session ? `Open · ${workspace.session.sessionNo}` : 'Not started'}</dd></div></div>
      </dl>
      <div className="flex shrink-0 items-center gap-2"><Input aria-label={workspace.session ? 'Counted closing cash' : 'Opening float'} value={cash} onChange={(event) => setCash(event.target.value)} type="number" min="0" step="0.01" placeholder={workspace.session ? 'Counted cash' : 'Opening float'} className="h-10 w-full min-w-0 sm:w-36" /><Button className="h-10 shrink-0" disabled={pending || cash === ''} onClick={run}>{workspace.session ? 'End shift' : 'Start shift'}</Button></div>
    </div>
    {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
    {workspace.session && <p className="mt-3 text-xs text-muted-foreground">Opening float: KES {Number(workspace.session.openingCash).toLocaleString()}</p>}
    {reconciliation && <p className="mt-3 text-xs font-medium">Shift closed · Expected KES {reconciliation.expectedCash.toLocaleString()} · Counted KES {reconciliation.countedCash.toLocaleString()} · Variance KES {reconciliation.variance.toLocaleString()}</p>}
  </section>
}
