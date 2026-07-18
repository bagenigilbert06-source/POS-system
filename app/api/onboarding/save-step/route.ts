import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { saveOnboardingStepSchema } from '@/lib/onboarding/schemas'
import { OnboardingService } from '@/lib/services/onboarding-service'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ message: 'Sign in to continue.' }, { status: 401 })

  try {
    const body = saveOnboardingStepSchema.safeParse(await request.json())
    if (!body.success) return NextResponse.json({ message: 'Check the submitted step.', fieldErrors: body.error.flatten().fieldErrors }, { status: 400 })
    const result = await OnboardingService.saveStep(session.user.id, body.data.stepId, body.data.data, body.data.revision)
    if (!result.ok) return NextResponse.json({ message: 'Check the highlighted fields.', fieldErrors: result.error.flatten().fieldErrors, formErrors: result.error.flatten().formErrors }, { status: 422 })
    return NextResponse.json({
      success: true,
      currentStep: result.state.currentStep,
      completedSteps: result.state.completedSteps,
      revision: result.state.configurationVersion,
      lastSavedAt: result.state.lastSavedAt,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_STEP_TRANSITION') return NextResponse.json({ message: 'Complete the current step before continuing.' }, { status: 409 })
    if (error instanceof Error && error.message === 'STALE_REVISION') return NextResponse.json({ code: 'STALE_REVISION', message: 'This setup changed in another tab. Reload to continue with the latest version.' }, { status: 409 })
    if (error instanceof Error && error.message === 'ONBOARDING_COMPLETE') return NextResponse.json({ success: true, completed: true })
    console.error('[onboarding/save-step] Failed to save onboarding progress')
    return NextResponse.json({ message: 'Your progress could not be saved. Nothing was lost—please try again.' }, { status: 500 })
  }
}
