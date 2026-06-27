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
        <div key={index} className="flex flex-1 items-end rounded-t-md bg-blue-50 dark:bg-blue-950/50" style={{ height: `${Math.max(height - 18, 24)}%` }}>
          <div className="w-full rounded-t-md bg-primary/85" style={{ height: `${height}%` }} />
        </div>
      ))}
    </div>
  )
}

export function DashboardPreview({ compact = false }: { compact?: boolean }) {
  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.12)] dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white">
            <Building2 className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-950 dark:text-white">Imara Command Center</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Live business overview</p>
          </div>
        </div>
        <div className="hidden items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 sm:flex dark:border-green-900/60 dark:bg-green-950 dark:text-green-300">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          Synced
        </div>
      </div>

      <div className="bg-slate-50 p-4 sm:p-6 dark:bg-slate-900/50">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => {
            const Icon = metric.icon
            return (
              <div key={metric.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-primary dark:bg-blue-950">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <span className="rounded-full bg-green-50 px-2 py-1 text-xs font-semibold text-green-700 dark:bg-green-950 dark:text-green-300">{metric.trend}</span>
                </div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{metric.label}</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">{metric.value}</p>
              </div>
            )
          })}
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-950 dark:text-white">Revenue Momentum</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Sales, invoices and branch performance</p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-green-600" aria-hidden="true" />
            </div>
            <MiniChart />
          </div>

          <div className="grid gap-4">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/60 dark:bg-amber-950/40">
              <div className="mb-4 flex items-center gap-2 text-amber-700 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                <p className="text-sm font-semibold">Low Stock</p>
              </div>
              <p className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">12</p>
              <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">Supplier reorder suggestions are ready.</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
              <div className="mb-3 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" aria-hidden="true" />
                <p className="text-sm font-semibold text-slate-950 dark:text-white">Payments</p>
              </div>
              <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">Mobile money, card, cash and invoice payments reconciled in one place.</p>
            </div>
          </div>
        </div>

        {!compact && (
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            {transactions.map(([branch, method, amount, status]) => (
              <div key={`${branch}-${amount}`} className="grid grid-cols-4 gap-3 border-b border-slate-100 px-5 py-4 text-xs last:border-b-0 dark:border-slate-800">
                <span className="font-semibold text-slate-950 dark:text-white">{branch}</span>
                <span className="text-slate-500">{method}</span>
                <span className="font-semibold text-slate-950 dark:text-white">{amount}</span>
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
    <section className="section-padding-premium bg-white dark:bg-background">
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
