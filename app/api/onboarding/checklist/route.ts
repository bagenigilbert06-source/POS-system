import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { businessSettings } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { OrganizationService } from '@/lib/services/organization-service'

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  const body = z.object({ dismissed: z.boolean() }).safeParse(await request.json())
  if (!body.success) return NextResponse.json({ message: 'Invalid request' }, { status: 400 })
  const organization = await OrganizationService.getPrimaryOrganization(session.user.id)
  if (!organization?.onboardingCompleted) return NextResponse.json({ message: 'Workspace unavailable' }, { status: 403 })
  await db.update(businessSettings).set({ checklistDismissed: body.data.dismissed, updatedAt: new Date() }).where(eq(businessSettings.organizationId, organization.id))
  return NextResponse.json({ success: true })
}
