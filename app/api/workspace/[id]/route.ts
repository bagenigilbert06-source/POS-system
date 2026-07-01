import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { organization, workspace } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { WorkspaceService } from '@/lib/services/workspace-service'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, context: any) {
  try {
    // Verify session
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const params = await ((context && context.params) || {})
    const { id } = params

    // Fetch organization
    const orgs = await db
      .select()
      .from(organization)
      .where(eq(organization.id, id))

    if (!orgs || orgs.length === 0) {
      return NextResponse.json(
        { message: 'Workspace not found' },
        { status: 404 }
      )
    }

    const org = orgs[0]

    if (org.userId !== session.user.id) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    // Fetch workspace config from workspace table, falling back to org fields.
    let workspaceConfig = WorkspaceService.buildConfigFromOrg({
      id: org.id,
      name: org.name,
      businessType: org.businessType,
      businessCategory: org.businessCategory,
      templateId: null,
    })
    try {
      const workspaces = await db
        .select()
        .from(workspace)
        .where(eq(workspace.organizationId, org.id))

      if (workspaces && workspaces.length > 0) {
        // `config` is stored as JSON in the DB and inferred by Drizzle
        workspaceConfig = (workspaces[0].config as any) ?? workspaceConfig
      }
    } catch (e) {
      console.error('Failed to fetch workspace config:', e)
    }

    return NextResponse.json({
      success: true,
      workspaceConfig,
      organization: {
        id: org.id,
        name: org.name,
        businessType: org.businessType,
        onboardingCompleted: org.onboardingCompleted,
      },
    })
  } catch (error) {
    console.error('Workspace fetch error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
