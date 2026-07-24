import Link from 'next/link'
import { AlertCircle, ArrowRight, Clock } from 'lucide-react'

interface OutstandingPayment {
  id: string
  customerName: string
  amount: number
  daysOverdue: number
  orderId: string
}

interface OutstandingPaymentsProps {
  payments: OutstandingPayment[]
  currency: string
}

export function OutstandingPayments({ payments, currency }: OutstandingPaymentsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: currency || 'KES',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  if (payments.length === 0) return null

  return (
    <article className="overflow-hidden rounded-xl border border-[#dfe3ea] bg-white shadow-[0_1px_2px_rgba(16,24,40,.03)]">
      <div className="flex items-center justify-between gap-4 border-b border-[#edf0f4] px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#ffeaea]">
            <AlertCircle className="h-4 w-4 text-[#c51f21]" />
          </div>
          <div>
            <h2 className="text-[0.95rem] font-bold text-[#101828]">Outstanding Payments</h2>
            <p className="mt-1 text-xs text-[#7b8495]">{payments.length} overdue payment{payments.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <Link
          href="/dashboard/customers"
          className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-[#344054] hover:text-[#e42527]"
        >
          View all <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="divide-y divide-[#edf0f4] px-5">
        {payments.slice(0, 5).map((payment) => (
          <div key={payment.id} className="flex items-start justify-between gap-4 py-3.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[#101828]">{payment.customerName}</p>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-[#8a94a5]">
                <Clock className="h-3 w-3 flex-shrink-0" />
                <span>{payment.daysOverdue} day{payment.daysOverdue !== 1 ? 's' : ''} overdue</span>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-semibold text-[#101828]">{formatCurrency(payment.amount)}</p>
              <p className="mt-0.5 text-xs text-[#c51f21] font-medium">Overdue</p>
            </div>
          </div>
        ))}
      </div>
    </article>
  )
}
