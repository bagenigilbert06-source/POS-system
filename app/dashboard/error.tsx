'use client'

import { AlertCircle, RefreshCw } from 'lucide-react'

export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex min-h-[55vh] max-w-xl items-center justify-center px-4">
      <section className="app-panel w-full p-6 text-center sm:p-8" role="alert">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive"><AlertCircle className="h-5 w-5" /></span>
        <h1 className="mt-4 text-xl font-extrabold">Unable to load this workspace</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Try again. Your saved business data has not been affected.</p>
        <button onClick={reset} className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"><RefreshCw className="h-4 w-4" />Try again</button>
      </section>
    </div>
  )
}
