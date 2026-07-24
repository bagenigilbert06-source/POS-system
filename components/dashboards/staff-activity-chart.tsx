'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts'
import { formatCurrency, formatNumber } from '@/lib/utils/format'

interface StaffActivityChartProps {
  data: Array<{
    hour: string
    activeStaff: number
    sales: number
    transactions: number
  }>
  currency: string
}

export function StaffActivityChart({ data, currency }: StaffActivityChartProps) {
  const chartData = data.length > 0 ? data : Array.from({ length: 24 }, (_, i) => ({
    hour: `${String(i).padStart(2, '0')}:00`,
    activeStaff: 0,
    sales: 0,
    transactions: 0
  }))

  const colors = ['#00b4d8', '#ffda32']

  return (
    <div className="overflow-hidden rounded-xl border border-[#dfe3ea] bg-white shadow-[0_1px_2px_rgba(16,24,40,.03)]">
      <div className="border-b border-[#edf0f4] px-5 py-4 sm:px-6">
        <h2 className="text-[0.95rem] font-bold text-[#101828]">Staff Activity Pattern</h2>
        <p className="mt-1 text-xs text-[#7b8495]">Active staff and sales by hour today</p>
      </div>
      <div className="p-4 sm:p-6">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#edf0f4" />
            <XAxis dataKey="hour" stroke="#8a94a5" />
            <YAxis stroke="#8a94a5" yAxisId="left" />
            <YAxis stroke="#8a94a5" yAxisId="right" orientation="right" />
            <Tooltip 
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #d9dce3' }}
              formatter={(value: any, name: string) => {
                if (name === 'sales') return [formatCurrency(value, currency), 'Sales']
                if (name === 'activeStaff') return [formatNumber(value), 'Staff']
                return [formatNumber(value), 'Transactions']
              }}
            />
            <Legend />
            <Bar dataKey="activeStaff" fill="#00b4d8" name="Active Staff" yAxisId="left" />
            <Bar dataKey="transactions" fill="#ffda32" name="Transactions" yAxisId="left" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
