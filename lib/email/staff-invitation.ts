import { and, desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { auditEvent, branch, branchMembership, employee, organization, user } from '@/lib/db/schema'
import { sendEmail } from './client'
import { staffInvitationEmail } from './templates/staff-invitation'

export async function sendStaffInvitation(input: { userId: string; email: string; setupUrl: string; inviterName?: string }) {
  const [context] = await db.select({ employeeName: employee.name, role: employee.role, orgId: employee.orgId, organizationName: organization.name, branchName: branch.name })
    .from(employee).innerJoin(organization, eq(organization.id, employee.orgId)).innerJoin(branchMembership, eq(branchMembership.userId, employee.userId)).innerJoin(branch, and(eq(branch.id, branchMembership.branchId), eq(branch.organizationId, employee.orgId)))
    .where(eq(employee.userId, input.userId)).orderBy(desc(employee.createdAt)).limit(1)
  let inviterName = input.inviterName
  if (!inviterName && context) {
    const events = await db.select({ userId: auditEvent.userId, metadata: auditEvent.metadata }).from(auditEvent).where(and(eq(auditEvent.organizationId, context.orgId), eq(auditEvent.action, 'staff.created'))).orderBy(desc(auditEvent.createdAt)).limit(50)
    const event = events.find(({ metadata }) => (metadata as { staffUserId?: string })?.staffUserId === input.userId)
    if (event) inviterName = (await db.select({ name: user.name }).from(user).where(eq(user.id, event.userId)).limit(1))[0]?.name
  }
  return sendEmail({ to: { email: input.email, name: context?.employeeName }, ...staffInvitationEmail({ employeeName: context?.employeeName ?? 'Team member', organizationName: context?.organizationName ?? 'your organization', branchName: context?.branchName ?? 'your assigned location', role: context?.role ?? 'staff', inviterName: inviterName ?? 'Your administrator', setupUrl: input.setupUrl }) })
}
