'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
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
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#edf0f4" />
                <XAxis dataKey="method" stroke="#8a94a5" tickFormatter={formatMethod} />
                <YAxis stroke="#8a94a5" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #d9dce3' }}
                  formatter={(value: any, name: string) => {
                    if (name === 'amount') return [formatCurrency(value, currency), 'Amount']
                    return [formatNumber(value), 'Transactions']
                  }}
                  labelFormatter={(label) => formatMethod(label)}
                />
                <Bar dataKey="amount" fill="#ffda32" name="Amount">
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
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
                    <p className="text-xs text-[#8a94a5]">{formatNumber(item.transactions)} transactions</p>
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
