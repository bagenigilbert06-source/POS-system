'use server'

import { db } from '@/lib/db'
import { auditEvent, branch, branchMembership, employee, organization, organizationMembership, shift, shiftAssignment, employeeCommission, user, verification } from '@/lib/db/schema'
import { eq, and, desc, gte, inArray, like, ne } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { OrganizationService } from '@/lib/services/organization-service'
import { nanoid } from 'nanoid'
import { requirePermission } from '@/lib/auth/authorization'
import { canAssignRole, canManageExistingRole, PermissionEnum, RoleEnum, STAFF_MANAGED_ROLES, type StaffManagedRole } from '@/lib/types/permissions'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { STAFF_DEPARTMENTS } from '@/lib/types/staff'
import { isPharmacyBusiness } from '@/lib/pharmacy/rules'

// Admin is intentionally absent. The primary admin is created with the
// organization and cannot be created or assigned by Staff & Access actions.
const staffRoleSchema = z.enum(STAFF_MANAGED_ROLES)
const createStaffSchema = z.object({
  name: z.string().trim().min(2).max(100), email: z.string().trim().toLowerCase().email(),
  phone: z.string().trim().max(30).optional(),
  image: z.string().trim().max(2048).nullable().optional(),
  role: staffRoleSchema, branchId: z.string().min(1), department: z.enum(STAFF_DEPARTMENTS).default('unassigned'),
  salary: z.coerce.number().nonnegative().max(999_999_999), status: z.enum(['active', 'inactive']).default('active'),
})
const updateStaffSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  email: z.string().trim().toLowerCase().email().optional(),
  phone: z.string().trim().max(30).optional(),
  image: z.string().trim().max(2048).nullable().optional(),
  role: staffRoleSchema.optional(),
  department: z.enum(STAFF_DEPARTMENTS).optional(),
  salary: z.coerce.number().nonnegative().max(999_999_999).optional(),
  status: z.enum(['active', 'inactive', 'invited', 'terminated']).optional(),
})
const INVITATION_COOLDOWN_MS = 60_000

function validStaffImage(value: string | null | undefined) {
  if (!value) return true
  if (value.startsWith('/uploads/profile/')) return true
  try { return ['http:', 'https:'].includes(new URL(value).protocol) } catch { return false }
}

function assertAssignableRole(actor: RoleEnum, role: StaffManagedRole) {
  if (!canAssignRole(actor, role)) throw new Error(`A ${actor} cannot assign the ${role} role`)
}

async function assertRoleMatchesWorkspace(organizationId: string, role: StaffManagedRole) {
  if (role !== RoleEnum.PHARMACIST && role !== RoleEnum.PHARMACY_STAFF) return
  const [workspace] = await db.select({ businessType: organization.businessType, businessCategory: organization.businessCategory })
    .from(organization).where(eq(organization.id, organizationId)).limit(1)
  if (!workspace || !isPharmacyBusiness(workspace.businessType, workspace.businessCategory)) {
    throw new Error('Pharmacy roles can only be assigned inside a pharmacy workspace')
  }
}

async function assertCanManageEmployee(
  authorization: Awaited<ReturnType<typeof requirePermission>>,
  record: { userId: string | null; role: string },
) {
  if (record.userId === authorization.userId) throw new Error('You cannot change your own role or access')
  if (!canManageExistingRole(authorization.role, record.role as RoleEnum)) throw new Error(`A ${authorization.role} cannot manage an existing ${record.role}`)
  if (!authorization.isOrganizationWide) {
    if (!record.userId || !authorization.branchIds.length) throw new Error('This staff member is outside your assigned branches')
    const assignments = await db.select({ branchId: branchMembership.branchId }).from(branchMembership).where(eq(branchMembership.userId, record.userId))
    if (!assignments.length || assignments.some(({ branchId }) => !authorization.branchIds.includes(branchId))) {
      throw new Error('This staff member is outside your assigned branches')
    }
  }
}

function invitationRedirectUrl() {
  return `${(process.env.BETTER_AUTH_URL || 'https://pesaby.vercel.app').replace(/\/$/, '')}/setup-account`
}

