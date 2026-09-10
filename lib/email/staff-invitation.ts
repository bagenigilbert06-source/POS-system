import { and, desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { auditEvent, branch, employee, organization, staffInvitation, user } from '@/lib/db/schema'
import { sendEmail } from './client'
import { staffInvitationEmail } from './templates/staff-invitation'

export async function sendStaffInvitation(input: { userId?: string; employeeId?: string; email: string; setupUrl: string; inviterName?: string }) {
  // The invitation is authoritative for the pending branch assignment. Do not
  // depend on branch membership here: memberships deliberately do not exist
  // until the invitee has verified their identity and is activated.
  const [context] = await db.select({ employeeName: employee.name, role: employee.role, department: employee.department, orgId: employee.orgId, organizationName: organization.name, branchName: branch.name, expiresAt: staffInvitation.expiresAt })
    .from(employee).innerJoin(organization, eq(organization.id, employee.orgId))
    .innerJoin(staffInvitation, eq(staffInvitation.employeeId, employee.id))
    .innerJoin(branch, and(eq(branch.id, staffInvitation.branchId), eq(branch.organizationId, employee.orgId)))
    .where(input.employeeId ? eq(employee.id, input.employeeId) : eq(employee.userId, input.userId!)).orderBy(desc(staffInvitation.createdAt)).limit(1)
  let inviterName = input.inviterName
  if (!inviterName && context) {
    const events = await db.select({ userId: auditEvent.userId, metadata: auditEvent.metadata }).from(auditEvent).where(and(eq(auditEvent.organizationId, context.orgId), eq(auditEvent.action, 'staff.created'))).orderBy(desc(auditEvent.createdAt)).limit(50)
    const event = events.find(({ metadata }) => input.employeeId ? (metadata as { employeeId?: string })?.employeeId === input.employeeId : (metadata as { staffUserId?: string })?.staffUserId === input.userId)
    if (event) inviterName = (await db.select({ name: user.name }).from(user).where(eq(user.id, event.userId)).limit(1))[0]?.name
  }
  return sendEmail({ to: { email: input.email, name: context?.employeeName }, ...staffInvitationEmail({ employeeName: context?.employeeName ?? 'Team member', organizationName: context?.organizationName ?? 'your organization', branchName: context?.branchName ?? 'your assigned location', role: context?.role ?? 'staff', department: context?.department, expiresAt: context?.expiresAt, inviterName: inviterName ?? 'Your administrator', setupUrl: input.setupUrl }) })
}
