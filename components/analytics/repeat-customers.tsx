'use client'

import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ShoppingBag, Percent } from 'lucide-react'

interface RepeatData {
  visits: string
  count: number
  percentage: number
}

interface RepeatCustomersProps {
  data: RepeatData[]
}

export function RepeatCustomers({ data }: RepeatCustomersProps) {
  if (!data.length) {
    return (
      <article className="app-panel overflow-hidden">
        <div className="border-b px-4 py-4 sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <div><h2 className="font-bold">Repeat customers</h2><p className="mt-1 text-sm text-muted-foreground">Customer visit frequency distribution</p></div>
            <ShoppingBag className="h-5 w-5 text-primary" />
          </div>
        </div>
        <div className="flex h-[280px] items-center justify-center text-center">
          <div><p className="text-sm font-semibold">No repeat data</p><p className="text-xs text-muted-foreground mt-1">Analyze after multiple customer purchases</p></div>
        </div>
      </article>
    )
  }

  const summary = data.map((d) => `${d.visits}: ${d.count} customers (${d.percentage}%)`).join('; ')

  return (
    <article className="app-panel overflow-hidden">
      <div className="border-b px-4 py-4 sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <div><h2 className="font-bold">Repeat customers</h2><p className="mt-1 text-sm text-muted-foreground">Customer visit frequency distribution</p></div>
          <ShoppingBag className="h-5 w-5 text-primary" />
        </div>
      </div>
      <p className="sr-only">Repeat customer summary: {summary}</p>
      <div className="h-[280px] px-2 pb-3 pt-5 sm:h-[320px] sm:px-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 12, right: 8, left: -8, bottom: 0 }} barCategoryGap="40%">
            <XAxis dataKey="visits" axisLine={false} tickLine={false} tick={{ fill: 'var(--dashboard-chart-tick)', fontSize: 12 }} dy={8} />
            <YAxis axisLine={false} tickLine={false} tickCount={2} tick={{ fill: 'var(--dashboard-chart-tick)', fontSize: 11 }} />
            <Tooltip 
              cursor={{ fill: 'rgb(255 122 0 / .10)' }} 
              contentStyle={{ background: '#1d1d1f', color: '#fff', border: '1px solid #333', borderRadius: 8, boxShadow: '0 12px 28px rgb(0 0 0 / .22)', fontSize: 12 }}
              formatter={(value) => [value, 'Customers']}
              labelFormatter={(label) => `${label} visits`}
            />
            <Bar dataKey="count" fill="#ff7a00" radius={[4, 4, 0, 0]} maxBarSize={26} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </article>
  )
}
