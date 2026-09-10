import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { finalizeStaffInvitationForVerifiedUser } from '@/lib/services/staff-invitation-service'

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) return NextResponse.redirect(new URL('/sign-in', request.url))
  await finalizeStaffInvitationForVerifiedUser(session.user.id)
  return NextResponse.redirect(new URL('/dashboard', request.url))
}
