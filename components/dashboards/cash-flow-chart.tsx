'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { formatCurrency } from '@/lib/utils/format'

interface CashFlowChartProps {
  data: {
    cashInflow: number
    cashOutflow: number
    creditSales: number
    netCashFlow: number
  }
  currency: string
}

export function CashFlowChart({ data, currency }: CashFlowChartProps) {
  const chartData = [
    { name: 'Cash Inflow', value: data.cashInflow, fill: '#00b4d8' },
    { name: 'Cash Outflow', value: data.cashOutflow, fill: '#e42527' },
    { name: 'Credit Sales', value: data.creditSales, fill: '#ffda32' }
  ]

  return (
    <div className="overflow-hidden rounded-xl border border-[#dfe3ea] bg-white shadow-[0_1px_2px_rgba(16,24,40,.03)]">
      <div className="border-b border-[#edf0f4] px-5 py-4 sm:px-6">
        <h2 className="text-[0.95rem] font-bold text-[#101828]">Cash Flow Analysis</h2>
        <p className="mt-1 text-xs text-[#7b8495]">Cash inflow, outflow, and credit sales today</p>
      </div>
      <div className="p-4 sm:p-6">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#edf0f4" />
            <XAxis dataKey="name" stroke="#8a94a5" />
            <YAxis stroke="#8a94a5" />
            <Tooltip 
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #d9dce3' }}
              formatter={(value: any) => formatCurrency(value, currency)}
            />
            <Bar dataKey="value" name="Amount">
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-6 space-y-3 border-t border-[#edf0f4] pt-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-[#00b4d8]" />
              <span className="text-[#667085]">Cash Inflow (Cash Sales)</span>
            </div>
            <p className="font-semibold text-[#101828]">{formatCurrency(data.cashInflow, currency)}</p>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-[#e42527]" />
              <span className="text-[#667085]">Cash Outflow (Expenses)</span>
            </div>
            <p className="font-semibold text-[#101828]">{formatCurrency(data.cashOutflow, currency)}</p>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-[#ffda32]" />
              <span className="text-[#667085]">Credit Sales (Non-cash)</span>
            </div>
            <p className="font-semibold text-[#101828]">{formatCurrency(data.creditSales, currency)}</p>
          </div>
          <div className="flex items-center justify-between border-t border-[#edf0f4] pt-3 text-sm font-semibold">
            <span className="text-[#667085]">Net Cash Flow</span>
            <p className={data.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}>{formatCurrency(data.netCashFlow, currency)}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
