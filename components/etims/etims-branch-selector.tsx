'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

export function EtimsBranchSelector({ branches, value }: { branches: Array<{ id: string; name: string }>; value?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  return <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
    Branch
    <select
      aria-label="Select eTIMS branch"
      value={value ?? ''}
      onChange={(event) => {
        const next = new URLSearchParams(searchParams.toString())
        next.set('branch', event.target.value)
        next.delete('page')
        router.push(`${pathname}?${next.toString()}`)
      }}
      className="h-8 min-w-40 rounded-md border bg-background px-2.5 text-xs font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {branches.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
    </select>
  </label>
}
