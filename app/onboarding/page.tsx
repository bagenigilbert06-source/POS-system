import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { OnboardingService } from '@/lib/services/onboarding-service'
import { OnboardingContainer } from '@/components/onboarding/onboarding-container'
import { OnboardingLayout } from '@/components/onboarding/onboarding-layout'
import { DEFAULT_ONBOARDING_DATA, ONBOARDING_STEPS, type OnboardingDraft, type OnboardingStepId } from '@/lib/onboarding/config'

export const metadata: Metadata = { title: 'Set up your business | Pesaby' }

export default async function OnboardingPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')
  const state = await OnboardingService.getOrCreate(session.user.id)
  if (state.status === 'completed') redirect('/dashboard')
  const step = ONBOARDING_STEPS.includes(state.currentStep as OnboardingStepId) ? state.currentStep as OnboardingStepId : 'welcome'
  const data = { ...DEFAULT_ONBOARDING_DATA, ...((state.data ?? {}) as Partial<OnboardingDraft>) }

  return <OnboardingLayout><OnboardingContainer initialStep={step} initialData={data} /></OnboardingLayout>
}
