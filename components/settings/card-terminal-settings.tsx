'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createCardTerminal } from '@/app/actions/card-payments'
import { notify } from '@/lib/notify'

export function CardTerminalSettings({ branches }: { branches: Array<{ id: string; name: string }> }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [branchId, setBranchId] = useState(branches[0]?.id ?? '')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [provider, setProvider] = useState('')
  const [referenceRequired, setReferenceRequired] = useState(false)
  return <form className="grid gap-3 border-t p-4 md:grid-cols-5" onSubmit={async (event) => {
    event.preventDefault(); setBusy(true)
    try { await createCardTerminal({ branchId, name, terminalCode: code, provider: provider || undefined, referenceRequired }); setName(''); setCode(''); setProvider(''); notify.success('Card terminal added'); router.refresh() }
    catch (error) { notify.error(error instanceof Error ? error.message : 'Could not add terminal') }
    finally { setBusy(false) }
  }}>
    <select aria-label="Branch" required value={branchId} onChange={(event) => setBranchId(event.target.value)} className="h-10 rounded-lg border bg-background px-3 text-sm"><option value="">Branch</option>{branches.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
    <input aria-label="Terminal name" required value={name} onChange={(event) => setName(event.target.value)} placeholder="Terminal name" className="h-10 rounded-lg border bg-background px-3 text-sm" />
    <input aria-label="Terminal code" required value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="Terminal code" className="h-10 rounded-lg border bg-background px-3 text-sm uppercase" />
    <input aria-label="Provider" value={provider} onChange={(event) => setProvider(event.target.value)} placeholder="Provider (optional)" className="h-10 rounded-lg border bg-background px-3 text-sm" />
    <button disabled={busy || !branchId} className="h-10 rounded-lg bg-[#f5b800] px-4 text-sm font-bold text-[#241d00] disabled:opacity-50">{busy ? 'Adding…' : 'Add terminal'}</button>
    <label className="flex items-center gap-2 text-xs text-muted-foreground md:col-span-5"><input type="checkbox" checked={referenceRequired} onChange={(event) => setReferenceRequired(event.target.checked)} /> Require a reference / RRN for approvals on this terminal</label>
  </form>
}
