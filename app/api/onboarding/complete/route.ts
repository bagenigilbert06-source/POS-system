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
    // ── Auth ────────────────────────────────────────────────────────────────
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

    // ── 1. Resolve businessCategory (use customCategory when "Other" was chosen) ──
    const businessCategory = onboardingData.customCategory || onboardingData.businessCategory || 'other_retail'
    const businessType = onboardingData.businessType || 'retail'

    // ── 2. Build workspace config from businessType + businessCategory ────────
    //      WorkspaceService.createWorkspaceConfig looks up the template registry —
    //      no if/else chains, no hardcoded catalogs.
    const workspaceConfig = WorkspaceService.createWorkspaceConfig(
      organizationId,
      businessType,
      businessCategory
    )

    // ── 3. Upsert workspace config row ────────────────────────────────────────
    try {
      const existing = await db
        .select({ id: workspace.id })
        .from(workspace)
        .where(eq(workspace.organizationId, organizationId))
        .limit(1)

      if (existing.length > 0) {
        await db
          .update(workspace)
          .set({ config: workspaceConfig as any, updatedAt: new Date() })
          .where(eq(workspace.organizationId, organizationId))
      }
      // If no workspace row exists yet it was never created — seeding still
      // succeeds; the config is persisted on the org row via templateId.
    } catch (err) {
      console.warn('[onboarding/complete] workspace upsert skipped:', err)
    }

    // ── 4. Seed starter categories & products (transactional) ─────────────────
    const seedResult = await StarterDataService.seedStarterData(
      organizationId,
      session.user.id,
      workspaceConfig
    )

    if (!seedResult.success) {
      console.warn('[onboarding/complete] Starter data seeding partially failed — continuing')
    }

    // ── 5. Mark onboarding complete, persist all fields ─────────────────────
    let updatedOrg
    try {
      updatedOrg = await OrganizationService.updateOrganization(organizationId, session.user.id, {
        name: onboardingData.businessName,
        businessType,
        businessCategory,
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

    // ── 6. Return the dashboard route so the client can redirect correctly ─────
    const dashboardRoute = WorkspaceService.getDashboardRoute(businessType)

    return NextResponse.json({
      success: true,
      organization: updatedOrg,
      templateId: workspaceConfig.templateId,
      dashboardRoute,
      seeding: seedResult,
    })
  } catch (error) {
    console.error('[onboarding/complete] Unhandled error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ message }, { status: 500 })
  }
}
