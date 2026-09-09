import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { OnboardingService } from '@/lib/services/onboarding-service'
import { OnboardingContainer } from '@/components/onboarding/onboarding-container'
import { OnboardingLayout } from '@/components/onboarding/onboarding-layout'
import { DEFAULT_ONBOARDING_DATA, ONBOARDING_STEPS, type OnboardingDraft, type OnboardingStepId } from '@/lib/onboarding/config'
import { db } from '@/lib/db'
import { user } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getAuthorizationContext } from '@/lib/auth/authorization'
import { defaultWorkspaceRouteForRole } from '@/lib/auth/role-routing'

export const metadata: Metadata = { title: 'Set up your business | Pesaby' }

export default async function OnboardingPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')
  try {
    const authorization = await getAuthorizationContext()
    if (authorization.role !== 'owner' && authorization.role !== 'admin') redirect(defaultWorkspaceRouteForRole(authorization.role))
  } catch {
    // New owners without an organization continue through onboarding.
  }
  const [accountRows, state] = await Promise.all([
    db.select({ status: user.status }).from(user).where(eq(user.id, session.user.id)).limit(1),
    OnboardingService.getOrCreate(session.user.id),
  ])
  const account = accountRows[0]
  if (account?.status && account.status !== 'active') redirect('/restricted')
  if (state.status === 'completed') redirect('/dashboard')
  const step = ONBOARDING_STEPS.includes(state.currentStep as OnboardingStepId) ? state.currentStep as OnboardingStepId : 'welcome'
  const data = { ...DEFAULT_ONBOARDING_DATA, ...((state.data ?? {}) as Partial<OnboardingDraft>) }

  return <OnboardingLayout><OnboardingContainer initialStep={step} initialData={data} initialRevision={state.configurationVersion} /></OnboardingLayout>
}
