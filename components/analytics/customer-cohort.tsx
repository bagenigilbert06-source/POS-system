'use client'

import { Users, TrendingUp, TrendingDown } from 'lucide-react'

interface CohortData {
  period: string
  newCustomers: number
  retained: number
  churn: number
  retention: number
}

interface CustomerCohortProps {
  cohorts: CohortData[]
}

export function CustomerCohort({ cohorts }: CustomerCohortProps) {
  if (!cohorts.length) {
    return (
      <article className="app-panel overflow-hidden">
        <div className="border-b px-4 py-4 sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <div><h2 className="font-bold">Customer cohorts</h2><p className="mt-1 text-sm text-muted-foreground">Monthly acquisition & retention analysis</p></div>
            <Users className="h-5 w-5 text-primary" />
          </div>
        </div>
        <div className="flex h-40 items-center justify-center text-center">
          <div><p className="text-sm font-semibold">No cohort data</p><p className="text-xs text-muted-foreground mt-1">Data will appear after 2+ months of sales</p></div>
        </div>
      </article>
    )
  }

  return (
    <article className="app-panel overflow-hidden">
      <div className="border-b px-4 py-4 sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <div><h2 className="font-bold">Customer cohorts</h2><p className="mt-1 text-sm text-muted-foreground">Monthly acquisition & retention analysis</p></div>
          <Users className="h-5 w-5 text-primary" />
        </div>
      </div>
      <div className="divide-y">
        {cohorts.map((cohort) => (
          <div key={cohort.period} className="px-4 py-4 sm:px-5">
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold text-sm">{cohort.period}</p>
              <span className="inline-flex items-center gap-1 rounded-lg bg-accent/10 px-2 py-1 text-xs font-medium text-accent">
                {cohort.retention}% retained
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">New</p>
                <p className="font-bold text-sm mt-1">{cohort.newCustomers}</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-green-50/30 dark:bg-green-950/20">
                <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><TrendingUp className="h-3 w-3" /> Retained</p>
                <p className="font-bold text-sm mt-1">{cohort.retained}</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-red-50/30 dark:bg-red-950/20">
                <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><TrendingDown className="h-3 w-3" /> Churned</p>
                <p className="font-bold text-sm mt-1">{cohort.churn}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </article>
  )
}
