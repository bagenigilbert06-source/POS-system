'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'
import { formatCurrency } from '@/lib/utils/format'

interface SalesHourlyChartProps {
  data: Array<{
    hour: string
    transactions: number
    revenue: number
  }>
  currency: string
}

export function SalesHourlyChart({ data, currency }: SalesHourlyChartProps) {
  const chartData = data.length > 0 ? data : Array.from({ length: 24 }, (_, i) => ({
    hour: `${String(i).padStart(2, '0')}:00`,
    transactions: 0,
    revenue: 0
  }))

  return (
    <div className="overflow-hidden rounded-xl border border-[#dfe3ea] bg-white shadow-[0_1px_2px_rgba(16,24,40,.03)]">
      <div className="border-b border-[#edf0f4] px-5 py-4 sm:px-6">
        <h2 className="text-[0.95rem] font-bold text-[#101828]">Hourly Sales Pattern</h2>
        <p className="mt-1 text-xs text-[#7b8495]">Transaction count and revenue by hour today</p>
      </div>
      <div className="p-4 sm:p-6">
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#edf0f4" />
            <XAxis dataKey="hour" stroke="#8a94a5" />
            <YAxis stroke="#8a94a5" />
            <Tooltip 
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #d9dce3' }}
              formatter={(value: any, name: string) => {
                if (name === 'revenue') return [formatCurrency(value, currency), 'Revenue']
                return [value, 'Transactions']
              }}
            />
            <Legend />
            <Bar dataKey="transactions" fill="#ffda32" name="Transactions" />
            <Bar dataKey="revenue" fill="#e42527" name="Revenue" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
