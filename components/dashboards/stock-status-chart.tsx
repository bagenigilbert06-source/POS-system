'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts'

interface StockStatusChartProps {
  stockStatus: {
    inStock: number
    lowStock: number
    outOfStock: number
  }
}

export function StockStatusChart({ stockStatus }: StockStatusChartProps) {
  const data = [
    { status: 'In Stock', count: stockStatus.inStock, fill: '#00b4d8' },
    { status: 'Low Stock', count: stockStatus.lowStock, fill: '#ffda32' },
    { status: 'Out of Stock', count: stockStatus.outOfStock, fill: '#e42527' }
  ]

  return (
    <div className="overflow-hidden rounded-xl border border-[#dfe3ea] bg-white shadow-[0_1px_2px_rgba(16,24,40,.03)]">
      <div className="border-b border-[#edf0f4] px-5 py-4 sm:px-6">
        <h2 className="text-[0.95rem] font-bold text-[#101828]">Stock Status Overview</h2>
        <p className="mt-1 text-xs text-[#7b8495]">Number of products by stock status</p>
      </div>
      <div className="p-4 sm:p-6">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#edf0f4" />
            <XAxis dataKey="status" stroke="#8a94a5" />
            <YAxis stroke="#8a94a5" />
            <Tooltip 
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #d9dce3' }}
              formatter={(value: any) => `${value} products`}
            />
            <Bar dataKey="count" name="Products">
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-6 grid grid-cols-3 gap-4 border-t border-[#edf0f4] pt-4">
          {data.map((item) => (
            <div key={item.status} className="text-center">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: `${item.fill}20` }}>
                <span className="text-2xl font-bold" style={{ color: item.fill }}>{item.count}</span>
              </div>
              <p className="mt-2 text-sm font-semibold text-[#667085]">{item.status}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
