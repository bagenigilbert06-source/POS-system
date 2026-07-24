'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import {
  ArrowLeft, ArrowRight, Banknote, Building2, Check, CheckCircle2, Clock3, CreditCard,
  FileText, Landmark, Loader2, MapPin, Package, ReceiptText, ShieldCheck, Smartphone,
  Users, WalletCards,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  BUSINESS_FAMILIES, ONBOARDING_STEPS, REQUIRED_MODULES, WORKING_MODULES, categoriesFor, categoryLabel, familyFor, recommendedModules,
  type OnboardingDraft, type OnboardingStepId,
} from '@/lib/onboarding/config'

type FieldErrors = Record<string, string[] | undefined>

const STEP_LABELS: Record<OnboardingStepId, string> = {
  welcome: 'Welcome', 'business-details': 'Business', 'business-type': 'Type', operations: 'Operations',
  'main-branch': 'Main branch', modules: 'Modules', 'payments-tax': 'Payments & tax', receipt: 'Receipt', review: 'Review',
}

const OPERATION_OPTIONS: Array<{ key: keyof OnboardingDraft; title: string; description: string }> = [
  { key: 'sellsProducts', title: 'Sell products', description: 'Products are part of daily sales.' },
  { key: 'providesServices', title: 'Provide services', description: 'Services are sold or recorded.' },
  { key: 'tracksInventory', title: 'Track inventory', description: 'Monitor stock levels and movement.' },
  { key: 'hasEmployees', title: 'Manage employees', description: 'Staff need controlled access.' },
  { key: 'multipleLocations', title: 'Multiple locations', description: 'The business operates in more than one place.' },
  { key: 'keepsCustomers', title: 'Keep customer records', description: 'Save customer details and activity.' },
  { key: 'usesSuppliers', title: 'Work with suppliers', description: 'Purchasing depends on supplier records.' },
  { key: 'acceptsCash', title: 'Accept cash', description: 'Record cash payments.' },
  { key: 'acceptsMpesa', title: 'Accept M-Pesa', description: 'Record M-Pesa references manually.' },
  { key: 'acceptsCard', title: 'Accept cards', description: 'Record card payments manually.' },
  { key: 'needsTax', title: 'Calculate tax', description: 'Apply a configured tax rate.' },
  { key: 'issuesReceipts', title: 'Issue receipts', description: 'Print or share supported receipts.' },
]

const PAYMENT_METHODS = [
  { id: 'cash', label: 'Cash', icon: Banknote }, { id: 'mpesa', label: 'M-Pesa', icon: Smartphone },
  { id: 'card', label: 'Card', icon: CreditCard }, { id: 'bank_transfer', label: 'Bank transfer', icon: Landmark },
  { id: 'other', label: 'Other', icon: WalletCards },
]

function Field({ label, name, value, onChange, error, optional, type = 'text', placeholder, autoComplete }: {
  label: string; name: keyof OnboardingDraft; value: string; onChange: (name: keyof OnboardingDraft, value: string) => void;
  error?: string[]; optional?: boolean; type?: string; placeholder?: string; autoComplete?: string
}) {
  const errorId = `${String(name)}-error`
  return <label className="block min-w-0 text-sm font-semibold text-slate-900">
    <span>{label}{optional && <span className="ml-1 font-normal text-zinc-500">(optional)</span>}</span>
    <input name={String(name)} type={type} value={value} placeholder={placeholder} autoComplete={autoComplete}
      aria-invalid={Boolean(error?.length)} aria-describedby={error?.length ? errorId : undefined}
      onChange={(event) => onChange(name, event.target.value)}
      className="mt-2 h-12 w-full rounded-lg border border-zinc-300 bg-white px-3.5 text-base text-slate-950 outline-none transition-colors placeholder:text-zinc-400 focus:border-[#e42527] focus:ring-2 focus:ring-[#e42527]/15 aria-[invalid=true]:border-red-500" />
    {error?.[0] && <span id={errorId} className="mt-1.5 block text-xs font-medium text-red-700">{error[0]}</span>}
  </label>
}

