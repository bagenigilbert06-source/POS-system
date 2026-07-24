'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { formatCurrency } from '@/lib/utils/format'

interface ProfitTrendChartProps {
  data: Array<{
    date: string
    revenue: number
    expenses: number
    profit: number
  }>
  currency: string
}

export function ProfitTrendChart({ data, currency }: ProfitTrendChartProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#dfe3ea] bg-white shadow-[0_1px_2px_rgba(16,24,40,.03)]">
      <div className="border-b border-[#edf0f4] px-5 py-4 sm:px-6">
        <h2 className="text-[0.95rem] font-bold text-[#101828]">Profit Trend</h2>
        <p className="mt-1 text-xs text-[#7b8495]">Revenue, expenses, and profit progression</p>
      </div>
      <div className="p-4 sm:p-6">
        {data.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-sm text-[#8a94a5]">
            No financial data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#edf0f4" />
              <XAxis 
                dataKey="date" 
                stroke="#8a94a5"
                tick={{ fontSize: 12 }}
              />
              <YAxis stroke="#8a94a5" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #d9dce3' }}
                formatter={(value: any, name: string) => {
                  return [formatCurrency(value, currency), name.charAt(0).toUpperCase() + name.slice(1)]
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="#00b4d8" 
                dot={{ fill: '#00b4d8', r: 4 }}
                activeDot={{ r: 6 }}
                strokeWidth={2}
              />
              <Line 
                type="monotone" 
                dataKey="expenses" 
                stroke="#e42527" 
                dot={{ fill: '#e42527', r: 4 }}
                activeDot={{ r: 6 }}
                strokeWidth={2}
              />
              <Line 
                type="monotone" 
                dataKey="profit" 
                stroke="#00b86b" 
                dot={{ fill: '#00b86b', r: 4 }}
                activeDot={{ r: 6 }}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
