import { Loader2 } from 'lucide-react'
import { OnboardingLayout } from '@/components/onboarding/onboarding-layout'

export default function OnboardingLoading() {
  return (
    <OnboardingLayout>
      <div className="flex min-h-[420px] flex-col items-center justify-center text-center" role="status" aria-live="polite">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#ffda32] text-slate-950 shadow-sm ring-1 ring-black/5">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
        </span>
        <p className="mt-5 text-sm font-bold text-slate-950">Preparing your workspace</p>
        <p className="mt-1 text-xs leading-5 text-zinc-500">Loading your saved business setup…</p>
      </div>
    </OnboardingLayout>
  )
}
