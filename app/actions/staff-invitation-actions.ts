'use server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { acceptStaffInvitation, awaitStaffInvitationVerification, validateStaffInvitation } from '@/lib/services/staff-invitation-service'

export async function getStaffInvitationContext(token: string) {
  const result = await validateStaffInvitation(token)
  if (!result.valid) return { valid: false, state: result.reason.toUpperCase() }
  return { valid: true, state: 'PENDING', employeeName: result.employee.name, roleName: result.employee.role, expiresAt: result.invitation.expiresAt, existingAccount: Boolean(result.invitation.userId) }
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
    const created = await auth.api.signUpEmail({ body: { email: invitation.invitation.email, name: invitation.employee.name, password }, headers: await headers() })
    userId = created.user?.id
    if (!userId) throw new Error('Unable to create the account')
    await awaitStaffInvitationVerification(token, userId)
    return { awaitingEmailVerification: true }
  }
  return acceptStaffInvitation(token, userId!)
}
