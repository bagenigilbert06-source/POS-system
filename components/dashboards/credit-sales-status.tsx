'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { formatCurrency } from '@/lib/utils/format'

interface CreditSalesStatusChartProps {
  status: Array<{
    status: string
    count: number
    totalAmount: number
    amountPaid: number
  }>
  currency: string
}

const STATUS_COLORS: Record<string, string> = {
  'paid': '#00b4d8',
  'partial': '#ffda32',
  'unpaid': '#e42527'
}

function statusLabel(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

export function CreditSalesStatusChart({ status, currency }: CreditSalesStatusChartProps) {
  const chartData = status.length > 0 ? status : [{ status: 'unpaid', count: 0, totalAmount: 0, amountPaid: 0 }]

  return (
    <div className="overflow-hidden rounded-xl border border-[#dfe3ea] bg-white shadow-[0_1px_2px_rgba(16,24,40,.03)]">
      <div className="border-b border-[#edf0f4] px-5 py-4 sm:px-6">
        <h2 className="text-[0.95rem] font-bold text-[#101828]">Credit Sales Status</h2>
        <p className="mt-1 text-xs text-[#7b8495]">Credit sales breakdown by payment status</p>
      </div>
      <div className="p-4 sm:p-6">
        {chartData[0].status === 'none' ? (
          <div className="flex h-64 items-center justify-center text-sm text-[#8a94a5]">
            No credit sales data available
          </div>
        ) : (
          <div className="space-y-4">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#edf0f4" />
                <XAxis dataKey="status" stroke="#8a94a5" tickFormatter={statusLabel} />
                <YAxis stroke="#8a94a5" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #d9dce3' }}
                  formatter={(value: any, name: string) => {
                    if (name === 'totalAmount') return [formatCurrency(value, currency), 'Total Amount']
                    if (name === 'amountPaid') return [formatCurrency(value, currency), 'Amount Paid']
                    return [value, 'Count']
                  }}
                  labelFormatter={(label) => statusLabel(label)}
                />
                <Bar dataKey="totalAmount" fill="#ffda32">
                  {chartData.map((item, index) => (
                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[item.status] || '#8a94a5'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="space-y-2 border-t border-[#edf0f4] pt-4">
              {chartData.map((item) => (
                <div key={item.status} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div 
                      className="h-3 w-3 rounded-full" 
                      style={{ backgroundColor: STATUS_COLORS[item.status] || '#8a94a5' }}
                    />
                    <span className="text-[#667085]">{statusLabel(item.status)}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-[#101828]">{formatCurrency(item.totalAmount, currency)}</p>
                    <p className="text-xs text-[#8a94a5]">{item.count} invoices</p>
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
