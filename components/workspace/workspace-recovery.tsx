'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Loader2, RotateCcw } from 'lucide-react'
import { PesabyLogoMark } from '@/components/brand/pesaby-logo'

export function WorkspaceRecovery({ organizationName }: { organizationName: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const recover = async () => {
    setLoading(true); setError('')
    try {
      const response = await fetch('/api/workspace/recover', { method: 'POST', credentials: 'include' })
      const result = await response.json()
      if (!response.ok) { setError(result.message ?? 'This workspace needs manual support before it can be opened.'); return }
      router.replace('/dashboard'); router.refresh()
    } catch { setError('Check your connection and try again. No workspace data was changed.') }
    finally { setLoading(false) }
  }
  return <main className="flex min-h-screen items-center justify-center bg-[#fffaf0] px-5"><section className="w-full max-w-lg rounded-2xl border border-[#dfe3ea] bg-white p-8 shadow-sm"><span className="inline-flex items-center gap-3"><PesabyLogoMark /><span className="text-xl font-extrabold text-[#050a1f]">Pesaby</span></span><span className="mt-8 flex h-11 w-11 items-center justify-center rounded-xl bg-[#fff4c4]"><AlertTriangle className="h-5 w-5 text-[#050a1f]" /></span><p className="mt-5 text-xs font-extrabold uppercase tracking-[0.18em] text-[#e42527]">Workspace recovery</p><h1 className="mt-2 text-3xl font-extrabold tracking-[-0.04em] text-[#050a1f]">Reconnect to {organizationName}</h1><p className="mt-3 text-sm leading-6 text-[#667085]">Pesaby found your workspace, but your owner access or configuration is incomplete. Recovery checks the saved records and restores only the missing links.</p>{error && <p role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{error}</p>}<button type="button" onClick={recover} disabled={loading} className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#e42527] px-5 text-sm font-extrabold text-white outline-none focus-visible:ring-2 focus-visible:ring-[#050a1f] focus-visible:ring-offset-2 disabled:opacity-60">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}Restore workspace access</button></section></main>
}
