import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { workspace } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { WorkspaceService } from '@/lib/services/workspace-service'
import { StarterDataService } from '@/lib/services/starter-data-service'
import { OrganizationService } from '@/lib/services/organization-service'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    // ------------------------------------------------------------------
    // Auth
    // ------------------------------------------------------------------
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { organizationId, onboardingData } = body

    if (!organizationId || !onboardingData) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 })
    }

    // SECURITY: Verify the authenticated user owns this org
    const canAccess = await OrganizationService.canUserAccess(organizationId, session.user.id)
    if (!canAccess) {
      return NextResponse.json({ message: 'Forbidden: No access to this organization' }, { status: 403 })
    }

    // ------------------------------------------------------------------
    // 1. Build workspace config from the chosen business type / category
    // ------------------------------------------------------------------
    const workspaceConfig = WorkspaceService.createWorkspaceConfig(
      organizationId,
      onboardingData.businessType,
      onboardingData.customCategory
    )

    // ------------------------------------------------------------------
    // 2. Upsert workspace config row
    // ------------------------------------------------------------------
    try {
      await db
        .update(workspace)
        .set({ config: workspaceConfig, updatedAt: new Date() } as any)
        .where(eq(workspace.organizationId, organizationId))
    } catch (err) {
      // Not fatal — workspace may not exist yet for this org
      console.warn('[onboarding/complete] workspace config update skipped:', err)
    }

    // ------------------------------------------------------------------
    // 3. Seed starter categories & products (real DB inserts)
    // ------------------------------------------------------------------
    const seedResult = await StarterDataService.seedStarterData(
      organizationId,
      session.user.id,
      workspaceConfig
    )

    if (!seedResult.success) {
      console.warn('[onboarding/complete] Starter data seeding partially failed — continuing')
    }

    // ------------------------------------------------------------------
    // 4. Mark onboarding complete and persist all collected fields
    // ------------------------------------------------------------------
    let updatedOrg
    try {
      updatedOrg = await OrganizationService.updateOrganization(organizationId, session.user.id, {
        name: onboardingData.businessName,
        businessType: onboardingData.businessType,
        // Store the custom category name when "Other" was selected
        businessCategory: onboardingData.customCategory || onboardingData.businessCategory,
        businessEmail: onboardingData.businessEmail,
        phone: onboardingData.phone,
        country: onboardingData.country,
        timezone: onboardingData.timezone,
        businessSize: onboardingData.businessSize,
        businessDescription: onboardingData.businessDescription ?? null,
        onboardingCompleted: true,
        onboardingStep: 6,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update organization'
      return NextResponse.json({ message }, { status: 500 })
    }

    if (!updatedOrg) {
      return NextResponse.json({ message: 'Failed to update organization' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      organization: updatedOrg,
      workspaceConfig,
      seeding: seedResult,
    })
  } catch (error) {
    console.error('[onboarding/complete] Unhandled error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ message }, { status: 500 })
  }
}
