export default function DashboardLoading() {
  return (
    <div className="mx-auto w-full max-w-[1440px] animate-pulse space-y-5 pb-8" aria-label="Loading dashboard">
      <div className="flex items-end justify-between gap-6 border-b border-border pb-5">
        <div className="space-y-3"><div className="h-3 w-28 rounded bg-muted" /><div className="h-9 w-64 rounded bg-muted" /><div className="h-4 w-96 max-w-full rounded bg-muted" /></div>
        <div className="hidden h-10 w-36 rounded-lg bg-muted sm:block" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => <div key={item} className="h-32 rounded-xl border border-border bg-card p-5"><div className="h-3 w-20 rounded bg-muted" /><div className="mt-4 h-7 w-28 rounded bg-muted" /><div className="mt-3 h-3 w-36 rounded bg-muted" /></div>)}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.45fr_1fr]"><div className="h-80 rounded-xl border border-border bg-card" /><div className="h-80 rounded-xl border border-border bg-card" /></div>
    </div>
  )
}
