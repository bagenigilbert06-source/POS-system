'use client'

import { formatCurrency, formatNumber } from '@/lib/utils/format'
import { Trophy } from 'lucide-react'

interface TopCustomersTableProps {
  customers: Array<{
    id: string
    name: string
    email?: string
    phone?: string
    totalRevenue: number
    transactions: number
  }>
  currency: string
}

export function TopCustomersTable({ customers, currency }: TopCustomersTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#dfe3ea] bg-white shadow-[0_1px_2px_rgba(16,24,40,.03)]">
      <div className="border-b border-[#edf0f4] px-5 py-4 sm:px-6">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-[#ffda32]" />
          <div>
            <h2 className="text-[0.95rem] font-bold text-[#101828]">Top Customers</h2>
            <p className="mt-1 text-xs text-[#7b8495]">Best customers by total revenue today</p>
          </div>
        </div>
      </div>
      
      {customers.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-sm text-[#8a94a5]">
          No customer data available
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="border-b border-[#edf0f4] bg-[#fafbfc] text-[0.68rem] uppercase tracking-[0.08em] text-[#8a94a5]">
              <tr>
                <th className="px-6 py-3 font-semibold">Rank</th>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Contact</th>
                <th className="px-4 py-3 text-right font-semibold">Transactions</th>
                <th className="px-6 py-3 text-right font-semibold">Total Spent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf0f4]">
              {customers.map((customer, index) => (
                <tr key={customer.id} className="hover:bg-[#fafbfc]">
                  <td className="px-6 py-3.5">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#ffda32] text-xs font-bold text-[#050a1f]">
                      {index + 1}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 font-semibold text-[#101828]">{customer.name}</td>
                  <td className="px-4 py-3.5 text-[#667085]">
                    {customer.email && <p className="text-xs">{customer.email}</p>}
                    {customer.phone && <p className="text-xs">{customer.phone}</p>}
                  </td>
                  <td className="px-4 py-3.5 text-right text-[#667085]">{formatNumber(customer.transactions)}</td>
                  <td className="px-6 py-3.5 text-right font-semibold tabular-nums text-[#e42527]">{formatCurrency(customer.totalRevenue, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
