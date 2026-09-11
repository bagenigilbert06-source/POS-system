'use server'

import { db } from '@/lib/db'
import { auditEvent, branch, branchMembership, employee, organization, organizationMembership, shift, shiftAssignment, employeeCommission, user, staffInvitation } from '@/lib/db/schema'
import { eq, and, desc, inArray, ne } from 'drizzle-orm'
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
import { createStaffInvitation, revokeCurrentStaffInvitation } from '@/lib/services/staff-invitation-service'
import { sendStaffInvitation } from '@/lib/email/staff-invitation'

// Admin is intentionally absent. The primary admin is created with the
// organization and cannot be created or assigned by Staff & Access actions.
const staffRoleSchema = z.enum(STAFF_MANAGED_ROLES)
const staffProfileSchema = z.object({
  employeeCode: z.string().trim().max(40).optional(),
  dateOfBirth: z.string().trim().max(20).optional(),
  gender: z.string().trim().max(30).optional(),
  nationality: z.string().trim().max(80).optional(),
  bloodGroup: z.string().trim().max(10).optional(),
  about: z.string().trim().max(500).optional(),
  address: z.string().trim().max(200).optional(),
  country: z.string().trim().max(80).optional(),
  state: z.string().trim().max(80).optional(),
  city: z.string().trim().max(80).optional(),
  zipcode: z.string().trim().max(20).optional(),
  emergencyContact1: z.string().trim().max(120).optional(),
  emergencyContact2: z.string().trim().max(120).optional(),
  bankName: z.string().trim().max(100).optional(),
  bankAccountNumber: z.string().trim().max(80).optional(),
  bankCode: z.string().trim().max(40).optional(),
  bankBranch: z.string().trim().max(100).optional(),
}).optional()
const createStaffSchema = z.object({
  name: z.string().trim().min(2).max(100), email: z.string().trim().toLowerCase().email(),
  phone: z.string().trim().max(30).optional(),
  image: z.string().trim().max(2048).nullable().optional(),
  role: staffRoleSchema, branchId: z.string().min(1), department: z.enum(STAFF_DEPARTMENTS).default('unassigned'),
  salary: z.coerce.number().nonnegative().max(999_999_999), status: z.enum(['active', 'inactive']).default('active'),
  joinDate: z.coerce.date().optional(), shiftId: z.string().trim().optional(), profile: staffProfileSchema,
})
const updateStaffSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  email: z.string().trim().toLowerCase().email().optional(),
  phone: z.string().trim().max(30).optional(),
  image: z.string().trim().max(2048).nullable().optional(),
  role: staffRoleSchema.optional(),
  department: z.enum(STAFF_DEPARTMENTS).optional(),
  salary: z.coerce.number().nonnegative().max(999_999_999).optional(),
  status: z.enum(['active', 'inactive', 'invited', 'invitation_pending', 'terminated']).optional(),
  joinDate: z.coerce.date().optional(),
  branchId: z.string().trim().min(1).optional(),
  shiftId: z.string().trim().optional(),
  profile: staffProfileSchema,
})

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

