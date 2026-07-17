import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { OnboardingService } from '@/lib/services/onboarding-service'

/** Initialize one durable draft. Business records are created only after review. */
export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const state = await OnboardingService.getOrCreate(session.user.id)
    return Response.json({ success: true, status: state.status, currentStep: state.currentStep })
  } catch {
    return Response.json({ error: 'Unable to initialize setup' }, { status: 500 })
  }
}