async function invitationWasRecentlySent(organizationId: string, employeeId: string) {
  const since = new Date(Date.now() - INVITATION_COOLDOWN_MS)
  const recentEvents = await db.select({ metadata: auditEvent.metadata }).from(auditEvent).where(and(
    eq(auditEvent.organizationId, organizationId),
    inArray(auditEvent.action, ['staff.invitation_sent', 'staff.invitation_resent']),
    gte(auditEvent.createdAt, since),
  )).orderBy(desc(auditEvent.createdAt)).limit(20)
  return recentEvents.some(({ metadata }) => (metadata as { employeeId?: string } | null)?.employeeId === employeeId)
}

async function issueStaffInvitation(input: { employeeId: string; employeeUserId: string; email: string; organizationId: string }) {
  if (await invitationWasRecentlySent(input.organizationId, input.employeeId)) return { delivered: true, reused: true }
  // A resend must leave exactly one usable setup link. Better Auth tokens are
  // intentionally one-use, so revoke every earlier unconsumed invitation first.
  await db.delete(verification).where(and(
    eq(verification.value, input.employeeUserId),
    like(verification.identifier, 'reset-password:%'),
  ))
  await auth.api.requestPasswordReset({
    body: { email: input.email, redirectTo: invitationRedirectUrl() },
    headers: await headers(),
  })
  return { delivered: Boolean(process.env.BREVO_API_KEY && process.env.EMAIL_FROM_ADDRESS), reused: false }
}

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

async function getOrgId(userId: string) {
  const org = await OrganizationService.getPrimaryOrganization(userId)
  if (!org) throw new Error('Organization not found')
  return org.id
}

export async function createEmployee(data: {
  name: string
  email: string
  phone?: string
  image?: string | null
  role: StaffManagedRole
  branchId: string
  department?: string
  salary: number
  status?: string
}) {
  const input = createStaffSchema.parse(data)
  if (!validStaffImage(input.image)) throw new Error('Choose a valid employee photo')
  const authorization = await requirePermission(PermissionEnum.STAFF_MANAGE)
  assertAssignableRole(authorization.role, input.role)
  await assertRoleMatchesWorkspace(authorization.organizationId, input.role)
  const [selectedBranch] = await db.select({ id: branch.id }).from(branch).where(and(
    eq(branch.id, input.branchId),
    eq(branch.organizationId, authorization.organizationId),
    authorization.isOrganizationWide ? undefined : inArray(branch.id, authorization.branchIds),
  )).limit(1)
  if (!selectedBranch) throw new Error('Choose a branch in this organization')
  const result = await db.transaction(async (tx) => {
    const [existingUser] = await tx.select().from(user).where(eq(user.email, input.email)).limit(1)
    if (existingUser && existingUser.status !== 'active') {
      throw new Error('This email belongs to an inactive Pesaby account. Reactivate that account before assigning pharmacy access.')
    }
    const staffUserId = existingUser?.id ?? nanoid()
    const [existingMembership] = await tx.select().from(organizationMembership).where(and(eq(organizationMembership.organizationId, authorization.organizationId), eq(organizationMembership.userId, staffUserId))).limit(1)
    if (existingMembership) throw new Error('This user already has access to the organization')
    if (!existingUser) await tx.insert(user).values({ id: staffUserId, name: input.name, email: input.email, image: input.image || null, status: 'invited' })
    const employeeId = nanoid()
    await tx.insert(organizationMembership).values({ id: nanoid(), organizationId: authorization.organizationId, userId: staffUserId, role: input.role })
    await tx.insert(branchMembership).values({ id: nanoid(), branchId: input.branchId, userId: staffUserId, role: input.role })
    const status = existingUser ? 'active' : 'invited'
    const [record] = await tx.insert(employee).values({ id: employeeId, userId: staffUserId, name: input.name, email: input.email, phone: input.phone || null, role: input.role, department: input.department || null, salary: String(input.salary), status, orgId: authorization.organizationId }).returning()
    await tx.insert(auditEvent).values({ id: nanoid(), organizationId: authorization.organizationId, userId: authorization.userId, action: 'staff.created', metadata: { employeeId, staffUserId, role: input.role, branchId: input.branchId, existingUser: Boolean(existingUser) } })
    return { record, existingUser: Boolean(existingUser) }
  })
  let invitationSent = false
  if (!result.existingUser) {
    try {
      const invitation = await issueStaffInvitation({ employeeId: result.record.id, employeeUserId: result.record.userId!, email: input.email, organizationId: authorization.organizationId })
      invitationSent = invitation.delivered
      await db.insert(auditEvent).values({ id: nanoid(), organizationId: authorization.organizationId, userId: authorization.userId, action: invitationSent ? 'staff.invitation_sent' : 'staff.invitation_failed', metadata: { employeeId: result.record.id, reason: invitationSent ? undefined : 'email_not_configured' } })
    } catch {
      await db.insert(auditEvent).values({ id: nanoid(), organizationId: authorization.organizationId, userId: authorization.userId, action: 'staff.invitation_failed', metadata: { employeeId: result.record.id, reason: 'delivery_failed' } })
    }
  }
  revalidatePath('/dashboard/staff')
  return { success: true, employee: result.record, invitationSent, existingUser: result.existingUser }
}

