export default function CustomersLoading() {
  return <div className="mx-auto max-w-[1480px] space-y-6 py-2" aria-label="Loading customers">
    <div className="mx-auto w-full max-w-3xl animate-pulse"><div className="h-4 w-24 rounded bg-muted" /><div className="mt-4 h-8 w-52 rounded bg-muted" /><div className="mt-2 h-4 w-80 max-w-full rounded bg-muted" /></div>
    <div className="mx-auto w-full max-w-3xl rounded-xl border bg-card p-7 shadow-sm"><div className="h-6 w-40 animate-pulse rounded bg-muted" /><div className="mt-2 h-4 w-80 max-w-full animate-pulse rounded bg-muted" /><div className="mt-7 grid gap-5 sm:grid-cols-2"><div className="sm:col-span-2 h-10 animate-pulse rounded bg-muted" /><div className="h-10 animate-pulse rounded bg-muted" /><div className="h-10 animate-pulse rounded bg-muted" /><div className="sm:col-span-2 h-10 animate-pulse rounded bg-muted" /></div></div>
  </div>
}
