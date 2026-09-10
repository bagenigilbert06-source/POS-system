import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { finalizeStaffInvitationForVerifiedUser } from '@/lib/services/staff-invitation-service'

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) return NextResponse.redirect(new URL('/sign-in', request.url))
  // Verification links may be opened twice by scanners or a second browser
  // tab. Finalization is conditional and idempotent; never grant access from
  // the callback unless the verified Better Auth session owns the invite.
  try {
    await finalizeStaffInvitationForVerifiedUser(session.user.id)
  } catch {
    return NextResponse.redirect(new URL('/setup-account?error=activation', request.url))
  }
  return NextResponse.redirect(new URL('/setup-account?activation=success', request.url))
}
