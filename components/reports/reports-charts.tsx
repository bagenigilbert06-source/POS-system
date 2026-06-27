'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { formatCurrency } from '@/lib/utils'

interface ReportsChartsProps {
  monthlyData: { month: string; revenue: number; count: number }[]
  paymentData: { method: string; amount: number }[]
}

const COLORS = [
  'hsl(155,60%,28%)',
  'hsl(217,91%,60%)',
  'hsl(38,92%,50%)',
  'hsl(0,72%,51%)',
  'hsl(280,65%,60%)',
]

export function ReportsCharts({ monthlyData, paymentData }: ReportsChartsProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Monthly revenue bar chart */}
      <div className="metric-card">
        <div className="mb-4">
          <h3 className="text-sm font-semibold">Monthly Revenue</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Last 6 months in KES</p>
        </div>
        {monthlyData.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
            No sales data available yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,90%)" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: 'hsl(220,8%,50%)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'hsl(220,8%,50%)' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  background: 'hsl(0,0%,100%)',
                  border: '1px solid hsl(220,13%,90%)',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value: number) => [formatCurrency(value), 'Revenue']}
              />
              <Bar dataKey="revenue" fill="hsl(155,60%,28%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Payment method pie chart */}
      <div className="metric-card">
        <div className="mb-4">
          <h3 className="text-sm font-semibold">Revenue by Payment Method</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Breakdown of how customers pay</p>
        </div>
        {paymentData.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
            No sales data available yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={paymentData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                dataKey="amount"
                nameKey="method"
                label={({ method, percent }) =>
                  `${method} ${((percent ?? 0) * 100).toFixed(0)}%`
                }
                labelLine={false}
              >
                {paymentData.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: 'hsl(0,0%,100%)',
                  border: '1px solid hsl(220,13%,90%)',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value: number) => [formatCurrency(value), 'Revenue']}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(value) => (
                  <span style={{ fontSize: 12, color: 'hsl(220,8%,50%)' }}>{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Monthly transactions count */}
      <div className="metric-card lg:col-span-2">
        <div className="mb-4">
          <h3 className="text-sm font-semibold">Transaction Volume</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Number of sales per month</p>
        </div>
        {monthlyData.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
            No sales data available yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="pb-2 text-left font-medium text-muted-foreground">Month</th>
                  <th className="pb-2 text-right font-medium text-muted-foreground">Transactions</th>
                  <th className="pb-2 text-right font-medium text-muted-foreground">Revenue</th>
                  <th className="pb-2 text-right font-medium text-muted-foreground">Avg per Sale</th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.map((m) => (
                  <tr key={m.month} className="border-b last:border-0">
                    <td className="py-2.5">{m.month}</td>
                    <td className="py-2.5 text-right tabular-nums">{m.count}</td>
                    <td className="py-2.5 text-right font-medium tabular-nums">
                      {formatCurrency(m.revenue)}
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-muted-foreground">
                      {formatCurrency(m.count > 0 ? m.revenue / m.count : 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
