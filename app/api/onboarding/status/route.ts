import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { organization } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    // Verify session
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // Get organization - in a real app, you'd need to associate users with orgs
    // For now, we'll return a simplified response
    const searchParams = req.nextUrl.searchParams
    const orgId = searchParams.get('orgId')

    if (!orgId) {
      return NextResponse.json(
        { message: 'Missing organization ID' },
        { status: 400 }
      )
    }

    const result = await db
      .select({
        id: organization.id,
        onboardingCompleted: organization.onboardingCompleted,
        onboardingStep: organization.onboardingStep,
      })
      .from(organization)
      .where(eq(organization.id, orgId))
      .limit(1)

    if (!result || result.length === 0) {
      return NextResponse.json(
        { message: 'Organization not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      onboardingCompleted: result[0].onboardingCompleted,
      currentStep: result[0].onboardingStep || 0,
    })
  } catch (error) {
    console.error('Onboarding status error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
