'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import * as echarts from 'echarts/core'
import { BarChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([BarChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer])

interface OperatingChartProps {
  data: Array<{ date: string; revenue: number; expenses: number }>
  currency: string
}

const RANGES = [
  { value: 1, label: 'Today' },
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
] as const

function compact(value: number, currency: string) {
  const symbols: Record<string, string> = {
    KES: 'Ksh',
    USD: '$',
    EUR: '€',
    GBP: '£',
    UGX: 'USh',
    TZS: 'TSh',
    RWF: 'RF',
  }
  const absolute = Math.abs(value)
  const scale =
    absolute >= 1_000_000_000
      ? { divisor: 1_000_000_000, suffix: 'B' }
      : absolute >= 1_000_000
        ? { divisor: 1_000_000, suffix: 'M' }
        : absolute >= 1_000
          ? { divisor: 1_000, suffix: 'K' }
          : { divisor: 1, suffix: '' }
  const scaled = value / scale.divisor
  const amount = Number.isInteger(scaled) ? String(scaled) : scaled.toFixed(1).replace(/\.0$/, '')

  // Avoid Intl compact-currency formatting here. Its output differs between
  // Node's and browsers' ICU data, which makes the server HTML impossible to
  // hydrate reliably.
  return `${symbols[currency] ?? currency} ${amount}${scale.suffix}`
}

/** Small dot + label used for the Sales / Expenses key above the chart. */
function LegendKey({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--dashboard-muted)]">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  )
}

export function OperatingChart({ data, currency }: OperatingChartProps) {
  const [range, setRange] = useState<1 | 7 | 30>(30)
  const chartRef = useRef<HTMLDivElement>(null)

  const chartData = useMemo(() => data.slice(-range).map((point) => ({
    ...point,
    label: new Date(`${point.date}T12:00:00`).toLocaleDateString('en-KE', range === 7 ? { weekday: 'short', day: 'numeric' } : { day: 'numeric', month: 'short' }),
    fullDate: new Date(`${point.date}T12:00:00`).toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
  })), [data, range])

  const hasData = chartData.some((point) => point.revenue > 0 || point.expenses > 0)
  const periodLabel = range === 1 ? 'today' : `the last ${range} days`
  const periodRevenue = chartData.reduce((sum, point) => sum + point.revenue, 0)
  const periodExpenses = chartData.reduce((sum, point) => sum + point.expenses, 0)
  const periodNet = periodRevenue - periodExpenses

  useEffect(() => {
    if (!chartRef.current) return
    const chart = echarts.init(chartRef.current)
    chart.setOption({
      animation: false,
      color: ['#f97316', '#2563eb'],
      grid: { left: 58, right: 14, top: 18, bottom: 28 },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'line', lineStyle: { color: '#cbd5e1', type: 'dashed' } },
        backgroundColor: '#fff',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        textStyle: { color: '#0f172a', fontFamily: 'var(--font-inter)', fontSize: 12 },
        formatter: (params: Array<{ axisValue: string; seriesName: string; value: number; dataIndex: number }>) => {
          const rows = params.map((item) => `${item.seriesName}: ${compact(Number(item.value), currency)}`)
          const date = params[0] ? chartData[params[0].dataIndex]?.fullDate ?? params[0].axisValue : ''
          return `<strong>${date}</strong><br/>${rows.join('<br/>')}`
        },
      },
      legend: { show: false },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: chartData.map((point) => point.label),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#64748b', fontFamily: 'var(--font-inter)', fontSize: 11, margin: 12 },
      },
      yAxis: {
        type: 'value',
        splitNumber: 3,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#64748b', fontFamily: 'var(--font-inter)', fontSize: 10, formatter: (value: number) => compact(value, currency) },
        splitLine: { lineStyle: { color: '#e5e9ef', type: 'dashed' } },
      },
      series: [
        { name: 'Sales', type: 'bar', barMaxWidth: 28, barGap: '8%', data: chartData.map((point) => point.revenue), itemStyle: { borderRadius: [6, 6, 0, 0] } },
        { name: 'Expenses', type: 'bar', barMaxWidth: 28, data: chartData.map((point) => point.expenses), itemStyle: { borderRadius: [6, 6, 0, 0] } },
      ],
    })
    const resize = () => chart.resize()
    window.addEventListener('resize', resize)
    return () => { window.removeEventListener('resize', resize); chart.dispose() }
  }, [chartData, currency])

  return (
    <div className="rounded-2xl border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] p-5">
      {/* Header: legend on the left, range switcher on the right */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <LegendKey color="var(--dashboard-chart-revenue)" label="Sales" />
          <LegendKey color="var(--dashboard-chart-secondary)" label="Expenses" />
          <span className={`text-xs font-semibold tabular-nums ${periodNet >= 0 ? 'text-[#168a5b]' : 'text-[#c9564a]'}`}>
            {periodNet >= 0 ? 'Net profit' : 'Net loss'} {compact(Math.abs(periodNet), currency)}
          </span>
        </div>
        <div
          role="tablist"
          aria-label="Chart period"
          className="flex rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface-subtle)] p-1"
        >
          {RANGES.map(({ value, label: rangeLabel }) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={range === value}
              onClick={() => setRange(value)}
              className={
                range === value
                  ? 'rounded-md bg-[var(--dashboard-surface)] px-3 py-1.5 text-xs font-bold text-[var(--dashboard-text)] shadow-sm'
                  : 'rounded-md px-3 py-1.5 text-xs font-semibold text-[var(--dashboard-muted)] transition-colors hover:text-[var(--dashboard-text)]'
              }
            >
              {rangeLabel}
            </button>
          ))}
        </div>
      </div>

      <div
        className="relative mt-4 h-[260px] min-h-[260px] min-w-0 w-full sm:h-[280px] sm:min-h-[280px]"
        role="img"
        aria-label={`Sales and expenses over ${periodLabel}`}
      >
        {!hasData && (
          <div className="flex h-full items-center justify-center">
            <div className="max-w-sm rounded-lg border border-dashed border-[var(--dashboard-border)] px-5 py-4 text-center">
              <p className="text-sm font-semibold text-[var(--dashboard-text)]">No activity for {periodLabel}</p>
              <p className="mt-1 text-xs leading-5 text-[var(--dashboard-muted)]">
                Sales and expenses will appear here after they are recorded.
              </p>
            </div>
          </div>
        )}

        <div ref={chartRef} className="h-full w-full" role="img" aria-label={`Sales and expenses over ${periodLabel}`} />
      </div>
    </div>
  )
}
