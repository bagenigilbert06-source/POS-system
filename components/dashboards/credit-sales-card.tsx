'use client'

import { formatCurrency, formatNumber } from '@/lib/utils/format'
import { AlertCircle } from 'lucide-react'

interface CreditSalesCardProps {
  data: {
    totalCreditSales: number
    creditCollected: number
    creditOutstanding: number
    uncollectedInvoices: number
  }
  currency: string
}

export function CreditSalesCard({ data, currency }: CreditSalesCardProps) {
  const collectionRate = data.totalCreditSales > 0 
    ? ((data.creditCollected / data.totalCreditSales) * 100).toFixed(1)
    : '0'

  return (
    <div className="overflow-hidden rounded-xl border border-[#dfe3ea] bg-white shadow-[0_1px_2px_rgba(16,24,40,.03)]">
      <div className="border-b border-[#edf0f4] px-5 py-4 sm:px-6">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-[#ffda32]" />
          <div>
            <h2 className="text-[0.95rem] font-bold text-[#101828]">Credit Sales Analysis</h2>
            <p className="mt-1 text-xs text-[#7b8495]">Credit sales and collection status</p>
          </div>
        </div>
      </div>
      
      <div className="space-y-4 px-5 py-4 sm:px-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-[#f8f9fb] p-4">
            <p className="text-xs font-semibold text-[#667085]">Total Credit Sales</p>
            <p className="mt-2 text-xl font-bold text-[#050a1f]">{formatCurrency(data.totalCreditSales, currency)}</p>
          </div>
          <div className="rounded-lg bg-[#f8f9fb] p-4">
            <p className="text-xs font-semibold text-[#667085]">Amount Collected</p>
            <p className="mt-2 text-xl font-bold text-[#00b86b]">{formatCurrency(data.creditCollected, currency)}</p>
          </div>
        </div>
        
        <div className="rounded-lg border border-[#fee2e2] bg-[#fef2f2] p-4">
          <p className="text-xs font-semibold text-[#667085]">Outstanding Amount</p>
          <p className="mt-2 text-xl font-bold text-[#c51f21]">{formatCurrency(data.creditOutstanding, currency)}</p>
          <p className="mt-1 text-xs text-[#8a94a5]">From {formatNumber(data.uncollectedInvoices)} unpaid invoices</p>
        </div>
        
        <div className="border-t border-[#edf0f4] pt-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-[#667085]">Collection Rate</p>
            <p className="text-lg font-bold text-[#050a1f]">{collectionRate}%</p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#edf0f4]">
            <div 
              className="h-full bg-[#00b86b]"
              style={{ width: `${collectionRate}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
