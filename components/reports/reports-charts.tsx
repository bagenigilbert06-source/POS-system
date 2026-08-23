'use client'

import { Area, CartesianGrid, Cell, ComposedChart, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CreditCard, TrendingUp } from 'lucide-react'
import { formatCurrency, formatNumber } from '@/lib/utils/format'
import { paymentShareLabel } from '@/lib/reports/report-rules'

type TrendPoint = { label: string; revenue: number; refunds: number; expenses: number; netProfit: number; count: number }
interface ReportsChartsProps {
  dailyData: Array<TrendPoint & { date: string }>
  monthlyData: Array<Omit<TrendPoint, 'label'> & { month: string }>
  paymentData: { method: string; amount: number; transactions: number }[]
  currency: string
  periodLabel: string
}
const PAYMENT_COLORS = ['#b7791f', '#16865a', '#2563eb', '#7c3aed', '#db2777', '#64748b']

function paymentLabel(value: string) {
  const normalized = value.toLowerCase().replace(/[^a-z0-9]+/g, '_')
  if (normalized === 'mpesa' || normalized === 'm_pesa') return 'M-Pesa'
  return value.replace(/[_-]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function compact(value: number) {
  return new Intl.NumberFormat('en-KE', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

function total(points: TrendPoint[], key: 'revenue' | 'expenses' | 'refunds' | 'netProfit' | 'count') {
  return points.reduce((sum, point) => sum + point[key], 0)
}

export function ReportsCharts({ dailyData, monthlyData, paymentData, currency, periodLabel }: ReportsChartsProps) {
  const chartData: TrendPoint[] = dailyData.length === 62 && monthlyData.length > 2 ? monthlyData.map((point) => ({ ...point, label: point.month })) : dailyData

  const revenue = total(chartData, 'revenue')
  const expenses = total(chartData, 'expenses')
  const refunds = total(chartData, 'refunds')
  const netProfit = total(chartData, 'netProfit')
  const transactions = total(chartData, 'count')
  const hasActivity = chartData.some((point) => point.revenue || point.expenses || point.refunds)
  const paymentChartData = paymentData.slice(0, 6).map((item, index) => ({ ...item, label: paymentLabel(item.method), color: PAYMENT_COLORS[index % PAYMENT_COLORS.length] }))
  const paymentTotal = paymentChartData.reduce((sum, item) => sum + item.amount, 0)
  const primaryPayment = paymentChartData[0]

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,.75fr)]" aria-label="Report charts">
      <article className="app-panel report-paint-boundary overflow-hidden">
        <div className="flex flex-col gap-4 border-b px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--dashboard-accent-soft-border)] bg-[var(--dashboard-accent-soft)] text-[var(--dashboard-accent)]"><TrendingUp className="h-4 w-4" aria-hidden="true" /></span>
            <div><h2>Sales performance</h2><p className="mt-0.5 text-xs text-muted-foreground">Net sales against operating expenses.</p></div>
          </div>
          <span className="rounded-lg border bg-[var(--dashboard-surface-subtle)] px-3 py-2 text-[11px] font-semibold text-muted-foreground">{periodLabel}</span>
        </div>

        <div className="grid grid-cols-2 divide-x border-b bg-muted/20 sm:grid-cols-4">
          <Insight label="Net sales" value={formatCurrency(revenue, currency)} />
          <Insight label="Operating expenses" value={formatCurrency(expenses, currency)} />
          <Insight label="Net position" value={formatCurrency(netProfit, currency)} tone={netProfit >= 0 ? 'positive' : 'negative'} />
          <Insight label="Transactions" value={formatNumber(transactions)} />
        </div>

        {hasActivity ? <>
          <p className="sr-only">{periodLabel}: net sales {formatCurrency(revenue, currency)}, expenses {formatCurrency(expenses, currency)}, refunds {formatCurrency(refunds, currency)}.</p>
          <div className="h-[300px] px-2 pb-2 pt-5 sm:h-[330px] sm:px-4">
            <ResponsiveContainer width="100%" height="100%" debounce={100}><ComposedChart data={chartData} margin={{ top: 8, right: 12, left: -5, bottom: 0 }} accessibilityLayer={false}>
              <defs><linearGradient id="reportSalesArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--dashboard-chart-revenue)" stopOpacity={0.3} /><stop offset="72%" stopColor="var(--dashboard-chart-revenue)" stopOpacity={0.06} /><stop offset="100%" stopColor="var(--dashboard-chart-revenue)" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid vertical={false} stroke="var(--dashboard-chart-grid)" strokeDasharray="3 5" />
              <XAxis dataKey="label" axisLine={false} tickLine={false} minTickGap={28} tick={{ fill: 'var(--dashboard-chart-tick)', fontSize: 10 }} dy={9} />
              <YAxis axisLine={false} tickLine={false} width={54} tick={{ fill: 'var(--dashboard-chart-tick)', fontSize: 10 }} tickFormatter={(value) => compact(Number(value))} />
              <Tooltip content={<TrendTooltip currency={currency} />} cursor={{ stroke: 'var(--dashboard-muted)', strokeDasharray: '4 4', opacity: 0.55 }} isAnimationActive={false} />
              <Area type="monotone" dataKey="revenue" name="Net sales" stroke="var(--dashboard-chart-revenue)" strokeWidth={2.5} fill="url(#reportSalesArea)" dot={false} activeDot={{ r: 4, stroke: 'var(--dashboard-surface)', strokeWidth: 2 }} isAnimationActive={false} />
              {expenses > 0 && <Line type="monotone" dataKey="expenses" name="Expenses" stroke="var(--dashboard-chart-secondary)" strokeWidth={2} strokeDasharray="5 4" dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />}
            </ComposedChart></ResponsiveContainer>
          </div>
          <div className="flex flex-wrap items-center gap-5 border-t px-5 py-3 text-[11px] font-medium text-muted-foreground"><span className="inline-flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-[var(--dashboard-chart-revenue)]" />Net sales</span><span className="inline-flex items-center gap-2"><i className="h-0.5 w-3 bg-[var(--dashboard-chart-secondary)]" />Expenses</span>{refunds > 0 && <span className="ml-auto tabular-nums">Refunds: {formatCurrency(refunds, currency)}</span>}</div>
        </> : <ChartEmpty title="No activity in this period" detail="Sales and expenses will appear here as they are recorded." />}
      </article>

      <article className="app-panel report-paint-boundary overflow-hidden">
        <div className="flex items-start justify-between gap-4 border-b px-4 py-4 sm:px-5"><div><h2>Payment mix</h2><p className="mt-1 text-xs text-muted-foreground">Collected sales by payment method.</p></div><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--dashboard-accent-soft-border)] bg-[var(--dashboard-accent-soft)] text-[var(--dashboard-accent)]"><CreditCard className="h-4 w-4" aria-hidden="true" /></span></div>
        {paymentChartData.length && paymentTotal > 0 ? <div className="flex min-h-[430px] flex-col p-5">
          <div className="relative mx-auto h-[210px] w-full max-w-[270px]"><ResponsiveContainer width="100%" height="100%" debounce={100}><PieChart accessibilityLayer={false}><Pie data={paymentChartData} dataKey="amount" nameKey="label" cx="50%" cy="50%" innerRadius={58} outerRadius={84} paddingAngle={2} cornerRadius={5} stroke="var(--dashboard-surface)" strokeWidth={3} isAnimationActive={false}>{paymentChartData.map((item) => <Cell key={item.method} fill={item.color} />)}</Pie><Tooltip content={<PaymentTooltip currency={currency} total={paymentTotal} />} isAnimationActive={false} /></PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center"><span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Collected</span><span className="mt-1 max-w-[118px] truncate text-sm font-bold tabular-nums">{compact(paymentTotal)}</span></div></div>
          <div className="mt-2 divide-y">{paymentChartData.map((item) => <div key={item.method} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-2.5"><div className="flex min-w-0 items-center gap-2.5"><i className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} /><div className="min-w-0"><p className="truncate text-xs font-semibold">{item.label}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{formatNumber(item.transactions)} transactions</p></div></div><div className="text-right"><p className="text-xs font-bold tabular-nums">{formatCurrency(item.amount, currency)}</p><p className="mt-0.5 text-[10px] font-semibold text-muted-foreground tabular-nums">{paymentShareLabel(item.amount, paymentTotal)}</p></div></div>)}</div>
          {primaryPayment && <p className="mt-auto rounded-lg border bg-muted/25 px-3 py-2.5 text-xs leading-5 text-muted-foreground"><span className="font-semibold text-foreground">{primaryPayment.label}</span> leads at {paymentShareLabel(primaryPayment.amount, paymentTotal)} of collected sales.</p>}
        </div> : <ChartEmpty title="No payment activity" detail="Payment methods will be compared after a recorded sale." />}
      </article>
    </section>
  )
}

function Insight({ label, value, trend, tone }: { label: string; value: string; trend?: number | null; tone?: 'positive' | 'negative' }) {
  return <div className="min-w-0 px-4 py-3 sm:px-5"><p className="truncate text-[10px] font-medium text-muted-foreground">{label}</p><div className="mt-1 flex items-center gap-2"><p className={`truncate text-xs font-bold tabular-nums ${tone === 'positive' ? 'text-emerald-700 dark:text-emerald-400' : tone === 'negative' ? 'text-rose-600' : ''}`}>{value}</p>{trend != null && <span className={`text-[10px] font-bold tabular-nums ${trend >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600'}`}>{trend >= 0 ? '+' : ''}{trend.toFixed(1)}%</span>}</div></div>
}

function TrendTooltip({ active, payload, currency }: { active?: boolean; payload?: ReadonlyArray<{ payload?: TrendPoint }>; currency: string }) {
  const point = payload?.[0]?.payload
  if (!active || !point) return null
  return <div className="min-w-48 rounded-xl border border-[var(--dashboard-border)] bg-[var(--dashboard-chart-tooltip)] p-3 text-xs shadow-xl"><p className="font-bold">{point.label}</p><div className="mt-2 space-y-1.5"><TooltipRow label="Net sales" value={formatCurrency(point.revenue, currency)} /><TooltipRow label="Expenses" value={formatCurrency(point.expenses, currency)} /><TooltipRow label="Refunds" value={formatCurrency(point.refunds, currency)} /><TooltipRow label="Transactions" value={formatNumber(point.count)} /></div></div>
}

function TooltipRow({ label, value }: { label: string; value: string }) { return <div className="flex justify-between gap-6"><span className="text-muted-foreground">{label}</span><span className="font-bold tabular-nums">{value}</span></div> }

function PaymentTooltip({ active, payload, currency, total: paymentTotal }: { active?: boolean; payload?: ReadonlyArray<{ payload?: { label: string; amount: number; transactions: number } }>; currency: string; total: number }) {
  const point = payload?.[0]?.payload
  if (!active || !point) return null
  return <div className="min-w-44 rounded-xl border border-[var(--dashboard-border)] bg-[var(--dashboard-chart-tooltip)] p-3 text-xs shadow-xl"><p className="font-bold">{point.label}</p><p className="mt-2 font-bold tabular-nums">{formatCurrency(point.amount, currency)}</p><p className="mt-1 text-muted-foreground">{formatNumber(point.transactions)} transactions · {paymentShareLabel(point.amount, paymentTotal)}</p></div>
}

function ChartEmpty({ title, detail }: { title: string; detail: string }) { return <div className="flex h-[320px] flex-col items-center justify-center px-6 text-center"><p className="text-sm font-semibold">{title}</p><p className="mt-1 max-w-xs text-xs leading-5 text-muted-foreground">{detail}</p></div> }
