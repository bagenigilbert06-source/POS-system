'use server'
import { headers } from 'next/headers'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { user } from '@/lib/db/schema'
import { acceptStaffInvitation, awaitStaffInvitationVerification, validateStaffInvitation } from '@/lib/services/staff-invitation-service'

export async function getStaffInvitationContext(token: string) {
  const result = await validateStaffInvitation(token)
  if (!result.valid) return { valid: false, state: result.reason.toUpperCase() }
  return { valid: true, state: result.invitation.status, email: result.invitation.email, employeeName: result.employee.name, organizationName: result.employee.organizationName, branchName: result.employee.branchName, roleName: result.employee.role, expiresAt: result.invitation.expiresAt, existingAccount: Boolean(result.invitation.userId) }
}

export async function acceptStaffInvitationAction(token: string, password?: string) {
  const invitation = await validateStaffInvitation(token)
  if (!invitation.valid) throw new Error('This invitation is no longer valid')
  let session = await auth.api.getSession({ headers: await headers() })
  let userId = session?.user.id
  if (invitation.invitation.userId) {
    if (!session || session.user.email.toLowerCase() !== invitation.invitation.email.toLowerCase()) throw new Error('Sign in with the invited Pesaby account')
  } else {
    if (!password) throw new Error('Password is required')
    // A prior signup can have succeeded while app-side linking failed. Reuse
    // that identity instead of attempting a second credential creation.
    const [existingUser] = await db.select({ id: user.id }).from(user).where(eq(user.email, invitation.invitation.email)).limit(1)
    if (existingUser) userId = existingUser.id
    else {
      const created = await auth.api.signUpEmail({ body: { email: invitation.invitation.email, name: invitation.employee.name, password }, headers: await headers() })
      userId = created.user?.id
    }
    if (!userId) throw new Error('Unable to create the account')
    await awaitStaffInvitationVerification(token, userId)
    return { awaitingEmailVerification: true }
  }
  return acceptStaffInvitation(token, userId!)
}

/** Resends Better Auth's verification email; this never creates or supersedes a staff invite. */
export async function resendStaffVerificationAction(token: string) {
  const invitation = await validateStaffInvitation(token)
  if (!invitation.valid || invitation.invitation.status !== 'AWAITING_EMAIL_VERIFICATION' || !invitation.invitation.userId) throw new Error('Email verification is not pending for this invitation')
  await auth.api.sendVerificationEmail({ body: { email: invitation.invitation.email }, headers: await headers() })
  return { sent: true }
}
