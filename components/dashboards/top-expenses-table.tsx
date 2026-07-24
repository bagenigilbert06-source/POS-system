'use client'

import { formatCurrency } from '@/lib/utils/format'
import { AlertCircle } from 'lucide-react'

interface TopExpensesTableProps {
  expenses: Array<{
    id: string
    title: string
    category: string
    amount: number
    notes?: string
    date: Date
  }>
  currency: string
}

export function TopExpensesTable({ expenses, currency }: TopExpensesTableProps) {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('en-KE', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[#dfe3ea] bg-white shadow-[0_1px_2px_rgba(16,24,40,.03)]">
      <div className="border-b border-[#edf0f4] px-5 py-4 sm:px-6">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-[#e42527]" />
          <div>
            <h2 className="text-[0.95rem] font-bold text-[#101828]">Top 10 Expenses</h2>
            <p className="mt-1 text-xs text-[#7b8495]">Highest expenses recorded today</p>
          </div>
        </div>
      </div>
      
      {expenses.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-sm text-[#8a94a5]">
          No expenses recorded today
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="border-b border-[#edf0f4] bg-[#fafbfc] text-[0.68rem] uppercase tracking-[0.08em] text-[#8a94a5]">
              <tr>
                <th className="px-6 py-3 font-semibold">Title</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Time</th>
                <th className="px-6 py-3 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf0f4]">
              {expenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-[#fafbfc]">
                  <td className="px-6 py-3.5">
                    <div>
                      <p className="font-semibold text-[#101828]">{expense.title}</p>
                      {expense.notes && (
                        <p className="mt-1 text-xs text-[#8a94a5]">{expense.notes.substring(0, 50)}...</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center rounded-full bg-[#f0f0f0] px-2.5 py-0.5 text-xs font-semibold text-[#667085]">
                      {expense.category}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-[#667085]">{formatDate(expense.date)}</td>
                  <td className="px-6 py-3.5 text-right font-semibold tabular-nums text-[#e42527]">{formatCurrency(expense.amount, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
