'use client'

import { Users, TrendingUp, Award } from 'lucide-react'
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
            <div><h2 className="font-bold">Staff performance</h2><p className="mt-1 text-sm text-muted-foreground">Cashier and staff KPIs</p></div>
            <Users className="h-5 w-5 text-primary" />
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
          <div><h2 className="font-bold">Staff performance</h2><p className="mt-1 text-sm text-muted-foreground">Cashier and staff KPIs</p></div>
          <Users className="h-5 w-5 text-primary" />
        </div>
      </div>
      <div className="divide-y">
        {staff.map((person) => (
          <div key={person.id} className="px-4 py-4 sm:px-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center text-sm font-bold text-accent-foreground">
                  {person.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm">{person.name}</p>
                    {person.topPerformer && (
                      <Award className="h-4 w-4 text-yellow-500" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">#{person.ranking} performer</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-muted/50 p-2">
                <p className="text-xs text-muted-foreground">Sales</p>
                <p className="font-bold text-sm mt-1">{formatCurrency(person.totalSales, currency)}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-2">
                <p className="text-xs text-muted-foreground">Transactions</p>
                <p className="font-bold text-sm mt-1">{formatNumber(person.transactions)}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-2">
                <p className="text-xs text-muted-foreground">Avg Sale</p>
                <p className="font-bold text-sm mt-1">{formatCurrency(person.avgSale, currency)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </article>
  )
}
