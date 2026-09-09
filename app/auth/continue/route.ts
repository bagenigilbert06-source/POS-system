import { NextRequest, NextResponse } from 'next/server'
import { and, desc, eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { employee } from '@/lib/db/schema'
import { ACTIVE_ORGANIZATION_COOKIE } from '@/lib/auth/active-organization'
import { defaultWorkspaceRouteForRole } from '@/lib/auth/role-routing'
import { normalizeRole } from '@/lib/auth/authorization'

/** Canonical post-authentication decision. Staff assignment wins over stale
 * onboarding state or an organization cookie left by another account. */
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) return NextResponse.redirect(new URL('/sign-in', request.url))

  const [staff] = await db.select({ organizationId: employee.orgId, role: employee.role })
    .from(employee)
    .where(and(eq(employee.userId, session.user.id), eq(employee.status, 'active')))
    .orderBy(desc(employee.updatedAt))
    .limit(1)

  const destination = staff ? defaultWorkspaceRouteForRole(normalizeRole(staff.role)) : '/dashboard'
  const response = NextResponse.redirect(new URL(destination, request.url))
  if (staff) response.cookies.set(ACTIVE_ORGANIZATION_COOKIE, staff.organizationId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })
  return response
}
