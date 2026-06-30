import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { organization, workspace } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { appendFileSync } from 'node:fs'
import { WorkspaceService } from '@/lib/services/workspace-service'
import { StarterDataService } from '@/lib/services/starter-data-service'
import { OrganizationService } from '@/lib/services/organization-service'

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

    // SECURITY: Verify that the user has access to this organization (is a member)
    const canAccess = await OrganizationService.canUserAccess(organizationId, session.user.id)
    if (!canAccess) {
      console.warn(`[v0] Unauthorized onboarding attempt by user ${session.user.id} for org ${organizationId}`)
      return NextResponse.json(
        { message: 'Forbidden: No access to this organization' },
        { status: 403 }
      )
    }

    // Create workspace configuration
    const workspaceConfig = WorkspaceService.createWorkspaceConfig(
      organizationId,
      onboardingData.businessType,
      onboardingData.customCategory
    )

    // Update workspace with the config
    try {
      await db
        .update(workspace)
        .set({
          config: workspaceConfig,
          updatedAt: new Date(),
        } as any)
        .where(eq(workspace.organizationId, organizationId))
    } catch (err) {
      console.warn('[v0] Failed to update workspace config:', err)
      // Continue anyway - workspace config is not critical
    }

    // Seed starter data
    const seedingSuccess = await StarterDataService.seedStarterData(
      organizationId,
      workspaceConfig
    )

    // Update organization with onboarding data
    const result = await db
      .update(organization)
      .set({
        name: onboardingData.businessName,
        businessType: onboardingData.businessType,
        businessCategory: onboardingData.customCategory,
        businessEmail: onboardingData.businessEmail,
        phone: onboardingData.phone,
        country: onboardingData.country,
        timezone: onboardingData.timezone,
        businessSize: onboardingData.businessSize,
        businessDescription: onboardingData.businessDescription,
        onboardingCompleted: true,
        onboardingStep: 6,
        updatedAt: new Date(),
      } as any)
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
      workspaceConfig,
      dataSeedingSuccess: seedingSuccess,
    })
  } catch (error) {
    console.error('Onboarding error:', error)
    try {
      const errMsg = typeof error === 'object' ? JSON.stringify(error, Object.getOwnPropertyNames(error), 2) : String(error)
      appendFileSync('onboarding-error.log', `${new Date().toISOString()} - ${errMsg}\n\n`)
    } catch (e) {
      console.error('Failed to write onboarding-error.log', e)
    }
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
