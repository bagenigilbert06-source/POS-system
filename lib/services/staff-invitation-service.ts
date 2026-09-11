import { createHash, randomBytes } from 'node:crypto'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { employee, staffInvitation, organizationMembership, branchMembership, branch, organization, auditEvent, user } from '@/lib/db/schema'
import { nanoid } from 'nanoid'

export const STAFF_INVITATION_EXPIRY_MINUTES = 10
const hash = (token: string) => createHash('sha256').update(token).digest('hex')

export async function createStaffInvitation(input: { organizationId: string; employeeId: string; branchId: string; userId?: string | null; email: string; createdBy: string }) {
  const rawToken = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + STAFF_INVITATION_EXPIRY_MINUTES * 60_000)
  await db.update(staffInvitation).set({ status: 'SUPERSEDED', supersededAt: new Date(), updatedAt: new Date() }).where(and(eq(staffInvitation.employeeId, input.employeeId), inArray(staffInvitation.status, ['PENDING', 'AWAITING_EMAIL_VERIFICATION'])))
  const [record] = await db.insert(staffInvitation).values({ id: nanoid(), ...input, tokenHash: hash(rawToken), status: 'PENDING', expiresAt }).returning()
  return { record, token: rawToken }
}

export async function validateStaffInvitation(token: string) {
  const [record] = await db.select().from(staffInvitation).where(eq(staffInvitation.tokenHash, hash(token))).limit(1)
  if (!record || !['PENDING', 'AWAITING_EMAIL_VERIFICATION'].includes(record.status)) return { valid: false as const, reason: record?.status?.toLowerCase() ?? 'not_found' }
  if (record.expiresAt <= new Date()) {
    await db.update(staffInvitation).set({ status: 'EXPIRED', updatedAt: new Date() }).where(eq(staffInvitation.id, record.id))
    return { valid: false as const, reason: 'expired' }
  }
  const [person] = await db.select({ name: employee.name, role: employee.role, status: employee.status, organizationName: organization.name, branchName: branch.name }).from(employee)
    .innerJoin(organization, and(eq(organization.id, employee.orgId), eq(organization.id, record.organizationId)))
    .innerJoin(branch, and(eq(branch.id, record.branchId), eq(branch.organizationId, record.organizationId)))
    .where(and(eq(employee.id, record.employeeId), eq(employee.orgId, record.organizationId))).limit(1)
  if (!person || person.status === 'inactive' || person.status === 'terminated') return { valid: false as const, reason: 'employee_inactive' }
  return { valid: true as const, invitation: record, employee: person }
}

export async function revokeStaffInvitation(invitationId: string, organizationId: string) {
  const [row] = await db.update(staffInvitation).set({ status: 'REVOKED', revokedAt: new Date(), updatedAt: new Date() }).where(and(eq(staffInvitation.id, invitationId), eq(staffInvitation.organizationId, organizationId), eq(staffInvitation.status, 'PENDING'))).returning()
  return row ?? null
}

export async function revokeCurrentStaffInvitation(employeeId: string, organizationId: string) {
  const [row] = await db.update(staffInvitation).set({ status: 'REVOKED', revokedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(staffInvitation.employeeId, employeeId), eq(staffInvitation.organizationId, organizationId), inArray(staffInvitation.status, ['PENDING', 'AWAITING_EMAIL_VERIFICATION']))).returning()
  return row ?? null
}

export async function acceptStaffInvitation(token: string, userId: string) {
  const [invite] = await db.select().from(staffInvitation).where(eq(staffInvitation.tokenHash, hash(token))).limit(1)
  if (!invite || !['PENDING', 'AWAITING_EMAIL_VERIFICATION'].includes(invite.status)) throw new Error('This invitation is no longer valid')
  const now = new Date()
  return db.transaction(async (tx) => {
    const [identity] = await tx.select({ email: user.email, verified: user.emailVerified }).from(user).where(eq(user.id, userId)).limit(1)
    if (!identity?.verified || identity.email.toLowerCase() !== invite.email.toLowerCase()) throw new Error('Verify the invited email before activation')
    const [locked] = await tx.update(staffInvitation).set({ status: 'ACCEPTED', acceptedAt: now, updatedAt: now }).where(and(eq(staffInvitation.id, invite.id), eq(staffInvitation.status, invite.status), eq(staffInvitation.userId, userId))).returning()
    if (!locked) throw new Error('This invitation has already been used')
    if (locked.userId && locked.userId !== userId) throw new Error('This invitation belongs to another account')
    const [record] = await tx.update(employee).set({ userId, status: 'active', updatedAt: now }).where(and(eq(employee.id, locked.employeeId), eq(employee.orgId, locked.organizationId), eq(employee.status, 'invitation_pending'))).returning()
    if (!record) throw new Error('Employee is no longer eligible for activation')
    const [membership] = await tx.select({ id: organizationMembership.id }).from(organizationMembership).where(and(eq(organizationMembership.organizationId, locked.organizationId), eq(organizationMembership.userId, userId))).limit(1)
    if (!membership) await tx.insert(organizationMembership).values({ id: nanoid(), organizationId: locked.organizationId, userId, role: record.role })
    const [assignedBranch] = await tx.select({ id: branch.id }).from(branch).where(and(eq(branch.id, locked.branchId), eq(branch.organizationId, locked.organizationId))).limit(1)
    if (!assignedBranch) throw new Error('Assigned branch is no longer available')
    await tx.insert(branchMembership).values({ id: nanoid(), branchId: assignedBranch.id, userId, role: record.role }).onConflictDoNothing()
    await tx.insert(auditEvent).values({ id: nanoid(), organizationId: locked.organizationId, userId, action: 'staff.invitation_accepted', metadata: { employeeId: record.id, invitationId: locked.id } })
    await tx.insert(auditEvent).values({ id: nanoid(), organizationId: locked.organizationId, userId, action: 'staff.account_activated', metadata: { employeeId: record.id } })
    return record
  })
}

