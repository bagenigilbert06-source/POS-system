import { headers } from 'next/headers'
import { and, eq, sql } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { auditEvent, branch, branchMembership, businessSettings, organization, organizationMembership, workspace } from '@/lib/db/schema'
import { generateId } from '@/lib/utils'

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return Response.json({ message: 'Sign in to continue.' }, { status: 401 })
  try {
    const result = await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${session.user.id}))`)
      const [org] = await tx.select().from(organization).where(eq(organization.userId, session.user.id)).limit(1)
      if (!org) return { route: '/onboarding' }
      if (!org.onboardingCompleted) return { route: '/onboarding' }
      const [[settings], [mainBranch]] = await Promise.all([
        tx.select().from(businessSettings).where(eq(businessSettings.organizationId, org.id)).limit(1),
        tx.select().from(branch).where(and(eq(branch.organizationId, org.id), eq(branch.isMain, true))).limit(1),
      ])
      if (!settings || !mainBranch) throw new Error('INCOMPLETE_WORKSPACE')
      await tx.insert(organizationMembership).values({ id: generateId(), organizationId: org.id, userId: session.user.id, role: 'owner' })
        .onConflictDoUpdate({ target: [organizationMembership.organizationId, organizationMembership.userId], set: { role: 'owner', updatedAt: new Date() } })
      await tx.insert(branchMembership).values({ id: generateId(), branchId: mainBranch.id, userId: session.user.id, role: 'owner' })
        .onConflictDoUpdate({ target: [branchMembership.branchId, branchMembership.userId], set: { role: 'owner' } })
      const [storedWorkspace] = await tx.select().from(workspace).where(eq(workspace.organizationId, org.id)).limit(1)
      if (!storedWorkspace) {
        await tx.insert(workspace).values({ id: generateId(), organizationId: org.id, config: {
          templateId: 'adaptive.generic', businessFamily: org.businessType, businessCategory: org.businessCategory,
          customBusinessCategory: settings.customBusinessCategory, enabledModules: settings.enabledModules,
          enabledFeatures: [], ownerPermissions: ['*'], configurationVersion: 1,
        } })
      }
      await tx.insert(auditEvent).values({ id: generateId(), organizationId: org.id, userId: session.user.id, action: 'workspace.recovered', metadata: {} })
      return { route: '/dashboard' }
    })
    return Response.json({ success: true, route: result.route })
  } catch (error) {
    if (error instanceof Error && error.message === 'INCOMPLETE_WORKSPACE') return Response.json({ message: 'Core workspace records are incomplete. Contact Pesaby support so they can be reviewed safely.' }, { status: 409 })
    console.error('[workspace/recover] Recovery failed')
    return Response.json({ message: 'Workspace recovery could not finish. No saved records were removed.' }, { status: 500 })
  }
}