function SelectField({ label, name, value, onChange, children, error }: { label: string; name: keyof OnboardingDraft; value: string; onChange: (name: keyof OnboardingDraft, value: string) => void; children: React.ReactNode; error?: string[] }) {
  return <label className="block text-sm font-semibold text-slate-900">{label}
    <select name={String(name)} value={value} onChange={(event) => onChange(name, event.target.value)} aria-invalid={Boolean(error?.length)}
      className="mt-2 h-12 w-full rounded-lg border border-zinc-300 bg-white px-3.5 text-base outline-none focus:border-[#e42527] focus:ring-2 focus:ring-[#e42527]/15">{children}</select>
    {error?.[0] && <span className="mt-1.5 block text-xs font-medium text-red-700">{error[0]}</span>}
  </label>
}

export function OnboardingContainer({ initialStep, initialData, initialRevision }: { initialStep: OnboardingStepId; initialData: OnboardingDraft; initialRevision: number }) {
  const router = useRouter()
  const [stepIndex, setStepIndex] = useState(Math.max(0, ONBOARDING_STEPS.indexOf(initialStep)))
  const [maxUnlockedStep, setMaxUnlockedStep] = useState(Math.max(0, ONBOARDING_STEPS.indexOf(initialStep)))
  const [data, setData] = useState(initialData)
  const [revision, setRevision] = useState(initialRevision)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [pageError, setPageError] = useState('')
  const [saving, setSaving] = useState(false)
  const stepId = ONBOARDING_STEPS[stepIndex]
  const progress = Math.round((stepIndex / (ONBOARDING_STEPS.length - 1)) * 100)

  useEffect(() => {
    const current = ONBOARDING_STEPS[stepIndex]
    const url = new URL(window.location.href)
    url.searchParams.set('step', current)
    window.history.replaceState({ onboardingStep: current }, '', url)
    const onPopState = () => {
      const requested = new URL(window.location.href).searchParams.get('step') as OnboardingStepId | null
      const index = requested ? ONBOARDING_STEPS.indexOf(requested) : -1
      if (index >= 0 && index <= maxUnlockedStep) setStepIndex(index)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [maxUnlockedStep, stepIndex])

  const navigateTo = (index: number) => {
    const nextIndex = Math.max(0, Math.min(index, ONBOARDING_STEPS.length - 1))
    const nextStep = ONBOARDING_STEPS[nextIndex]
    const url = new URL(window.location.href)
    url.searchParams.set('step', nextStep)
    window.history.pushState({ onboardingStep: nextStep }, '', url)
    setStepIndex(nextIndex)
  }

  const update = (name: keyof OnboardingDraft, value: string | boolean | string[]) => {
    setData((current) => {
      const next = { ...current, [name]: value }
      if (name === 'businessName' && !current.receiptBusinessName) next.receiptBusinessName = value as string
      if (name === 'phone') {
        if (!current.branchPhone) next.branchPhone = value as string
        if (!current.receiptPhone) next.receiptPhone = value as string
      }
      if (name === 'region' && !current.branchRegion) next.branchRegion = value as string
      if (name === 'city' && !current.branchCity) next.branchCity = value as string
      return next
    })
    setErrors((current) => ({ ...current, [name]: undefined }))
    setPageError('')
  }

  const saveStep = async (): Promise<number | false> => {
    setSaving(true); setPageError(''); setErrors({})
    try {
      const synchronizedData = stepId === 'operations' ? {
        ...data,
        enabledModules: recommendedModules(data),
        paymentMethods: [data.acceptsCash && 'cash', data.acceptsMpesa && 'mpesa', data.acceptsCard && 'card'].filter(Boolean) as string[],
        defaultPaymentMethod: data.acceptsCash ? 'cash' : data.acceptsMpesa ? 'mpesa' : 'card',
        taxEnabled: data.needsTax,
        pricesIncludeTax: data.needsTax ? data.pricesIncludeTax : false,
        showTaxOnReceipt: data.needsTax && data.issuesReceipts ? data.showTaxOnReceipt : false,
      } : data
      const submittedData = stepId === 'receipt' ? {
        ...synchronizedData,
        receiptBusinessName: synchronizedData.receiptBusinessName || synchronizedData.displayName || synchronizedData.businessName,
        receiptPhone: synchronizedData.receiptPhone || synchronizedData.phone,
        receiptAddress: synchronizedData.receiptAddress || synchronizedData.branchAddress,
      } : synchronizedData
      const response = await fetch('/api/onboarding/save-step', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stepId, data: submittedData, revision }) })
      const result = await response.json()
      if (!response.ok) {
        setErrors(result.fieldErrors ?? {})
        setPageError(result.formErrors?.[0] ?? result.message ?? 'Check this step and try again.')
        requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
        return false
      }
      setData(submittedData)
      setRevision(result.revision)
      const serverStepIndex = ONBOARDING_STEPS.indexOf(result.currentStep as OnboardingStepId)
      setMaxUnlockedStep(serverStepIndex >= 0 ? serverStepIndex : Math.min(stepIndex + 1, ONBOARDING_STEPS.length - 1))
      return result.revision as number
    } catch {
      setPageError('Your progress could not be saved. Check your connection and try again.')
      return false
    } finally { setSaving(false) }
  }

  const next = async () => {
    const savedRevision = await saveStep()
    if (!savedRevision) return
    if (stepId === 'review') {
      setSaving(true)
      try {
        const response = await fetch('/api/onboarding/complete', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ revision: savedRevision }) })
        const result = await response.json()
        if (!response.ok) {
          if (result.stepId && ONBOARDING_STEPS.includes(result.stepId)) navigateTo(ONBOARDING_STEPS.indexOf(result.stepId))
          setPageError(result.message ?? 'Workspace creation failed safely. Please try again.')
          return
        }
        router.replace(result.dashboardRoute ?? '/dashboard'); router.refresh()
      } catch { setPageError('Workspace creation failed safely. Check your connection and try again.') }
      finally { setSaving(false) }
      return
    }
    navigateTo(Math.min(stepIndex + 1, ONBOARDING_STEPS.length - 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const previous = () => { setErrors({}); setPageError(''); navigateTo(stepIndex - 1) }
  const edit = (id: OnboardingStepId) => navigateTo(ONBOARDING_STEPS.indexOf(id))

  const setBusinessFamily = (id: string) => {
    const firstCategory = categoriesFor(id)[0]?.id ?? ''
    setData((current) => ({ ...current, businessFamily: id as OnboardingDraft['businessFamily'], businessCategory: firstCategory, customBusinessCategory: '' }))
    setErrors((current) => ({ ...current, businessFamily: undefined, businessCategory: undefined, customBusinessCategory: undefined }))
  }

  const renderedStep = (() => {
    if (stepId === 'welcome') return <div className="mx-auto max-w-2xl text-center">
      <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-[#ffda32]"><Building2 className="h-7 w-7" /></div>
      <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#e42527]">Workspace setup</p>
      <h1 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-slate-950 sm:text-4xl">Let’s set up your business</h1>
      <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-zinc-600">Tell us how your business operates and Pesaby will prepare the right workspace, tools and defaults for you.</p>
      <div className="mx-auto mt-8 grid max-w-xl gap-3 text-left sm:grid-cols-3">
        {[['5–8 minutes', Clock3], ['Saved as you go', ShieldCheck], ['Editable later', CheckCircle2]].map(([label, Icon]) => <div key={label as string} className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-[#fff9ef] p-3 text-sm font-semibold"><Icon className="h-5 w-5 text-[#e42527]" />{label as string}</div>)}
      </div>
      <button type="button" onClick={async () => { await authClient.signOut(); router.replace('/sign-in') }} className="mt-6 text-sm font-semibold text-zinc-600 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e42527]">Sign out</button>
    </div>

    if (stepId === 'business-details') return <section><StepTitle eyebrow="Business details" title="Tell us about your business" description="These details become the defaults for your workspace and main location." />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Business name" name="businessName" value={data.businessName} onChange={update} error={errors.businessName} placeholder="Acme Traders" autoComplete="organization" />
        <Field label="Display name" name="displayName" value={data.displayName} onChange={update} error={errors.displayName} optional placeholder="Name shown to customers" />
        <SelectField label="Country" name="country" value={data.country} onChange={update} error={errors.country}><option value="KE">Kenya</option></SelectField>
        <Field label="County or region" name="region" value={data.region} onChange={update} error={errors.region} placeholder="Nairobi" autoComplete="address-level1" />
        <Field label="City or town" name="city" value={data.city} onChange={update} error={errors.city} placeholder="Nairobi" autoComplete="address-level2" />
        <Field label="Business phone" name="phone" value={data.phone} onChange={update} error={errors.phone} placeholder="+254 700 000 000" type="tel" autoComplete="tel" />
        <Field label="Business email" name="businessEmail" value={data.businessEmail} onChange={update} error={errors.businessEmail} optional placeholder="hello@business.com" type="email" autoComplete="email" />
        <Field label="Website" name="website" value={data.website} onChange={update} error={errors.website} optional placeholder="https://business.com" type="url" />
        <SelectField label="Preferred language" name="language" value={data.language} onChange={update}><option value="en">English</option><option value="sw">Kiswahili</option></SelectField>
        <SelectField label="Time zone" name="timezone" value={data.timezone} onChange={update}><option value="Africa/Nairobi">Africa/Nairobi</option></SelectField>
        <SelectField label="Default currency" name="currency" value={data.currency} onChange={update}><option value="KES">Kenyan shilling (KES)</option></SelectField>
        <SelectField label="Financial year starts" name="financialYearStart" value={data.financialYearStart} onChange={update}><option value="01-01">1 January</option><option value="07-01">1 July</option></SelectField>
      </div>
    </section>

    if (stepId === 'business-type') return <section><StepTitle eyebrow="Business profile" title="What kind of business do you run?" description="Choose a broad family and then the category that best describes your day-to-day work." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{BUSINESS_FAMILIES.map(({ id, name, description, icon: Icon }) => { const selected = data.businessFamily === id; return <button type="button" key={id} aria-pressed={selected} onClick={() => setBusinessFamily(id)} className={cn('relative flex min-h-32 gap-4 rounded-xl border p-5 text-left outline-none focus-visible:ring-2 focus-visible:ring-[#e42527]', selected ? 'border-slate-950 bg-[#fff4c4]' : 'border-zinc-200 bg-white')}><span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-lg', selected ? 'bg-[#ffda32]' : 'bg-zinc-100')}><Icon className="h-5 w-5" /></span><span><span className="block font-extrabold text-slate-950">{name}</span><span className="mt-1 block text-sm leading-6 text-zinc-600">{description}</span></span>{selected && <Check className="absolute right-4 top-4 h-5 w-5 text-[#e42527]" />}</button> })}</div>
      {errors.businessFamily?.[0] && <p className="mt-2 text-xs font-semibold text-red-700">{errors.businessFamily[0]}</p>}
      {data.businessFamily && <div className="mt-6 grid gap-5 sm:grid-cols-2"><SelectField label="Business category" name="businessCategory" value={data.businessCategory} onChange={update} error={errors.businessCategory}><option value="">Select a category</option>{categoriesFor(data.businessFamily).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</SelectField>{data.businessFamily === 'other' && <Field label="Describe your business" name="customBusinessCategory" value={data.customBusinessCategory} onChange={update} error={errors.customBusinessCategory} placeholder="For example, event equipment hire" />}</div>}
    </section>

    if (stepId === 'operations') return <section><StepTitle eyebrow="Operations profile" title="How does your business work?" description="Choose only what applies. These answers shape your modules and settings." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{OPERATION_OPTIONS.map(({ key, title, description }) => { const checked = Boolean(data[key]); return <label key={key} className={cn('cursor-pointer rounded-xl border p-4 transition-colors focus-within:ring-2 focus-within:ring-[#e42527]', checked ? 'border-[#e7be16] bg-[#fff8d7]' : 'border-zinc-200 bg-white')}><span className="flex items-start gap-3"><input type="checkbox" checked={checked} onChange={(event) => update(key, event.target.checked)} className="mt-1 h-4 w-4 accent-[#e42527]" /><span><span className="block text-sm font-extrabold text-slate-950">{title}</span><span className="mt-1 block text-xs leading-5 text-zinc-600">{description}</span></span></span></label> })}</div>
    </section>

    if (stepId === 'main-branch') return <section><StepTitle eyebrow="Main branch" title="Set up your first location" description="Pesaby creates this branch once and gives the workspace owner full access." />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Branch name" name="branchName" value={data.branchName} onChange={update} error={errors.branchName} placeholder="Main Branch" />
        <Field label="Branch phone" name="branchPhone" value={data.branchPhone} onChange={update} error={errors.branchPhone} placeholder="+254 700 000 000" type="tel" />
        <Field label="Address" name="branchAddress" value={data.branchAddress} onChange={update} error={errors.branchAddress} placeholder="Street and building" />
        <Field label="County or region" name="branchRegion" value={data.branchRegion} onChange={update} error={errors.branchRegion} placeholder="Nairobi" />
        <Field label="City or town" name="branchCity" value={data.branchCity} onChange={update} error={errors.branchCity} placeholder="Nairobi" />
        <SelectField label="Time zone" name="branchTimezone" value={data.branchTimezone} onChange={update}><option value="Africa/Nairobi">Africa/Nairobi</option></SelectField>
        <div className="sm:col-span-2"><Field label="Receipt header" name="receiptHeader" value={data.receiptHeader} onChange={update} error={errors.receiptHeader} optional placeholder="Main branch" /></div>
      </div>
    </section>

    if (stepId === 'modules') return <section><StepTitle eyebrow="Workspace modules" title="Your recommended workspace" description="Pesaby has matched these working modules to the operations you selected. Required operational modules stay aligned with those answers." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{WORKING_MODULES.map((module) => { const alwaysRequired = REQUIRED_MODULES.includes(module.id as never); const operationallyRequired = (module.id === 'products' && data.sellsProducts) || (module.id === 'inventory' && data.tracksInventory) || (module.id === 'customers' && data.keepsCustomers); const incompatible = (module.id === 'products' && !data.sellsProducts) || (module.id === 'inventory' && !data.tracksInventory) || (module.id === 'customers' && !data.keepsCustomers); const locked = alwaysRequired || operationallyRequired || incompatible; const checked = data.enabledModules.includes(module.id); const status = alwaysRequired || operationallyRequired ? 'Required' : module.id === 'pos' && data.sellsProducts ? 'Recommended' : 'Optional'; return <label key={module.id} className={cn('rounded-xl border p-4', checked ? 'border-[#e7be16] bg-[#fff8d7]' : 'border-zinc-200', incompatible && 'bg-zinc-50 opacity-65')}><span className="flex items-start gap-3"><input type="checkbox" checked={checked} disabled={locked} onChange={() => update('enabledModules', checked ? data.enabledModules.filter((id) => id !== module.id) : [...data.enabledModules, module.id])} className="mt-1 h-4 w-4 accent-[#e42527]" /><span><span className="flex items-center gap-2 text-sm font-extrabold">{module.name}<span className="rounded bg-white px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-zinc-500">{incompatible ? 'Not needed' : status}</span></span><span className="mt-1 block text-xs leading-5 text-zinc-600">{module.description}</span></span></span></label> })}</div>
    </section>

    if (stepId === 'payments-tax') return <section><StepTitle eyebrow="Payments & tax" title="Configure how you record money" description="These methods are available for manual recording. No payment integration is connected by this step." />
      <h3 className="mb-3 text-sm font-extrabold">Payment methods</h3><div className="grid gap-3 sm:grid-cols-3">{PAYMENT_METHODS.map(({ id, label, icon: Icon }) => { const checked = data.paymentMethods.includes(id); return <label key={id} className={cn('flex items-center gap-3 rounded-lg border p-3', checked ? 'border-[#e7be16] bg-[#fff8d7]' : 'border-zinc-200')}><input type="checkbox" checked={checked} onChange={() => { const methods = checked ? data.paymentMethods.filter((method) => method !== id) : [...data.paymentMethods, id]; update('paymentMethods', methods); if (id === 'cash') update('acceptsCash', !checked); if (id === 'mpesa') update('acceptsMpesa', !checked); if (id === 'card') update('acceptsCard', !checked); if (!methods.includes(data.defaultPaymentMethod)) update('defaultPaymentMethod', methods[0] ?? '') }} className="h-4 w-4 accent-[#e42527]" /><Icon className="h-5 w-5" /><span className="text-sm font-bold">{label}</span></label> })}</div>
      {errors.paymentMethods?.[0] && <p className="mt-2 text-xs font-semibold text-red-700">{errors.paymentMethods[0]}</p>}
      <div className="mt-5 grid gap-5 sm:grid-cols-2"><SelectField label="Default payment method" name="defaultPaymentMethod" value={data.defaultPaymentMethod} onChange={update} error={errors.defaultPaymentMethod}>{data.paymentMethods.map((id) => <option key={id} value={id}>{PAYMENT_METHODS.find((method) => method.id === id)?.label ?? id}</option>)}</SelectField>
        <label className="flex min-h-12 items-center gap-3 rounded-lg border border-zinc-200 px-4 text-sm font-bold"><input type="checkbox" checked={data.taxEnabled} onChange={(event) => { update('taxEnabled', event.target.checked); update('needsTax', event.target.checked) }} className="h-4 w-4 accent-[#e42527]" />Apply tax calculations</label></div>
      {data.taxEnabled && <div className="mt-5 grid gap-5 rounded-xl bg-[#fff9ef] p-5 sm:grid-cols-2"><Field label="Tax name" name="taxName" value={data.taxName} onChange={update} error={errors.taxName} placeholder="VAT" /><Field label="Tax rate (%)" name="taxRate" value={data.taxRate} onChange={update} error={errors.taxRate} type="number" /><Field label="Tax identifier" name="taxIdentifier" value={data.taxIdentifier} onChange={update} error={errors.taxIdentifier} optional placeholder="Business PIN" /><label className="flex items-center gap-3 text-sm font-bold"><input type="checkbox" checked={data.pricesIncludeTax} onChange={(event) => update('pricesIncludeTax', event.target.checked)} className="h-4 w-4 accent-[#e42527]" />Prices already include tax</label></div>}
    </section>

    if (stepId === 'receipt' && !data.issuesReceipts) return <section><StepTitle eyebrow="Receipt settings" title="Receipts are not enabled" description="You told us this workspace does not issue receipts. Pesaby will keep receipt controls out of the initial workflow; you can enable them later in settings." /><div className="rounded-xl border border-[#e7be16] bg-[#fff8d7] p-5 text-sm leading-6 text-[#344054]">No receipt configuration is needed for this workspace.</div></section>

    if (stepId === 'receipt') return <section><StepTitle eyebrow="Receipt settings" title="Set your receipt defaults" description="Preview the business details Pesaby can show on supported receipts." />
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]"><div className="grid gap-5 sm:grid-cols-2"><Field label="Receipt business name" name="receiptBusinessName" value={data.receiptBusinessName || data.displayName || data.businessName} onChange={update} error={errors.receiptBusinessName} /><Field label="Business phone" name="receiptPhone" value={data.receiptPhone || data.phone} onChange={update} error={errors.receiptPhone} type="tel" /><div className="sm:col-span-2"><Field label="Address" name="receiptAddress" value={data.receiptAddress || data.branchAddress} onChange={update} error={errors.receiptAddress} optional /></div><div className="sm:col-span-2"><Field label="Footer message" name="receiptFooter" value={data.receiptFooter} onChange={update} error={errors.receiptFooter} optional /></div><label className="flex items-center gap-3 text-sm font-bold"><input type="checkbox" disabled={!data.taxEnabled} checked={data.taxEnabled && data.showTaxOnReceipt} onChange={(event) => update('showTaxOnReceipt', event.target.checked)} className="h-4 w-4 accent-[#e42527]" />Show tax on receipt</label></div>
        <div aria-label="Receipt preview" className="rounded-xl border border-zinc-300 bg-[#fffdf8] p-6 text-center shadow-sm"><ReceiptText className="mx-auto h-6 w-6" /><p className="mt-3 font-extrabold">{data.receiptBusinessName || data.displayName || data.businessName || 'Your business'}</p><p className="mt-1 text-xs text-zinc-500">{data.receiptAddress || data.branchAddress || 'Business address'}</p><div className="my-5 border-t border-dashed border-zinc-300" /><div className="flex justify-between text-sm"><span>Receipt number</span><span>AUTOMATIC</span></div><div className="my-5 border-t border-dashed border-zinc-300" /><p className="text-xs text-zinc-600">{data.receiptFooter || 'Thank you for your business.'}</p></div></div>
    </section>

    return <section><StepTitle eyebrow="Review" title="Check your workspace setup" description="Review each section before creation. You can change these settings later." />
      <div className="grid gap-3 sm:grid-cols-2">{[
        ['Business', data.businessName, `${data.city}, ${data.region} · ${data.currency}`, 'business-details'],
        ['Business profile', familyFor(data.businessFamily)?.name ?? 'Not selected', categoryLabel(data.businessFamily, data.businessCategory, data.customBusinessCategory), 'business-type'],
        ['Operations', data.sellsProducts && data.providesServices ? 'Products and services' : data.sellsProducts ? 'Products' : 'Services', `${data.enabledModules.length} modules matched to your workflow`, 'operations'],
        ['Main branch', data.branchName, `${data.branchAddress}, ${data.branchCity}`, 'main-branch'],
        ['Modules', `${data.enabledModules.length} enabled`, data.enabledModules.join(', '), 'modules'],
        ['Payments & tax', data.paymentMethods.join(', '), data.taxEnabled ? `${data.taxName} at ${data.taxRate}%` : 'Tax not enabled', 'payments-tax'],
        ['Receipt', data.issuesReceipts ? data.receiptBusinessName || data.businessName : 'Not enabled', data.issuesReceipts ? data.receiptFooter || 'No footer message' : 'Receipt controls stay out of the initial workflow', 'receipt'],
      ].map(([title, value, description, target]) => <div key={title} className="rounded-xl border border-zinc-200 p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-extrabold uppercase tracking-[0.15em] text-[#e42527]">{title}</p><p className="mt-2 font-extrabold text-slate-950">{value}</p><p className="mt-1 text-sm leading-5 text-zinc-600">{description}</p></div><button type="button" onClick={() => edit(target as OnboardingStepId)} className="text-sm font-bold text-slate-700 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e42527]">Edit</button></div></div>)}</div>
    </section>
  })()

  return <div className="w-full">
    {stepId !== 'welcome' && <div className="mb-8"><div className="flex items-center justify-between gap-4 text-xs font-bold text-zinc-600"><span>Step {stepIndex + 1} of {ONBOARDING_STEPS.length} — {STEP_LABELS[stepId]}</span><span>{progress}%</span></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-200" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-label="Onboarding progress"><div className="h-full rounded-full bg-[#ffda32] transition-[width] motion-reduce:transition-none" style={{ width: `${progress}%` }} /></div></div>}
    {pageError && <div role="alert" className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{pageError}</div>}
    {renderedStep}
    <div className="mt-8 flex items-center justify-between border-t border-zinc-200 pt-6">
      {stepIndex > 0 ? <button type="button" onClick={previous} disabled={saving} className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-bold text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e42527] disabled:opacity-50"><ArrowLeft className="h-4 w-4" />Back</button> : <span />}
      <button type="button" onClick={next} disabled={saving} className="inline-flex min-h-12 min-w-40 items-center justify-center gap-2 rounded-lg bg-[#e42527] px-6 text-sm font-extrabold text-white shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[#e42527] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60">{saving && <Loader2 className="h-4 w-4 animate-spin" />}{stepId === 'welcome' ? 'Start setup' : stepId === 'review' ? 'Create my workspace' : 'Save & continue'}{!saving && <ArrowRight className="h-4 w-4" />}</button>
    </div>
    {stepId !== 'welcome' && <p className="mt-4 text-right text-xs text-zinc-500">Progress is saved securely after each completed step.</p>}
  </div>
}

function StepTitle({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div className="mb-7"><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#e42527]">{eyebrow}</p><h1 className="mt-2 text-2xl font-extrabold tracking-[-0.035em] text-slate-950 sm:text-3xl">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 sm:text-base">{description}</p></div>
}
