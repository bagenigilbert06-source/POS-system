import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { OrganizationService } from '@/lib/services/organization-service'

export const dynamic = 'force-dynamic'

/**
 * STEP_FIELDS maps each step index to the org columns it persists.
 * Only the fields relevant to a step are written to the DB on each call,
 * so a refresh mid-flow loses at most the current unsaved step.
 */
const STEP_FIELDS: Record<number, string[]> = {
  0: ['businessType'],
  1: ['businessCategory'],
  2: ['name', 'businessEmail', 'phone'],
  3: ['country', 'timezone'],
  4: ['businessSize'],
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { organizationId, step, stepData } = body as {
      organizationId: string
      step: number
      stepData: Record<string, any>
    }

    if (!organizationId || step === undefined || !stepData) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 })
    }

    const canAccess = await OrganizationService.canUserAccess(organizationId, session.user.id)
    if (!canAccess) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    // Only persist the fields that belong to this step
    const allowedFields = STEP_FIELDS[step] ?? []
    const filteredData: Record<string, any> = {}
    for (const field of allowedFields) {
      if (stepData[field] !== undefined) {
        filteredData[field] = stepData[field]
      }
    }

    // customCategory comes from step 1 but maps to businessCategory in the DB
    if (step === 1 && stepData.customCategory) {
      filteredData.businessCategory = stepData.customCategory
    }

    await OrganizationService.saveOnboardingStep(
      organizationId,
      session.user.id,
      step + 1, // advance the cursor so we can resume from the next step
      filteredData
    )

    return NextResponse.json({ success: true, savedStep: step })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ message }, { status: 500 })
  }
}
