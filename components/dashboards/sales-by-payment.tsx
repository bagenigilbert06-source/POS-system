'use client'

import { PieChart, Pie, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { formatCurrency, formatNumber } from '@/lib/utils/format'

interface SalesByPaymentProps {
  data: Array<{
    method: string
    transactions: number
    amount: number
  }>
  currency: string
}

const COLORS = ['#ffda32', '#e42527', '#00b4d8', '#90e0ef', '#0077b6']

function formatMethod(method: string) {
  return method
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function SalesByPaymentChart({ data, currency }: SalesByPaymentProps) {
  const chartData = data.length > 0 ? data : [{ method: 'cash', transactions: 0, amount: 0 }]

  return (
    <div className="overflow-hidden rounded-xl border border-[#dfe3ea] bg-white shadow-[0_1px_2px_rgba(16,24,40,.03)]">
      <div className="border-b border-[#edf0f4] px-5 py-4 sm:px-6">
        <h2 className="text-[0.95rem] font-bold text-[#101828]">Sales by Payment Method</h2>
        <p className="mt-1 text-xs text-[#7b8495]">Breakdown by payment method today</p>
      </div>
      <div className="p-4 sm:p-6">
        {chartData[0].method === 'none' && chartData[0].transactions === 0 ? (
          <div className="flex h-64 items-center justify-center text-sm text-[#8a94a5]">
            No payment data available
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative mx-auto h-[250px] max-w-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData} dataKey="amount" nameKey="method" innerRadius={70} outerRadius={105} paddingAngle={2} stroke="none">
                    {chartData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #d9dce3' }} formatter={(value) => formatCurrency(Number(value ?? 0), currency)} labelFormatter={(label) => formatMethod(String(label ?? ''))} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-xs text-[#8a94a5]">Payment mix</span><strong className="mt-1 text-sm tabular-nums text-[#101828]">{formatCurrency(chartData.reduce((sum, item) => sum + item.amount, 0), currency)}</strong></div>
            </div>
            <div className="space-y-2 border-t border-[#edf0f4] pt-4">
              {chartData.map((item, idx) => (
                <div key={item.method} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div 
                      className="h-3 w-3 rounded-full" 
                      style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                    />
                    <span className="text-[#667085]">{formatMethod(item.method)}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-[#101828]">{formatCurrency(item.amount, currency)}</p>
                    <p className="text-xs text-[#8a94a5]">{formatNumber(item.transactions)} transactions · {chartData.reduce((sum, row) => sum + row.amount, 0) ? ((item.amount / chartData.reduce((sum, row) => sum + row.amount, 0)) * 100).toFixed(1) : '0.0'}%</p>
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
