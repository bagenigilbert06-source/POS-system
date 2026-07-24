'use client'

import { TrendingDown } from 'lucide-react'

interface SlowMoversTableProps {
  products: Array<{
    id: string
    name: string
    sku: string
    stock: number
  }>
}

export function SlowMoversTable({ products }: SlowMoversTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#dfe3ea] bg-white shadow-[0_1px_2px_rgba(16,24,40,.03)]">
      <div className="border-b border-[#edf0f4] px-5 py-4 sm:px-6">
        <div className="flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-[#ffda32]" />
          <div>
            <h2 className="text-[0.95rem] font-bold text-[#101828]">Slow Movers</h2>
            <p className="mt-1 text-xs text-[#7b8495]">Products not sold in 60+ days</p>
          </div>
        </div>
      </div>
      
      {products.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-sm text-[#8a94a5]">
          No slow-moving products identified
        </div>
      ) : (
        <div className="divide-y divide-[#edf0f4]">
          {products.map((product) => (
            <div key={product.id} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-[#fafbfc] sm:px-6">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#101828]">{product.name}</p>
                <p className="mt-1 text-xs text-[#8a94a5]">SKU: {product.sku}</p>
              </div>
              <span className="inline-flex items-center rounded-full bg-[#fff7d1] px-3 py-1 text-xs font-semibold text-[#6b5200]">
                {product.stock} in stock
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
