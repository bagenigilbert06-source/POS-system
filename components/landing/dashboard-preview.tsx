import { AlertTriangle, ArrowUpRight, BarChart3, Building2, CreditCard, Package, ReceiptText, Users } from 'lucide-react'

const metrics = [
  { label: 'Sales Today', value: 'KES 842K', trend: '+18%', icon: ReceiptText },
  { label: 'Net Revenue', value: 'KES 12.8M', trend: '+9.7%', icon: BarChart3 },
  { label: 'Inventory Items', value: '18,420', trend: '98% synced', icon: Package },
  { label: 'Active Customers', value: '42,890', trend: '+1,204', icon: Users },
]

const transactions = [
  ['Nairobi CBD', 'Mobile money', 'KES 24,500', 'Paid'],
  ['Kigali Branch', 'Card', 'KES 18,300', 'Paid'],
  ['Accra Depot', 'Invoice', 'KES 96,700', 'Pending'],
]

function MiniChart() {
  return (
    <div className="flex h-40 items-end gap-2">
      {[36, 48, 42, 66, 58, 76, 70, 88, 78, 96, 86, 104].map((height, index) => (
        <div key={index} className="flex flex-1 items-end rounded-t-md bg-blue-100 dark:bg-blue-900/40" style={{ height: `${Math.max(height - 18, 24)}%` }}>
          <div className="w-full rounded-t-md bg-blue-600 dark:bg-blue-400" style={{ height: `${height}%` }} />
        </div>
      ))}
    </div>
  )
}

export function DashboardPreview({ compact = false }: { compact?: boolean }) {
  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-[0_24px_80px_rgba(0,0,0,0.12)]">
      <div className="flex items-center justify-between border-b border-border bg-card px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Building2 className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Imara Command Center</p>
            <p className="text-xs text-muted-foreground">Live business overview</p>
          </div>
        </div>
        <div className="hidden items-center gap-2 rounded-full border border-green-200/50 dark:border-green-900/40 bg-green-50 dark:bg-green-950/30 px-3 py-1.5 text-xs font-semibold text-green-700 dark:text-green-300 sm:flex">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          Synced
        </div>
      </div>

      <div className="bg-secondary p-4 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => {
            const Icon = metric.icon
            return (
              <div key={metric.label} className="fluent-card p-4">
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <span className="rounded-full badge-success">{metric.trend}</span>
                </div>
                <p className="text-xs font-medium text-muted-foreground">{metric.label}</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{metric.value}</p>
              </div>
            )
          })}
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
          <div className="fluent-card p-5">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Revenue Momentum</p>
                <p className="mt-1 text-xs text-muted-foreground">Sales, invoices and branch performance</p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-green-600" aria-hidden="true" />
            </div>
            <MiniChart />
          </div>

          <div className="grid gap-4">
            <div className="badge-warning rounded-2xl p-5">
              <div className="mb-4 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                <p className="text-sm font-semibold">Low Stock</p>
              </div>
              <p className="text-3xl font-semibold tracking-tight text-foreground">12</p>
              <p className="mt-2 text-xs leading-relaxed">Supplier reorder suggestions are ready.</p>
            </div>

            <div className="fluent-card p-5">
              <div className="mb-3 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" aria-hidden="true" />
                <p className="text-sm font-semibold text-foreground">Payments</p>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">Mobile money, card, cash and invoice payments reconciled in one place.</p>
            </div>
          </div>
        </div>

        {!compact && (
          <div className="mt-4 overflow-hidden fluent-card">
            {transactions.map(([branch, method, amount, status]) => (
              <div key={`${branch}-${amount}`} className="grid grid-cols-4 gap-3 border-b border-border px-5 py-4 text-xs last:border-b-0">
                <span className="font-semibold text-foreground">{branch}</span>
                <span className="text-muted-foreground">{method}</span>
                <span className="font-semibold text-foreground">{amount}</span>
                <span className={status === 'Paid' ? 'text-green-600' : 'text-amber-600'}>{status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function DashboardPreviewSection() {
  return (
    <section className="section-padding-premium bg-background">
      <div className="container-wide">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <p className="section-eyebrow mb-3">Dashboard Preview</p>
          <h2 className="section-heading mb-4">Everything important, clear at a glance.</h2>
          <p className="section-subheading">Track sales, revenue, inventory, payments, branches and operational risks from one calm workspace.</p>
        </div>
        <DashboardPreview />
      </div>
    </section>
  )
}
