'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { getCurrentSession } from '@/lib/auth'
import { ACTIVE_ORGANIZATION_COOKIE } from '@/lib/auth/active-organization'
import { db } from '@/lib/db'
import { auditEvent } from '@/lib/db/schema'
import { OrganizationService } from '@/lib/services/organization-service'
import { generateId } from '@/lib/utils'

const schema = z.string().trim().min(1).max(128)

export async function switchActiveOrganization(organizationId: string) {
  const targetId = schema.parse(organizationId)
  const session = await getCurrentSession()
  if (!session?.user) throw new Error('Sign in to switch workspaces')
  const target = await OrganizationService.getOrganization(targetId, session.user.id)
  if (!target) throw new Error('You do not have access to this workspace')
  const cookieStore = await cookies()
  cookieStore.set(ACTIVE_ORGANIZATION_COOKIE, target.id, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 365 })
  await db.insert(auditEvent).values({ id: generateId(), organizationId: target.id, userId: session.user.id, action: 'workspace.switched', metadata: { targetOrganizationId: target.id } })
  redirect('/dashboard')
}