async function invitationRedirectUrl() {
  const configuredUrl = process.env.BETTER_AUTH_URL?.trim()
  if (configuredUrl) {
    const url = new URL(configuredUrl)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('BETTER_AUTH_URL must use HTTP or HTTPS')
    return `${url.origin}/setup-account`
  }

  // Use the origin that served this authenticated staff action. This prevents
  // an invitation from being sent to a fallback deployment that uses another
  // database and therefore cannot validate its token.
  const requestHeaders = await headers()
  const forwardedHost = requestHeaders.get('x-forwarded-host')?.split(',')[0]?.trim()
  const host = forwardedHost || requestHeaders.get('host')
  if (!host || !/^[a-z0-9.-]+(?::\d+)?$/i.test(host)) throw new Error('Unable to determine the public application URL')
  const protocol = requestHeaders.get('x-forwarded-proto')?.split(',')[0]?.trim() === 'http' ? 'http' : 'https'
  return `${protocol}://${host}/setup-account`
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
  joinDate?: Date | string
  shiftId?: string
  profile?: z.input<typeof staffProfileSchema>
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
  if (input.shiftId) {
    const [selectedShift] = await db.select({ id: shift.id }).from(shift).where(and(
      eq(shift.id, input.shiftId),
      eq(shift.orgId, authorization.organizationId),
    )).limit(1)
    if (!selectedShift) throw new Error('Choose a shift in this organization')
  }
  const result = await db.transaction(async (tx) => {
    const [existingUser] = await tx.select().from(user).where(eq(user.email, input.email)).limit(1)
    if (existingUser && existingUser.status !== 'active') {
      throw new Error('This email belongs to an inactive Pesaby account. Reactivate that account before assigning pharmacy access.')
    }
    const staffUserId = existingUser?.id ?? null
    const [existingMembership] = staffUserId ? await tx.select().from(organizationMembership).where(and(eq(organizationMembership.organizationId, authorization.organizationId), eq(organizationMembership.userId, staffUserId))).limit(1) : []
    const [existingEmployee] = await tx.select({ id: employee.id }).from(employee).where(and(eq(employee.orgId, authorization.organizationId), eq(employee.email, input.email))).limit(1)
    if (existingEmployee) throw new Error('This user is already an employee in this organization')
    // An organization owner/admin can also be an operational staff member.
    // Preserve their organization role; this action only creates the employee
    // profile and a branch assignment required by POS authentication.
    if (existingMembership && staffUserId !== authorization.userId && !canManageExistingRole(authorization.role, existingMembership.role as RoleEnum)) {
      throw new Error('You cannot add an employee profile for this organization member')
    }
    const employeeId = nanoid()
    const status = 'invitation_pending'
    const [record] = await tx.insert(employee).values({ id: employeeId, userId: staffUserId, name: input.name, email: input.email, phone: input.phone || null, role: input.role, department: input.department || null, salary: String(input.salary), profile: input.profile ?? {}, joinDate: input.joinDate ?? new Date(), status, orgId: authorization.organizationId }).returning()
    if (input.shiftId) await tx.insert(shiftAssignment).values({ id: nanoid(), employeeId, shiftId: input.shiftId, date: input.joinDate ?? new Date(), orgId: authorization.organizationId })
    await tx.insert(auditEvent).values({ id: nanoid(), organizationId: authorization.organizationId, userId: authorization.userId, action: existingMembership ? 'staff.profile_attached' : 'staff.created', metadata: { employeeId, staffUserId, role: input.role, branchId: input.branchId, shiftId: input.shiftId, existingUser: Boolean(existingUser) } })
    return { record, existingUser: Boolean(existingUser) }
  })
  let invitationSent = false
  {
    try {
      const invitation = await createStaffInvitation({ employeeId: result.record.id, branchId: input.branchId, userId: result.record.userId, email: input.email, organizationId: authorization.organizationId, createdBy: authorization.userId })
      await db.insert(auditEvent).values({ id: nanoid(), organizationId: authorization.organizationId, userId: authorization.userId, action: 'staff.invitation_created', metadata: { employeeId: result.record.id, invitationId: invitation.record.id, role: input.role, branchId: input.branchId, expiresAt: invitation.record.expiresAt } })
      await sendStaffInvitation({ employeeId: result.record.id, email: input.email, setupUrl: `${await invitationRedirectUrl()}?token=${encodeURIComponent(invitation.token)}`, inviterName: (await auth.api.getSession({ headers: await headers() }))?.user.name })
      invitationSent = true
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
  if (!record?.email) throw new Error('Staff account was not found')
  await assertCanManageEmployee(authorization, record)
  if (record.status === 'terminated') throw new Error('Restore this employee before sending an access email')
  try {
    const [previous] = await db.select({ branchId: staffInvitation.branchId }).from(staffInvitation).where(eq(staffInvitation.employeeId, record.id)).orderBy(desc(staffInvitation.createdAt)).limit(1)
    if (!previous) throw new Error('Invitation assignment was not found')
    const invitation = await createStaffInvitation({ employeeId: record.id, branchId: previous.branchId, userId: record.userId, email: record.email, organizationId: authorization.organizationId, createdBy: authorization.userId })
    await sendStaffInvitation({ employeeId: record.id, email: record.email, setupUrl: `${await invitationRedirectUrl()}?token=${encodeURIComponent(invitation.token)}` })
    const delivered = true
    const action = 'staff.invitation_resent'
    await db.insert(auditEvent).values({ id: nanoid(), organizationId: authorization.organizationId, userId: authorization.userId, action: delivered ? action : 'staff.invitation_failed', metadata: { employeeId, staffUserId: record.userId, accountStatus: record.status } })
    return { success: true, delivered, reused: false }
  } catch {
    await db.insert(auditEvent).values({ id: nanoid(), organizationId: authorization.organizationId, userId: authorization.userId, action: 'staff.invitation_failed', metadata: { employeeId, reason: 'delivery_failed' } })
    return { success: false, delivered: false }
  }
}

/** This is intentionally separate from resending a staff invitation token. */
export async function resendStaffEmailVerification(employeeId: string) {
  const authorization = await requirePermission(PermissionEnum.STAFF_MANAGE)
  const [record] = await db.select().from(employee).where(and(eq(employee.id, employeeId), eq(employee.orgId, authorization.organizationId))).limit(1)
  if (!record?.userId || record.status !== 'invitation_pending') throw new Error('Email verification is not pending for this employee')
  await assertCanManageEmployee(authorization, record)
  const [invite] = await db.select().from(staffInvitation).where(and(eq(staffInvitation.employeeId, record.id), eq(staffInvitation.status, 'AWAITING_EMAIL_VERIFICATION'), eq(staffInvitation.userId, record.userId))).orderBy(desc(staffInvitation.updatedAt)).limit(1)
  if (!invite) throw new Error('Email verification is not pending for this employee')
  await auth.api.sendVerificationEmail({ body: { email: invite.email }, headers: await headers() })
  await db.insert(auditEvent).values({ id: nanoid(), organizationId: authorization.organizationId, userId: authorization.userId, action: 'staff.verification_resent', metadata: { employeeId, invitationId: invite.id } })
  return { success: true }
}

export async function revokeStaffInvitationAction(employeeId: string) {
  const authorization = await requirePermission(PermissionEnum.STAFF_MANAGE)
  const [record] = await db.select().from(employee).where(and(eq(employee.id, employeeId), eq(employee.orgId, authorization.organizationId))).limit(1)
  if (!record) throw new Error('Employee not found')
  await assertCanManageEmployee(authorization, record)
  if (record.status === 'active') throw new Error('Active employees do not have a pending invitation')
  const invitation = await revokeCurrentStaffInvitation(employeeId, authorization.organizationId)
  if (invitation) await db.insert(auditEvent).values({ id: nanoid(), organizationId: authorization.organizationId, userId: authorization.userId, action: 'staff.invitation_revoked', metadata: { employeeId, invitationId: invitation.id } })
  revalidatePath('/dashboard/staff')
  return { success: true, revoked: Boolean(invitation) }
}

export async function updateStaffBranches(employeeId: string, branchIds: string[]) {
  const authorization = await requirePermission(PermissionEnum.STAFF_MANAGE)
  const ids = z.array(z.string().min(1)).min(1, 'Assign at least one branch').max(100).parse(Array.from(new Set(branchIds)))
  const [record] = await db.select().from(employee).where(and(eq(employee.id, employeeId), eq(employee.orgId, authorization.organizationId))).limit(1)
  if (!record?.userId) throw new Error('Staff login account was not found')
  await assertCanManageEmployee(authorization, record)
  const allowed = await db.select({ id: branch.id }).from(branch).where(and(
    eq(branch.organizationId, authorization.organizationId),
    authorization.isOrganizationWide ? inArray(branch.id, ids) : and(inArray(branch.id, ids), inArray(branch.id, authorization.branchIds)),
  ))
  if (allowed.length !== ids.length) throw new Error('One or more branches are outside your access')
  const organizationBranches = await db.select({ id: branch.id }).from(branch).where(eq(branch.organizationId, authorization.organizationId))
  const organizationBranchIds = organizationBranches.map(({ id }) => id)
  const managedBranchIds = authorization.isOrganizationWide ? organizationBranchIds : organizationBranchIds.filter((id) => authorization.branchIds.includes(id))
  const previous = managedBranchIds.length
    ? await db.select({ branchId: branchMembership.branchId }).from(branchMembership).where(and(eq(branchMembership.userId, record.userId), inArray(branchMembership.branchId, managedBranchIds)))
    : []
  await db.transaction(async (tx) => {
    if (managedBranchIds.length) await tx.delete(branchMembership).where(and(eq(branchMembership.userId, record.userId!), inArray(branchMembership.branchId, managedBranchIds)))
    await tx.insert(branchMembership).values(ids.map((branchId) => ({ id: nanoid(), branchId, userId: record.userId!, role: record.role })))
    await tx.insert(auditEvent).values({ id: nanoid(), organizationId: authorization.organizationId, userId: authorization.userId, action: 'staff.branches_updated', metadata: { employeeId, staffUserId: record.userId, previousBranchIds: previous.map(({ branchId }) => branchId), branchIds: ids } })
  })
  revalidatePath('/dashboard/staff')
  revalidatePath('/dashboard/admin/staff')
  return { success: true }
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
  joinDate?: string | Date
  branchId?: string
  shiftId?: string
  profile?: {
    employeeCode?: string
    dateOfBirth?: string
    gender?: string
    nationality?: string
    bloodGroup?: string
    about?: string
    address?: string
    country?: string
    state?: string
    city?: string
    zipcode?: string
    emergencyContact1?: string
    emergencyContact2?: string
    bankName?: string
    bankAccountNumber?: string
    bankCode?: string
    bankBranch?: string
  }
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
  if (input.branchId) {
    const [selectedBranch] = await db.select({ id: branch.id }).from(branch).where(and(eq(branch.id, input.branchId), eq(branch.organizationId, orgId), authorization.isOrganizationWide ? undefined : inArray(branch.id, authorization.branchIds))).limit(1)
    if (!selectedBranch) throw new Error('Choose a branch in this organization')
  }
  if (input.shiftId) {
    const [selectedShift] = await db.select({ id: shift.id }).from(shift).where(and(eq(shift.id, input.shiftId), eq(shift.orgId, orgId))).limit(1)
    if (!selectedShift) throw new Error('Choose a shift in this organization')
  }

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
        ...(input.joinDate && { joinDate: input.joinDate }),
        ...(input.profile && { profile: input.profile }),
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
      if (input.branchId && current.userId) {
        await tx.delete(branchMembership).where(and(eq(branchMembership.userId, current.userId), inArray(branchMembership.branchId, (await tx.select({ id: branch.id }).from(branch).where(eq(branch.organizationId, orgId))).map(({ id }) => id))))
        await tx.insert(branchMembership).values({ id: nanoid(), branchId: input.branchId, userId: current.userId, role: input.role ?? current.role })
      }
      if (input.shiftId !== undefined) {
        await tx.delete(shiftAssignment).where(and(eq(shiftAssignment.employeeId, current.id), eq(shiftAssignment.orgId, orgId)))
        if (input.shiftId) await tx.insert(shiftAssignment).values({ id: nanoid(), employeeId: current.id, shiftId: input.shiftId, date: input.joinDate ?? current.joinDate, orgId })
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
