export default function DashboardLoading() {
  return (
    <div className="mx-auto w-full max-w-[1480px] animate-pulse space-y-5" aria-label="Loading workspace" aria-busy="true">
      <div className="h-28 rounded-xl border bg-white" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-36 rounded-xl border bg-white" />)}
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(300px,.7fr)]">
        <div className="h-96 rounded-xl border bg-white" />
        <div className="h-96 rounded-xl border bg-white" />
      </div>
      <span className="sr-only">Loading your business records.</span>
    </div>
  )
}
