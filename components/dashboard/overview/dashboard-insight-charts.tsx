import { SalesPerformanceCard } from './sales-performance-card'
import { PaymentMixCard } from './payment-mix-card'
import { StockHealthCard } from './stock-health-card'

type Payment = { method: string; amount: number; transactions: number }
type SalesPoint = { date: string; revenue: number; transactions: number }

interface DashboardInsightChartsProps {
  currency: string
  paymentMix: Payment[]
  salesPerformance: SalesPoint[]
  stock: { healthy: number; low: number; out: number }
  productLabel?: string
}

export function DashboardInsightCharts({
  currency,
  paymentMix,
  salesPerformance,
  stock,
}: DashboardInsightChartsProps) {
  return (
    <section aria-label="Business insight charts" className="grid gap-4 xl:grid-cols-3">
      <PaymentMixCard currency={currency} payments={paymentMix} />

      <SalesPerformanceCard currency={currency} data={salesPerformance} />

      <StockHealthCard stock={stock} />
    </section>
  )
}
