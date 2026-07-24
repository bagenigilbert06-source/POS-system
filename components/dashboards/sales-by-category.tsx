'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { formatCurrency, formatNumber } from '@/lib/utils/format'

interface SalesByCategoryProps {
  data: Array<{
    category: string
    revenue: number
    quantity: number
  }>
  currency: string
}

const COLORS = ['#ffda32', '#e42527', '#00b4d8', '#90e0ef', '#0077b6', '#001d3d', '#ffc300', '#ff006e']

export function SalesByCategoryChart({ data, currency }: SalesByCategoryProps) {
  const chartData = data.length > 0 ? data : [{ category: 'No data', revenue: 1, quantity: 0 }]

  return (
    <div className="overflow-hidden rounded-xl border border-[#dfe3ea] bg-white shadow-[0_1px_2px_rgba(16,24,40,.03)]">
      <div className="border-b border-[#edf0f4] px-5 py-4 sm:px-6">
        <h2 className="text-[0.95rem] font-bold text-[#101828]">Sales by Category</h2>
        <p className="mt-1 text-xs text-[#7b8495]">Revenue and quantity breakdown by product category</p>
      </div>
      <div className="p-4 sm:p-6">
        {chartData[0].category === 'No data' ? (
          <div className="flex h-64 items-center justify-center text-sm text-[#8a94a5]">
            No sales data available for today
          </div>
        ) : (
          <div className="space-y-4">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="revenue"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ category, value }) => `${category}: ${formatCurrency(value, currency)}`}
                >
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => formatCurrency(value, currency)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 border-t border-[#edf0f4] pt-4">
              {chartData.map((item, idx) => (
                <div key={item.category} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div 
                      className="h-3 w-3 rounded-full" 
                      style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                    />
                    <span className="text-[#667085]">{item.category}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-[#101828]">{formatCurrency(item.revenue, currency)}</p>
                    <p className="text-xs text-[#8a94a5]">{formatNumber(item.quantity)} units</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