export async function awaitStaffInvitationVerification(token: string, userId: string) {
  const tokenHash = hash(token)
  const [row] = await db.update(staffInvitation).set({ userId, status: 'AWAITING_EMAIL_VERIFICATION', updatedAt: new Date() }).where(and(eq(staffInvitation.tokenHash, tokenHash), eq(staffInvitation.status, 'PENDING'))).returning()
  if (!row) {
    const [existing] = await db.select().from(staffInvitation).where(eq(staffInvitation.tokenHash, tokenHash)).limit(1)
    if (existing?.status === 'AWAITING_EMAIL_VERIFICATION' && existing.userId === userId) return existing
    throw new Error('Invitation could not be claimed')
  }
  await db.update(employee).set({ userId, updatedAt: new Date() }).where(and(eq(employee.id, row.employeeId), eq(employee.status, 'invitation_pending')))
  return row
}

export async function finalizeStaffInvitationForVerifiedUser(userId: string) {
  const [invite] = await db.select().from(staffInvitation).where(and(eq(staffInvitation.userId, userId), eq(staffInvitation.status, 'AWAITING_EMAIL_VERIFICATION'))).orderBy(desc(staffInvitation.updatedAt)).limit(1)
  if (!invite) return null
  return acceptStaffInvitationById(invite.id, userId)
}

async function acceptStaffInvitationById(invitationId: string, userId: string) {
  const [invite] = await db.select().from(staffInvitation).where(eq(staffInvitation.id, invitationId)).limit(1)
  if (!invite || invite.status !== 'AWAITING_EMAIL_VERIFICATION') throw new Error('This invitation is no longer valid')
  return finalizeInvitation(invite, userId)
}

async function finalizeInvitation(invite: typeof staffInvitation.$inferSelect, userId: string) {
  const now = new Date()
  return db.transaction(async (tx) => {
    const [identity] = await tx.select({ email: user.email, verified: user.emailVerified }).from(user).where(eq(user.id, userId)).limit(1)
    if (!identity?.verified || identity.email.toLowerCase() !== invite.email.toLowerCase()) throw new Error('Verify the invited email before activation')
    const [locked] = await tx.update(staffInvitation).set({ status: 'ACCEPTED', acceptedAt: now, updatedAt: now }).where(and(eq(staffInvitation.id, invite.id), eq(staffInvitation.status, 'AWAITING_EMAIL_VERIFICATION'), eq(staffInvitation.userId, userId))).returning()
    if (!locked) {
      const [alreadyAccepted] = await tx.select().from(staffInvitation).where(and(eq(staffInvitation.id, invite.id), eq(staffInvitation.status, 'ACCEPTED'), eq(staffInvitation.userId, userId))).limit(1)
      if (alreadyAccepted) return null
      throw new Error('This invitation is no longer eligible for activation')
    }
    const [record] = await tx.update(employee).set({ userId, status: 'active', updatedAt: now }).where(and(eq(employee.id, locked.employeeId), eq(employee.orgId, locked.organizationId), eq(employee.status, 'invitation_pending'))).returning()
    if (!record) throw new Error('Employee is no longer eligible for activation')
    const [assignedBranch] = await tx.select({ id: branch.id }).from(branch).where(and(eq(branch.id, locked.branchId), eq(branch.organizationId, locked.organizationId))).limit(1)
    if (!assignedBranch) throw new Error('Assigned branch is no longer available')
    await tx.insert(organizationMembership).values({ id: nanoid(), organizationId: locked.organizationId, userId, role: record.role }).onConflictDoNothing()
    await tx.insert(branchMembership).values({ id: nanoid(), branchId: assignedBranch.id, userId, role: record.role }).onConflictDoNothing()
    await tx.insert(auditEvent).values([{ id: nanoid(), organizationId: locked.organizationId, userId, action: 'staff.invitation_accepted', metadata: { employeeId: record.id, invitationId: locked.id } }, { id: nanoid(), organizationId: locked.organizationId, userId, action: 'staff.account_activated', metadata: { employeeId: record.id, invitationId: locked.id } }])
    return record
  })
}
