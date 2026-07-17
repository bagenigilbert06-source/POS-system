import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { OnboardingService } from '@/lib/services/onboarding-service'

export const dynamic = 'force-dynamic'

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ message: 'Sign in to continue.' }, { status: 401 })
  try {
    const result = await OnboardingService.complete(session.user.id, session.user.emailVerified)
    return NextResponse.json({ success: true, dashboardRoute: result.dashboardRoute })
  } catch (error) {
    const code = error instanceof Error ? error.message : ''
    if (code === 'EMAIL_NOT_VERIFIED') return NextResponse.json({ message: 'Verify your email before creating a workspace.' }, { status: 403 })
    if (code.startsWith('INCOMPLETE_STEP:')) return NextResponse.json({ message: 'Review the incomplete section before creating your workspace.', stepId: code.split(':')[1] }, { status: 422 })
    console.error('[onboarding/complete] Workspace transaction failed')
    return NextResponse.json({ message: 'We could not create the workspace. No partial setup was saved; please try again.' }, { status: 500 })
  }
}
