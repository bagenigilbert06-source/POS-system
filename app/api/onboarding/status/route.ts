import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { OnboardingService } from '@/lib/services/onboarding-service'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  try {
    const state = await OnboardingService.getOrCreate(session.user.id)
    return NextResponse.json({ status: state.status, currentStep: state.currentStep, completedSteps: state.completedSteps, revision: state.configurationVersion, lastSavedAt: state.lastSavedAt })
  } catch {
    return NextResponse.json({ message: 'Unable to load onboarding status.' }, { status: 500 })
  }
}
