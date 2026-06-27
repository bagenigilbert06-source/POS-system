'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { formatCurrency } from '@/lib/utils'

interface RevenueChartProps {
  data: { date: string; revenue: string }[]
}

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric' })
}

export function RevenueChart({ data }: RevenueChartProps) {
  const chartData = data.map((d) => ({
    date: formatShortDate(d.date),
    revenue: parseFloat(d.revenue),
  }))

  return (
    <div className="metric-card">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Revenue — Last 7 Days</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Daily sales totals in KES</p>
        </div>
      </div>
      {chartData.length === 0 ? (
        <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
          No sales data yet. Start making sales on the POS terminal.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(217,91%,60%)" stopOpacity={0.15} />
                <stop offset="95%" stopColor="hsl(217,91%,60%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(210,40%,92%)" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: 'hsl(217,12%,43%)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'hsl(217,12%,43%)' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                background: 'hsl(0,0%,100%)',
                border: '1px solid hsl(210,40%,92%)',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value: any) => [value !== undefined ? formatCurrency(value) : '0', 'Revenue'] as any}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="hsl(217,91%,60%)"
              strokeWidth={2}
              fill="url(#revenueGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
