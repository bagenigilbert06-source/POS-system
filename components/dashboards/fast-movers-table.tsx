'use client'

import { TrendingUp } from 'lucide-react'
import { formatNumber } from '@/lib/utils/format'

interface FastMoversTableProps {
  products: Array<{
    id: string
    name: string
    sku: string
    salesCount: number
  }>
}

export function FastMoversTable({ products }: FastMoversTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#dfe3ea] bg-white shadow-[0_1px_2px_rgba(16,24,40,.03)]">
      <div className="border-b border-[#edf0f4] px-5 py-4 sm:px-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-[#00b4d8]" />
          <div>
            <h2 className="text-[0.95rem] font-bold text-[#101828]">Fast Movers</h2>
            <p className="mt-1 text-xs text-[#7b8495]">Top 10 products by sales quantity</p>
          </div>
        </div>
      </div>
      
      {products.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-sm text-[#8a94a5]">
          No product sales data available
        </div>
      ) : (
        <ol className="divide-y divide-[#edf0f4]">
          {products.map((product, index) => (
            <li key={product.id} className="flex items-center gap-4 px-5 py-4 hover:bg-[#fafbfc] sm:px-6">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#00b4d8] text-xs font-bold text-white">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[#101828]">{product.name}</p>
                <p className="mt-1 text-xs text-[#8a94a5]">SKU: {product.sku}</p>
              </div>
              <span className="inline-flex items-center rounded-full bg-[#ddf2f5] px-3 py-1 text-xs font-semibold text-[#00547b]">
                {formatNumber(product.salesCount)} sold
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
