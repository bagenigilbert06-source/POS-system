import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { organization } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    // Verify session
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { organizationId, onboardingData } = body

    if (!organizationId || !onboardingData) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Update organization with onboarding data
    const result = await db
      .update(organization)
      .set({
        name: onboardingData.businessName,
        businessType: onboardingData.businessType,
        businessEmail: onboardingData.businessEmail,
        phone: onboardingData.phone,
        country: onboardingData.country,
        timezone: onboardingData.timezone,
        businessSize: onboardingData.businessSize,
        onboardingCompleted: true,
        onboardingStep: 6,
        updatedAt: new Date(),
      })
      .where(eq(organization.id, organizationId))
      .returning()

    if (!result || result.length === 0) {
      return NextResponse.json(
        { message: 'Failed to update organization' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      organization: result[0],
    })
  } catch (error) {
    console.error('Onboarding error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
