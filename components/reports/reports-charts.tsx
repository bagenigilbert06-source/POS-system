'use client'

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatCurrency } from '@/lib/utils/format'

interface ReportsChartsProps {
  monthlyData: { month: string; revenue: number; count: number }[]
  paymentData: { method: string; amount: number; transactions: number }[]
  currency: string
}

function label(value: string) {
  return value.replace(/[_-]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function ReportsCharts({ monthlyData, paymentData, currency }: ReportsChartsProps) {
  const paymentChartData = paymentData.slice(0, 6).map((item) => ({ ...item, label: label(item.method) }))
  const revenueSummary = monthlyData.map((item) => `${item.month}: ${formatCurrency(item.revenue, currency)}`).join('; ')
  const paymentSummary = paymentChartData.map((item) => `${item.label}: ${formatCurrency(item.amount, currency)}`).join('; ')

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,.65fr)]" aria-label="Report charts">
      <article className="app-panel overflow-hidden">
        <div className="border-b px-4 py-4 sm:px-5"><h2 className="font-bold">Sales trend</h2><p className="mt-1 text-sm text-muted-foreground">Completed sales by month.</p></div>
        <p className="sr-only">Sales trend summary. {revenueSummary || 'No completed sales in this period.'}</p>
        {monthlyData.some((item) => item.revenue > 0) ? (
          <div className="h-[280px] px-2 pb-3 pt-5 sm:h-[320px] sm:px-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--dashboard-chart-grid)" strokeDasharray="3 5" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'var(--dashboard-chart-tick)', fontSize: 12 }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--dashboard-chart-tick)', fontSize: 11 }} tickFormatter={(value) => new Intl.NumberFormat('en-KE', { notation: 'compact' }).format(value)} />
                <Tooltip cursor={{ fill: 'var(--dashboard-surface-subtle)' }} contentStyle={{ background: 'var(--dashboard-chart-tooltip)', color: 'var(--dashboard-text)', border: '1px solid var(--dashboard-border)', borderRadius: 10, boxShadow: '0 12px 28px rgb(0 0 0 / .18)', fontSize: 12 }} formatter={(value) => [formatCurrency(Number(value), currency), 'Sales']} />
                <Bar dataKey="revenue" fill="var(--dashboard-chart-revenue)" radius={[5, 5, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : <ChartEmpty title="No sales in this period" detail="Complete a sale and the monthly trend will appear here." />}
      </article>

      <article className="app-panel overflow-hidden">
        <div className="border-b px-4 py-4 sm:px-5"><h2 className="font-bold">Payment methods</h2><p className="mt-1 text-sm text-muted-foreground">How completed sales were paid.</p></div>
        <p className="sr-only">Payment method summary. {paymentSummary || 'No payment activity in this period.'}</p>
        {paymentChartData.length ? (
          <div className="h-[280px] px-2 pb-3 pt-5 sm:h-[320px] sm:px-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={paymentChartData} layout="vertical" margin={{ top: 4, right: 16, left: 12, bottom: 0 }}>
                <CartesianGrid horizontal={false} stroke="var(--dashboard-chart-grid)" strokeDasharray="3 5" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: 'var(--dashboard-chart-tick)', fontSize: 11 }} tickFormatter={(value) => new Intl.NumberFormat('en-KE', { notation: 'compact' }).format(value)} />
                <YAxis type="category" dataKey="label" axisLine={false} tickLine={false} width={72} tick={{ fill: 'var(--dashboard-chart-tick)', fontSize: 12 }} />
                <Tooltip cursor={{ fill: 'var(--dashboard-surface-subtle)' }} contentStyle={{ background: 'var(--dashboard-chart-tooltip)', color: 'var(--dashboard-text)', border: '1px solid var(--dashboard-border)', borderRadius: 10, boxShadow: '0 12px 28px rgb(0 0 0 / .18)', fontSize: 12 }} formatter={(value) => [formatCurrency(Number(value), currency), 'Sales']} />
                <Bar dataKey="amount" fill="var(--dashboard-chart-secondary)" stroke="var(--dashboard-highlight)" strokeWidth={1} radius={[0, 5, 5, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : <ChartEmpty title="No payment activity" detail="Payment methods will be compared after a completed sale." />}
      </article>
    </section>
  )
}

function ChartEmpty({ title, detail }: { title: string; detail: string }) {
  return <div className="flex h-[280px] flex-col items-center justify-center px-6 text-center"><p className="text-sm font-semibold">{title}</p><p className="mt-1 max-w-xs text-sm text-muted-foreground">{detail}</p></div>
}