export async function resendStaffInvitation(employeeId: string) {
  const authorization = await requirePermission(PermissionEnum.STAFF_MANAGE)
  const [record] = await db.select().from(employee).where(and(eq(employee.id, employeeId), eq(employee.orgId, authorization.organizationId))).limit(1)
  if (!record?.userId || !record.email) throw new Error('Staff account was not found')
  await assertCanManageEmployee(authorization, record)
  if (record.status !== 'invited') throw new Error('Only pending invitations can be resent')
  try {
    const invitation = await issueStaffInvitation({ employeeId: record.id, employeeUserId: record.userId, email: record.email, organizationId: authorization.organizationId })
    if (invitation.reused) return { success: true, delivered: true, reused: true }
    const delivered = invitation.delivered
    await db.insert(auditEvent).values({ id: nanoid(), organizationId: authorization.organizationId, userId: authorization.userId, action: delivered ? 'staff.invitation_resent' : 'staff.invitation_failed', metadata: { employeeId } })
    return { success: true, delivered }
  } catch {
    await db.insert(auditEvent).values({ id: nanoid(), organizationId: authorization.organizationId, userId: authorization.userId, action: 'staff.invitation_failed', metadata: { employeeId, reason: 'delivery_failed' } })
    return { success: false, delivered: false }
  }
}

export async function updateEmployee(employeeId: string, data: {
  name?: string
  email?: string
  phone?: string
  image?: string | null
  role?: StaffManagedRole
  department?: string
  salary?: number
  status?: string
}) {
  const input = updateStaffSchema.parse(data)
  if (!validStaffImage(input.image)) throw new Error('Choose a valid employee photo')
  const authorization = await requirePermission(PermissionEnum.STAFF_MANAGE)
  const orgId = authorization.organizationId
  const [current] = await db.select().from(employee).where(and(eq(employee.id, employeeId), eq(employee.orgId, orgId))).limit(1)
  if (!current) throw new Error('Employee not found')
  await assertCanManageEmployee(authorization, current)
  if (input.role) assertAssignableRole(authorization.role, input.role)
  if (input.role) await assertRoleMatchesWorkspace(orgId, input.role)

    const updated = await db.transaction(async (tx) => {
      const emailChanged = Boolean(input.email && input.email !== current.email)
      if (emailChanged) {
        const emailOwnerQuery = current.userId
          ? and(eq(user.email, input.email!), ne(user.id, current.userId))
          : eq(user.email, input.email!)
        const [emailOwner] = await tx.select({ id: user.id }).from(user).where(emailOwnerQuery).limit(1)
        if (emailOwner) throw new Error('That email address is already used by another account')
      }
      if (current.userId && (emailChanged || input.name || input.image !== undefined)) {
        const syncedUser = await tx.update(user).set({
          ...(emailChanged && { email: input.email! }),
          ...(input.name && { name: input.name }),
          ...(input.image !== undefined && { image: input.image || null }),
          updatedAt: new Date(),
        }).where(eq(user.id, current.userId)).returning({ id: user.id })
        if (syncedUser.length !== 1) throw new Error('The staff login account is missing and cannot be updated')
      }
      const rows = await tx.update(employee)
      .set({
        ...(input.name && { name: input.name }),
        ...(input.email && { email: input.email }),
        ...(input.phone && { phone: input.phone }),
        ...(input.role && { role: input.role }),
        ...(input.department && { department: input.department }),
        ...(input.salary !== undefined && { salary: input.salary.toString() }),
        ...(input.status && { status: input.status }),
      })
      .where(and(eq(employee.id, employeeId), eq(employee.orgId, orgId)))
      .returning()
      if (current.userId && input.role) await tx.update(organizationMembership).set({ role: input.role, updatedAt: new Date() }).where(and(eq(organizationMembership.organizationId, orgId), eq(organizationMembership.userId, current.userId)))
      if (current.userId && input.role) {
        const organizationBranches = await tx.select({ id: branch.id }).from(branch).where(eq(branch.organizationId, orgId))
        if (organizationBranches.length) await tx.update(branchMembership).set({ role: input.role }).where(and(
          eq(branchMembership.userId, current.userId),
          inArray(branchMembership.branchId, organizationBranches.map(({ id }) => id)),
        ))
      }
      await tx.insert(auditEvent).values({ id: nanoid(), organizationId: orgId, userId: authorization.userId, action: 'staff_access_updated', metadata: { employeeId, previousRole: current.role, role: input.role ?? current.role, status: input.status ?? current.status, emailChanged, avatarChanged: input.image !== undefined } })
      return rows
    })
    revalidatePath('/dashboard/staff')
  return { success: true, employee: updated[0] }
}

