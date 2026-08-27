'use client'

import { useMemo, useState, useTransition } from 'react'
import { Building2, Check, CheckCircle2, ChevronDown, Circle, KeyRound, Loader2, PlugZap, Save, ServerCog, ShieldAlert } from 'lucide-react'
import { saveEtimsConfiguration, testEtimsConnection, type EtimsConfigurationInput } from '@/app/actions/etims'
import { notify } from '@/lib/notify'

type Branch = { id: string; name: string; code: string }
type Existing = Omit<EtimsConfigurationInput, 'maximumRetryAttempts'> & { maximumRetryAttempts: number; id: string }

const empty = (branchId: string): EtimsConfigurationInput => ({
  branchId, enabled: false, environment: 'sandbox', integrationMethod: 'OSCU', providerName: 'mock',
  businessKraPin: '', vatRegistered: false, externalBranchId: '', deviceId: '', apiBaseUrl: '',
  credentialReference: '', clientId: '', clientSecretReference: '', certificateReference: '', privateKeyReference: '',
  invoiceSubmissionEnabled: true, automaticRetryEnabled: true, maximumRetryAttempts: 5, receiptDetailsEnabled: true,
})

export function EtimsConfigurationPanel({ branches, configurations }: { branches: Branch[]; configurations: Existing[] }) {
  const [branchId, setBranchId] = useState(branches[0]?.id ?? '')
  const initial = useMemo(() => configurations.find((item) => item.branchId === branchId) ?? empty(branchId), [branchId, configurations])
  const [drafts, setDrafts] = useState<Record<string, EtimsConfigurationInput>>({})
  const form = drafts[branchId] ?? initial
  const [pending, startTransition] = useTransition()
  const [activeAction, setActiveAction] = useState<'save' | 'test' | null>(null)
  const [savedNow, setSavedNow] = useState<Record<string, boolean>>({})
  const [dirty, setDirty] = useState<Record<string, boolean>>({})
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string; latencyMs: number } | null>(null)

  const update = (values: Partial<EtimsConfigurationInput>) => {
    setDrafts((current) => ({ ...current, [branchId]: { ...form, branchId, ...values } }))
    setDirty((current) => ({ ...current, [branchId]: true }))
    setTestResult(null)
  }
  const set = <K extends keyof EtimsConfigurationInput>(key: K, value: EtimsConfigurationInput[K]) => update({ [key]: value })

  const isSaved = configurations.some((item) => item.branchId === branchId) || Boolean(savedNow[branchId])
  const hasUnsavedChanges = Boolean(dirty[branchId])
  const identityReady = Boolean(form.businessKraPin?.trim() && form.externalBranchId?.trim())
  const connectionReady = form.environment === 'sandbox'
    ? form.providerName === 'mock'
    : Boolean(form.providerName.trim() && form.providerName !== 'mock' && form.apiBaseUrl?.trim())
  const credentialsReady = form.environment === 'sandbox' || Boolean(form.credentialReference?.trim() || form.clientSecretReference?.trim() || form.certificateReference?.trim())
  const activationReady = form.enabled && form.invoiceSubmissionEnabled
  const readyCount = [identityReady, connectionReady, credentialsReady, activationReady].filter(Boolean).length
  const readyForTest = identityReady && connectionReady && credentialsReady
  const status = !isSaved
    ? { label: 'Not configured', detail: 'Complete the required details and save this branch.', tone: 'slate' }
    : hasUnsavedChanges
      ? { label: 'Unsaved changes', detail: 'Save this branch before testing its connection.', tone: 'amber' }
    : testResult?.ok
      ? { label: form.environment === 'production' ? 'Production connected' : 'Sandbox connected', detail: testResult.message, tone: 'emerald' }
      : readyForTest
        ? { label: 'Ready to test', detail: 'Save any changes, then verify the provider connection.', tone: 'amber' }
        : { label: 'Setup incomplete', detail: 'Complete the missing items shown below.', tone: 'amber' }
  const input = 'mt-1.5 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/15'

  if (!branches.length) return <div className="app-panel p-5 text-sm text-muted-foreground">Create a branch before configuring eTIMS.</div>

  return <section className="app-panel overflow-hidden">
    <div className="flex flex-wrap items-center justify-between gap-4 border-b px-5 py-4">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"><ServerCog className="h-[18px] w-[18px]" /></span>
        <div><h2 className="text-lg font-semibold leading-tight tracking-tight">eTIMS setup</h2><p className="mt-1 text-xs text-muted-foreground">Configure fiscal invoicing for one branch at a time.</p></div>
      </div>
      <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">Branch
        <select value={branchId} onChange={(event) => { setBranchId(event.target.value); setTestResult(null) }} className="h-9 max-w-64 rounded-lg border bg-background px-3 text-foreground">
          {branches.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.code})</option>)}
        </select>
      </label>
    </div>

    <div className="space-y-6 p-5">
      <div className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 ${status.tone === 'emerald' ? 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/20' : status.tone === 'amber' ? 'border-amber-200 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/20' : 'bg-muted/30'}`}>
        <div className="flex items-center gap-3">{status.tone === 'emerald' ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <Circle className="h-5 w-5 text-muted-foreground" />}<div><p className="text-sm font-semibold">{status.label}</p><p className="text-xs text-muted-foreground">{status.detail}</p></div></div>
        <span className="rounded-full border bg-background px-3 py-1 text-[11px] font-semibold tabular-nums">{readyCount} of 4 ready</span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <ReadinessItem number="1" label="Business identity" complete={identityReady} />
        <ReadinessItem number="2" label="Provider connection" complete={connectionReady} />
        <ReadinessItem number="3" label="Secure credentials" complete={credentialsReady} />
        <ReadinessItem number="4" label="Invoice delivery" complete={activationReady} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border p-4">
          <SectionTitle icon={Building2} title="Business identity" description="Use the identifiers assigned to this taxpayer and branch." />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Business KRA PIN" required hint="Taxpayer PIN registered for eTIMS."><input value={form.businessKraPin ?? ''} onChange={(event) => set('businessKraPin', event.target.value.toUpperCase())} placeholder="P000000000A" autoComplete="off" className={input} /></Field>
            <Field label="eTIMS branch identifier" required hint="Branch code assigned by KRA or your provider."><input value={form.externalBranchId ?? ''} onChange={(event) => set('externalBranchId', event.target.value)} placeholder="Provider-issued branch ID" autoComplete="off" className={input} /></Field>
            <Field label="Device/system identifier" hint="Only when supplied by your provider."><input value={form.deviceId ?? ''} onChange={(event) => set('deviceId', event.target.value)} placeholder="Optional" autoComplete="off" className={input} /></Field>
            <label className="flex min-h-[72px] items-center gap-3 rounded-lg border bg-muted/20 px-3 py-2.5"><input type="checkbox" checked={form.vatRegistered} onChange={(event) => set('vatRegistered', event.target.checked)} className="h-4 w-4 accent-primary" /><span><b className="block text-sm">VAT registered</b><span className="text-xs text-muted-foreground">Use VAT classifications on fiscal invoices.</span></span></label>
          </div>
        </div>

        <div className="rounded-xl border p-4">
          <SectionTitle icon={PlugZap} title="Provider connection" description="Choose the environment and integration method." />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Environment" required><select value={form.environment} onChange={(event) => { const environment = event.target.value as 'sandbox' | 'production'; update({ environment, providerName: environment === 'production' && form.providerName === 'mock' ? '' : form.providerName }) }} className={input}><option value="sandbox">Sandbox — testing</option><option value="production">Production — live invoices</option></select></Field>
            <Field label="Integration method" required hint="OSCU suits an always-online POS."><select value={form.integrationMethod} onChange={(event) => set('integrationMethod', event.target.value as 'OSCU' | 'VSCU')} className={input}><option value="OSCU">OSCU — always online</option><option value="VSCU">VSCU — bulk/offline capable</option></select></Field>
            <Field label={form.environment === 'sandbox' ? 'Sandbox provider' : 'Certified provider adapter'} required hint={form.environment === 'production' ? 'Must match an installed, certified server adapter.' : undefined}>
              {form.environment === 'sandbox' ? <select value={form.providerName} onChange={(event) => set('providerName', event.target.value)} className={input}><option value="mock">Pesaby sandbox simulator</option></select> : <input value={form.providerName} onChange={(event) => set('providerName', event.target.value.trim())} placeholder="Provider adapter ID" autoComplete="off" className={input} />}
            </Field>
            <Field label="Maximum retry attempts" hint="For temporary network or provider failures."><input type="number" min={1} max={20} value={form.maximumRetryAttempts} onChange={(event) => set('maximumRetryAttempts', Number(event.target.value))} className={input} /></Field>
          </div>
        </div>
      </div>

      {form.environment === 'sandbox' ? <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-100"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /><div><p className="font-semibold">Sandbox testing only</p><p className="mt-0.5 text-xs opacity-80">Invoices are clearly marked as test records and are not submitted to KRA.</p></div></div> : <div className="flex gap-3 rounded-xl border border-rose-200 bg-rose-50/70 p-3 text-sm text-rose-950 dark:border-rose-900 dark:bg-rose-950/20 dark:text-rose-100"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /><div><p className="font-semibold">Production requires certification</p><p className="mt-0.5 text-xs opacity-80">Enable live invoicing only after the certified provider adapter, production credentials and KRA approval are installed.</p></div></div>}

      {form.environment === 'production' && <details className="group rounded-xl border" open>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5"><SectionTitle icon={KeyRound} title="Secure provider credentials" description="Enter private environment-variable names—not secret values." /><ChevronDown className="h-4 w-4 text-muted-foreground transition group-open:rotate-180" /></summary>
        <div className="grid gap-4 border-t p-4 md:grid-cols-2 lg:grid-cols-3">
          <Field label="Production API base URL" required hint="Use the HTTPS URL from official provider documentation."><input type="url" value={form.apiBaseUrl ?? ''} onChange={(event) => set('apiBaseUrl', event.target.value)} placeholder="https://api.provider.example" autoComplete="off" className={input} /></Field>
          <Field label="Client ID" hint="Public account identifier, if required."><input value={form.clientId ?? ''} onChange={(event) => set('clientId', event.target.value)} placeholder="Optional" autoComplete="off" className={input} /></Field>
          <Field label="API credential variable" hint="Example: ETIMS_PROVIDER_API_KEY"><input value={form.credentialReference ?? ''} onChange={(event) => set('credentialReference', event.target.value.toUpperCase())} placeholder="ETIMS_PROVIDER_API_KEY" autoComplete="off" className={input} /></Field>
          <Field label="Client secret variable" hint="Example: ETIMS_PROVIDER_CLIENT_SECRET"><input value={form.clientSecretReference ?? ''} onChange={(event) => set('clientSecretReference', event.target.value.toUpperCase())} placeholder="ETIMS_PROVIDER_CLIENT_SECRET" autoComplete="off" className={input} /></Field>
          <Field label="Certificate variable" hint="Only when required by the provider."><input value={form.certificateReference ?? ''} onChange={(event) => set('certificateReference', event.target.value.toUpperCase())} placeholder="ETIMS_PROVIDER_CERTIFICATE" autoComplete="off" className={input} /></Field>
          <Field label="Private-key variable" hint="Only when certificate signing is required."><input value={form.privateKeyReference ?? ''} onChange={(event) => set('privateKeyReference', event.target.value.toUpperCase())} placeholder="ETIMS_PROVIDER_PRIVATE_KEY" autoComplete="off" className={input} /></Field>
        </div>
      </details>}

      <div><h3 className="text-sm font-semibold">Invoice delivery</h3><p className="mt-0.5 text-xs text-muted-foreground">Choose what happens after a sale is safely committed in Pesaby.</p><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Toggle checked={form.enabled} onChange={(checked) => set('enabled', checked)} title="Enable eTIMS" description="Create fiscal records for completed sales." />
        <Toggle checked={form.invoiceSubmissionEnabled} onChange={(checked) => set('invoiceSubmissionEnabled', checked)} title="Submit invoices" description="Send invoices after a sale commits." />
        <Toggle checked={form.automaticRetryEnabled} onChange={(checked) => set('automaticRetryEnabled', checked)} title="Automatic retry" description="Retry temporary failures safely." />
        <Toggle checked={form.receiptDetailsEnabled} onChange={(checked) => set('receiptDetailsEnabled', checked)} title="Receipt details" description="Print confirmed fiscal references." />
      </div></div>

      {testResult && <div className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${testResult.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100' : 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-100'}`}>{testResult.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />}<span><b className="mr-1">{testResult.ok ? 'Connection successful.' : 'Connection failed.'}</b>{testResult.message}{testResult.latencyMs ? ` · ${testResult.latencyMs} ms` : ''}</span></div>}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <p className="max-w-xl text-xs leading-5 text-muted-foreground">Save first, then test the stored server configuration. Secret values remain in your hosting environment.</p>
        <div className="flex gap-2">
          <button disabled={pending || !isSaved || hasUnsavedChanges} onClick={() => { setActiveAction('test'); startTransition(async () => { try { const result = await testEtimsConnection(branchId); setTestResult(result) } catch (error) { notify.error(error instanceof Error ? error.message : 'Connection test failed') } finally { setActiveAction(null) } }) }} className="inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-semibold transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50">{pending && activeAction === 'test' ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlugZap className="h-4 w-4" />}Test connection</button>
          <button disabled={pending || !readyForTest} onClick={() => { setActiveAction('save'); startTransition(async () => { try { await saveEtimsConfiguration({ ...form, branchId }); setSavedNow((current) => ({ ...current, [branchId]: true })); setDirty((current) => ({ ...current, [branchId]: false })); notify.success('eTIMS configuration saved') } catch (error) { notify.error(error instanceof Error ? error.message : 'Could not save eTIMS configuration') } finally { setActiveAction(null) } }) }} className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">{pending && activeAction === 'save' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save configuration</button>
        </div>
      </div>
    </div>
  </section>
}

function ReadinessItem({ number, label, complete }: { number: string; label: string; complete: boolean }) {
  return <div className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 ${complete ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20' : 'bg-muted/20'}`}><span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${complete ? 'bg-emerald-600 text-white' : 'border bg-background text-muted-foreground'}`}>{complete ? <Check className="h-3.5 w-3.5" /> : number}</span><span className="text-xs font-semibold">{label}</span></div>
}

function SectionTitle({ icon: Icon, title, description }: { icon: typeof Building2; title: string; description: string }) {
  return <div className="flex items-start gap-2.5"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /><div><h3 className="text-sm font-semibold">{title}</h3><p className="mt-0.5 text-xs text-muted-foreground">{description}</p></div></div>
}

function Toggle({ checked, onChange, title, description }: { checked: boolean; onChange: (checked: boolean) => void; title: string; description: string }) {
  return <label className={`flex cursor-pointer gap-3 rounded-xl border p-3 transition ${checked ? 'border-primary/30 bg-primary/[0.035]' : 'bg-muted/10'}`}><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-1 h-4 w-4 accent-primary" /><span><b className="block text-sm">{title}</b><span className="mt-0.5 block text-xs leading-4 text-muted-foreground">{description}</span></span></label>
}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return <label className="block text-xs font-semibold text-muted-foreground"><span>{label}{required && <span className="ml-1 text-rose-600">*</span>}</span>{children}{hint && <span className="mt-1 block text-[10px] font-normal leading-4 text-muted-foreground/80">{hint}</span>}</label>
}
