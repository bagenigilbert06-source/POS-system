'use client'

import { Users, Award } from 'lucide-react'
import { formatCurrency, formatNumber } from '@/lib/utils/format'

interface StaffKPI {
  id: string
  name: string
  totalSales: number
  transactions: number
  avgSale: number
  ranking: number
  topPerformer?: boolean
}

interface StaffKPIsProps {
  staff: StaffKPI[]
  currency: string
}

export function StaffKPIs({ staff, currency }: StaffKPIsProps) {
  if (!staff.length) {
    return (
      <article className="app-panel overflow-hidden">
        <div className="border-b px-4 py-4 sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <div><h2>Staff performance</h2><p className="mt-1 text-xs text-muted-foreground">Completed sales by team member</p></div>
            <Users className="h-4 w-4 text-[var(--dashboard-accent)]" />
          </div>
        </div>
        <div className="flex h-40 items-center justify-center text-center">
          <div><p className="text-sm font-semibold">No staff data</p><p className="text-xs text-muted-foreground mt-1">Set up staff login to track KPIs</p></div>
        </div>
      </article>
    )
  }

  return (
    <article className="app-panel overflow-hidden">
      <div className="border-b px-4 py-4 sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <div><h2>Staff performance</h2><p className="mt-1 text-xs text-muted-foreground">Completed sales by team member</p></div>
          <Users className="h-4 w-4 text-[var(--dashboard-accent)]" />
        </div>
      </div>
      <div className="hidden grid-cols-[minmax(220px,1fr)_150px_110px_150px] gap-4 border-b bg-[var(--dashboard-surface-subtle)] px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground md:grid">
        <span>Team member</span>
        <span className="text-right">Sales</span>
        <span className="text-right">Transactions</span>
        <span className="text-right">Average sale</span>
      </div>
      <div className="divide-y">
        {staff.map((person) => {
          const hasSales = person.transactions > 0

          return (
            <div
              key={person.id}
              className="grid gap-3 px-4 py-3 transition-colors hover:bg-[var(--dashboard-surface-subtle)] sm:px-5 md:grid-cols-[minmax(220px,1fr)_150px_110px_150px] md:items-center md:gap-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--dashboard-accent-soft-border)] bg-[var(--dashboard-accent-soft)] text-xs font-bold uppercase text-[var(--dashboard-accent-strong)]">
                  {person.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold">{person.name}</p>
                    {person.topPerformer && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--dashboard-accent-soft-border)] bg-[var(--dashboard-accent-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--dashboard-accent-strong)]">
                        <Award className="h-3 w-3" /> Top
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">Rank #{person.ranking}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 md:contents">
                <div className="min-w-0 md:text-right">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground md:hidden">Sales</p>
                  <p className={`mt-0.5 truncate text-sm font-semibold md:mt-0 ${hasSales ? '' : 'text-muted-foreground'}`}>
                    {formatCurrency(person.totalSales, currency)}
                  </p>
                </div>
                <div className="md:text-right">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground md:hidden">Sales count</p>
                  <p className={`mt-0.5 text-sm font-semibold md:mt-0 ${hasSales ? '' : 'text-muted-foreground'}`}>
                    {formatNumber(person.transactions)}
                  </p>
                </div>
                <div className="min-w-0 md:text-right">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground md:hidden">Average</p>
                  <p className={`mt-0.5 truncate text-sm font-semibold md:mt-0 ${hasSales ? '' : 'text-muted-foreground'}`}>
                    {formatCurrency(person.avgSale, currency)}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </article>
  )
}
