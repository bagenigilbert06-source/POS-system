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
    <section id="features" className="scroll-mt-20 border-b border-slate-200 bg-white py-20 sm:py-24 lg:py-28">
      <div className="mx-auto max-w-[1320px] px-5 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-8">
          <div className="max-w-3xl"><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e42527]">Everything needed to operate</p><h3 className="mt-3 text-3xl font-bold tracking-[-0.03em] text-slate-950 sm:text-4xl">Built around the work your business does every day.</h3><p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">Six connected capabilities help your team run daily operations while giving owners one clear, reliable view of the business.</p></div>
        </div>

        <div className="mt-9 grid gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-3">
          {capabilities.map((feature, index) => {
            const Icon = feature.icon
            return <article key={feature.title} className={`relative flex min-h-[280px] flex-col p-6 sm:p-7 ${index === 0 ? 'bg-[#ffda32]' : 'bg-white'}`}>
              <div className="flex items-center justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#ffda32] text-slate-950"><Icon className="h-5 w-5" aria-hidden="true" /></span><span className="text-xs font-bold text-[#e42527]">0{index + 1}</span></div>
              <p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-[#e42527]">{feature.eyebrow}</p>
              <h4 className="mt-2 text-xl font-bold tracking-[-0.02em] text-slate-950">{feature.title}</h4>
              <p className="mt-3 text-sm leading-6 text-slate-600">{feature.text}</p>
            </article>
          })}
        </div>
      </div>
    </section>
  )
}
