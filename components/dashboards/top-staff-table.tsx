'use client'

import { formatCurrency, formatNumber } from '@/lib/utils/format'
import { Award } from 'lucide-react'

interface TopStaffTableProps {
  staff: Array<{
    id: string
    name: string
    totalSales: number
    transactions: number
    avgValue: number
  }>
  currency: string
}

export function TopStaffTable({ staff, currency }: TopStaffTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#dfe3ea] bg-white shadow-[0_1px_2px_rgba(16,24,40,.03)]">
      <div className="border-b border-[#edf0f4] px-5 py-4 sm:px-6">
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-[#ffda32]" />
          <div>
            <h2 className="text-[0.95rem] font-bold text-[#101828]">Top Performers</h2>
            <p className="mt-1 text-xs text-[#7b8495]">Best staff by sales revenue today</p>
          </div>
        </div>
      </div>
      
      {staff.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-sm text-[#8a94a5]">
          No staff activity recorded today
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="border-b border-[#edf0f4] bg-[#fafbfc] text-[0.68rem] uppercase tracking-[0.08em] text-[#8a94a5]">
              <tr>
                <th className="px-6 py-3 font-semibold">Rank</th>
                <th className="px-4 py-3 font-semibold">Staff Name</th>
                <th className="px-4 py-3 text-right font-semibold">Transactions</th>
                <th className="px-4 py-3 text-right font-semibold">Avg Value</th>
                <th className="px-6 py-3 text-right font-semibold">Total Sales</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf0f4]">
              {staff.map((person, index) => (
                <tr key={person.id} className="hover:bg-[#fafbfc]">
                  <td className="px-6 py-3.5">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#ffda32] text-xs font-bold text-[#050a1f]">
                      {index + 1}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 font-semibold text-[#101828]">{person.name}</td>
                  <td className="px-4 py-3.5 text-right text-[#667085]">{formatNumber(person.transactions)}</td>
                  <td className="px-4 py-3.5 text-right text-[#667085]">{formatCurrency(person.avgValue, currency)}</td>
                  <td className="px-6 py-3.5 text-right font-semibold tabular-nums text-[#e42527]">{formatCurrency(person.totalSales, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
