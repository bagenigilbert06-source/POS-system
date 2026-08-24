import {
  IconBuildingStore,
  IconChartBar,
  IconCreditCard,
  IconPackage,
  IconReceipt,
  IconShieldCheck,
  IconUsers,
  IconWallet,
} from '@tabler/icons-react'

const capabilities = [
  { icon: IconReceipt, eyebrow: 'Sell', title: 'Fast, controlled checkout', text: 'Process sales, payments, discounts, taxes, refunds, and receipts without losing the customer or transaction context.', outcome: 'Every sale becomes a complete business record.' },
  { icon: IconPackage, eyebrow: 'Stock', title: 'Inventory you can trust', text: 'Track products, purchasing, receiving, transfers, reorder points, and stock movement across every location.', outcome: 'Know what is available and what needs action.' },
  { icon: IconCreditCard, eyebrow: 'Money', title: 'Clear daily finances', text: 'Keep payment methods, expenses, supplier costs, refunds, and reconciliation connected to operating activity.', outcome: 'Understand money in, money out, and what remains.' },
  { icon: IconUsers, eyebrow: 'Relationships', title: 'Teams and customers in context', text: 'Give staff the right access while keeping customer history, balances, and activity close to each interaction.', outcome: 'Serve confidently without exposing sensitive controls.' },
  { icon: IconBuildingStore, eyebrow: 'Growth', title: 'One view across branches', text: 'Compare locations, move inventory, standardize permissions, and monitor performance from one operating workspace.', outcome: 'Grow without creating disconnected business islands.' },
  { icon: IconShieldCheck, eyebrow: 'Decisions', title: 'Reports tied to real records', text: 'Review sales, expenses, margins, stock movement, payment mix, staff activity, and branch performance.', outcome: 'Make decisions from information you can trace.' },
]

export function DepartmentSuite() {
  return (
    <section id="features" className="scroll-mt-20 border-y border-slate-200 bg-[#fafbfc] py-20 sm:py-24 lg:py-28">
      <div className="mx-auto max-w-[1180px] px-5 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e42527]">Everything needed to operate</p>
            <h3 className="mt-3 text-3xl font-bold tracking-[-0.03em] text-slate-950 sm:text-4xl">Built around the work your business does every day.</h3>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">Six connected capabilities help your team run daily operations while giving owners one clear, reliable view of the business.</p>
          </div>
        </div>

        <div className="mx-auto mt-9 grid max-w-[1120px] gap-4 text-left sm:grid-cols-2 lg:grid-cols-3">
          {capabilities.map((feature, index) => {
            const Icon = feature.icon
            return <article key={feature.title} className={`group relative flex min-h-[250px] flex-col overflow-hidden rounded-2xl border bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)] transition-shadow duration-150 ease-out hover:shadow-[0_12px_30px_rgba(15,23,42,0.07)] sm:p-6 ${index === 0 ? 'border-[#f3d2d2]' : 'border-slate-200'}`}>
              <div className="absolute inset-x-0 bottom-0 h-1 bg-[#e42527] opacity-0 transition-opacity duration-150 ease-out group-hover:opacity-100" />
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#fff3f3] text-[#e42527] ring-1 ring-inset ring-[#f3d2d2]"><Icon className="h-5 w-5" aria-hidden="true" /></span>
              <p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-[#e42527]">{feature.eyebrow}</p>
              <h4 className="mt-6 text-lg font-semibold leading-6 tracking-[-0.02em] text-slate-950">{feature.title}</h4>
              <p className="mt-3 max-w-[19rem] text-[13px] leading-5 text-slate-600">{feature.text}</p>
              <p className="mt-auto max-w-[19rem] pt-4 text-[11px] font-semibold leading-4 text-slate-500">{feature.outcome}</p>
            </article>
          })}
        </div>
      </div>
    </section>
  )
}
