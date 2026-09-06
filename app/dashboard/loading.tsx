export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-5" role="status" aria-label="Loading dashboard data">
      <div className="h-24 rounded-2xl bg-[var(--dashboard-surface)]" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-32 rounded-2xl bg-[var(--dashboard-surface)]" />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <div className="h-80 rounded-2xl bg-[var(--dashboard-surface)]" />
        <div className="h-80 rounded-2xl bg-[var(--dashboard-surface)]" />
      </div>
      <span className="sr-only">Loading dashboard data</span>
    </div>
  )
}
