export default function ProductsLoading() {
  return (
    <div className="mx-auto max-w-[1480px] animate-pulse space-y-5" aria-label="Loading products">
      <section className="rounded-xl border border-border bg-card p-6">
        <div className="h-3 w-28 rounded bg-muted" />
        <div className="mt-3 h-8 w-44 rounded bg-muted" />
        <div className="mt-3 h-4 w-80 max-w-full rounded bg-muted" />
      </section>
      <div className="flex items-center justify-between gap-3"><div className="h-10 w-80 max-w-[60%] rounded-lg bg-muted" /><div className="h-10 w-32 rounded-lg bg-muted" /></div>
      <div className="flex gap-3 overflow-hidden">{[0, 1, 2, 3, 4].map((item) => <div key={item} className="h-8 w-24 shrink-0 rounded-full bg-muted" />)}</div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, item) => <article key={item} className="overflow-hidden rounded-xl border border-border bg-card"><div className="aspect-[16/9] bg-muted" /><div className="space-y-3 p-4"><div className="h-5 w-3/5 rounded bg-muted" /><div className="h-3 w-2/5 rounded bg-muted" /><div className="h-5 w-1/3 rounded bg-muted" /></div></article>)}
      </div>
    </div>
  )
}