export async function deleteEmployee(employeeId: string) {
  const authorization = await requirePermission(PermissionEnum.STAFF_MANAGE)
  const orgId = authorization.organizationId

  const [current] = await db.select().from(employee).where(and(eq(employee.id, employeeId), eq(employee.orgId, orgId))).limit(1)
  if (!current) throw new Error('Employee not found')
  await assertCanManageEmployee(authorization, current)
    await db.transaction(async (tx) => {
      await tx.update(employee).set({ status: 'inactive', updatedAt: new Date() }).where(and(eq(employee.id, employeeId), eq(employee.orgId, orgId)))
      if (current.userId) {
        const organizationBranches = await tx.select({ id: branch.id }).from(branch).where(eq(branch.organizationId, orgId))
        if (organizationBranches.length) await tx.delete(branchMembership).where(and(eq(branchMembership.userId, current.userId), inArray(branchMembership.branchId, organizationBranches.map(({ id }) => id))))
        await tx.delete(organizationMembership).where(and(eq(organizationMembership.organizationId, orgId), eq(organizationMembership.userId, current.userId)))
      }
      await tx.insert(auditEvent).values({ id: nanoid(), organizationId: orgId, userId: authorization.userId, action: 'staff_access_revoked', metadata: { employeeId, staffUserId: current.userId, role: current.role } })
    })
    revalidatePath('/dashboard/staff')
  return { success: true }
}

export async function createShift(data: {
  name: string
  startTime: string // HH:mm
  endTime: string   // HH:mm
}) {
  await requirePermission(PermissionEnum.SHIFT_MANAGE)
  const userId = await getUserId()
  const orgId = await getOrgId(userId)

  try {
    const newShift = await db
      .insert(shift)
      .values({
        id: nanoid(),
        name: data.name,
        startTime: data.startTime,
        endTime: data.endTime,
        orgId,
      })
      .returning()

    return { success: true, shift: newShift[0] }
  } catch (error) {
    console.error('[v0] Error creating shift:', error)
    throw new Error('Failed to create shift')
  }
}

export async function assignShift(data: {
  employeeId: string
  shiftId: string
  date: Date
}) {
  await requirePermission(PermissionEnum.SHIFT_MANAGE)
  const userId = await getUserId()
  const orgId = await getOrgId(userId)

  try {
    const assignment = await db
      .insert(shiftAssignment)
      .values({
        id: nanoid(),
        employeeId: data.employeeId,
        shiftId: data.shiftId,
        date: data.date,
        orgId,
      })
      .returning()

    return { success: true, assignment: assignment[0] }
  } catch (error) {
    console.error('[v0] Error assigning shift:', error)
    throw new Error('Failed to assign shift')
  }
}

export async function recordCommission(data: {
  employeeId: string
  amount: number
  period: string // YYYY-MM
}) {
  await requirePermission(PermissionEnum.STAFF_MANAGE)
  const userId = await getUserId()
  const orgId = await getOrgId(userId)

  try {
    const commission = await db
      .insert(employeeCommission)
      .values({
        id: nanoid(),
        employeeId: data.employeeId,
        amount: data.amount.toString(),
        period: data.period,
        status: 'pending',
        orgId,
      })
      .returning()

    return { success: true, commission: commission[0] }
  } catch (error) {
    console.error('[v0] Error recording commission:', error)
    throw new Error('Failed to record commission')
  }
}
