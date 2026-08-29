'use client'

import { useMemo, useState, useTransition } from 'react'
import { CheckCircle2, Loader2, PlugZap, Save, ShieldCheck } from 'lucide-react'
import { notify } from '@/lib/notify'
import { activateEtimsBranch, testEtimsConnection } from '@/app/actions/etims'
import type { EtimsProviderCapabilities } from '@/lib/etims/types'

type Branch = { id: string; name: string; code: string }
type SafeConfiguration = { branchId: string; enabled: boolean; environment: 'sandbox' | 'production'; integrationMethod: 'OSCU' | 'VSCU'; businessKraPin: string; externalBranchId: string; vatRegistered: boolean; providerName: string; deviceId: string; connectionStatus: string; lastConnectionTestAt: Date | null }

export function EtimsConfigurationPanel({ branches, configurations, selectedBranchId, capabilities }: { branches: Branch[]; configurations: SafeConfiguration[]; selectedBranchId?: string; capabilities: EtimsProviderCapabilities }) {
  const branchId = selectedBranchId ?? branches[0]?.id ?? ''
  const existing = useMemo(() => configurations.find((item) => item.branchId === branchId), [branchId, configurations])
  const [environment, setEnvironment] = useState<'sandbox' | 'production'>(existing?.environment ?? 'sandbox')
  const [method, setMethod] = useState<'OSCU' | 'VSCU'>(existing?.integrationMethod ?? 'OSCU')
  const [pin, setPin] = useState(existing?.businessKraPin ?? '')
  const [externalBranchId, setExternalBranchId] = useState(existing?.externalBranchId ?? '')
  const [vatRegistered, setVatRegistered] = useState(existing?.vatRegistered ?? false)
  const [pending, startTransition] = useTransition()
  const [test, setTest] = useState<{ ok: boolean; message: string } | null>(null)
  const input = 'mt-1 h-10 w-full rounded-lg border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
  const onboardingRequired = existing?.connectionStatus === 'PORTAL_ONBOARDING_REQUIRED'
  const ready = Boolean(branchId && pin.trim() && !onboardingRequired)
  const save = () => startTransition(async () => {
    try {
      await activateEtimsBranch({ branchId, environment, integrationMethod: method, businessKraPin: pin, vatRegistered, externalBranchId })
      notify.success('Branch fiscal connection saved securely')
    } catch (error) { notify.error(error instanceof Error ? error.message : 'Could not save connection') }
  })
  return <section className="app-panel overflow-hidden">
    <div className="border-b px-5 py-4"><h2 className="font-semibold">{existing ? 'Manage fiscal connection' : 'Set up this branch'}</h2><p className="mt-1 text-xs text-muted-foreground">Business identity and eTIMS registration only. Credentials are managed securely on the server.</p></div>
    <div className="space-y-5 p-5">
      <div className="grid gap-2 sm:grid-cols-4">{['Business identity','OSCU authorization','Branch & device','Verify & activate'].map((label, index) => <div key={label} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${index === 1 && onboardingRequired ? 'border-primary bg-primary/10' : index > 1 && onboardingRequired ? 'bg-muted/40 text-muted-foreground' : 'bg-muted/20'}`}><span className="mr-2 text-primary">{index + 1}</span>{label}</div>)}</div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <label className="text-xs font-semibold text-muted-foreground">KRA PIN<input aria-label="KRA PIN" value={pin} onChange={(e) => setPin(e.target.value.toUpperCase())} className={input} placeholder="P000000000A" /></label>
        <label className="text-xs font-semibold text-muted-foreground">eTIMS branch (after authorization)<input aria-label="eTIMS Branch ID" disabled={onboardingRequired} value={externalBranchId} onChange={(e) => setExternalBranchId(e.target.value)} className={`${input} disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground`} /></label>
        <label className="text-xs font-semibold text-muted-foreground">Integration method<select value={method} onChange={(e) => setMethod(e.target.value as 'OSCU'|'VSCU')} className={input}><option value="OSCU">OSCU</option><option value="VSCU">VSCU</option></select></label>
        <label className="text-xs font-semibold text-muted-foreground">Environment<select value={environment} onChange={(e) => setEnvironment(e.target.value as 'sandbox'|'production')} className={input}><option value="sandbox">KRA / provider test</option><option value="production">Production</option></select></label>
        <label className="flex items-center gap-3 self-end rounded-lg border px-3 py-2.5 text-sm"><input type="checkbox" checked={vatRegistered} onChange={(e) => setVatRegistered(e.target.checked)} className="accent-primary" />VAT registered</label>
        <div className="self-end rounded-lg border px-3 py-2"><p className="text-xs font-semibold">Credentials</p><p className="mt-1 flex items-center gap-1.5 text-xs text-emerald-600"><ShieldCheck className="h-3.5 w-3.5" />Configured securely</p></div>
      </div>
      <div className="rounded-lg border border-amber-300/50 bg-amber-500/[0.06] p-4"><p className="text-xs font-semibold">Integration authorization</p><p className="mt-1 text-xs text-muted-foreground">Complete the OSCU service request in the KRA eTIMS Taxpayer Portal before connecting this branch.</p><p className="mt-2 text-xs font-medium text-amber-700">External OSCU onboarding required</p></div>
      {environment === 'sandbox' && <p className="rounded-lg border border-amber-300/50 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">Test environment. Records are not KRA production fiscal invoices.</p>}
      {test && <p className={`rounded-lg border px-3 py-2 text-sm ${test.ok ? 'text-emerald-600' : 'text-red-600'}`}>{test.message}</p>}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">{onboardingRequired && <div className="text-xs text-muted-foreground"><p className="font-semibold text-foreground">External OSCU onboarding required</p><p>Complete the OSCU service request in the KRA eTIMS Taxpayer Portal before this branch can be initialized.</p></div>}
        {onboardingRequired && <button type="button" disabled className="inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-semibold text-muted-foreground">Waiting for OSCU onboarding</button>}{existing && !onboardingRequired && <button type="button" disabled={pending} onClick={() => startTransition(async () => { const result = await testEtimsConnection(branchId); setTest(result) })} className="inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-semibold"><PlugZap className="h-4 w-4" />Test connection</button>}
        <button type="button" disabled={pending || !ready} onClick={save} className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50">{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : existing ? <Save className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}{existing ? 'Save changes' : 'Save business identity'}</button>
      </div>
    </div>
  </section>
}
