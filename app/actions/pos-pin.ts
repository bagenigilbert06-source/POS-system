'use server'
import { cookies, headers } from 'next/headers'
import { and, eq, sql } from 'drizzle-orm'
import { hashPassword, verifyPassword } from 'better-auth/crypto'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { auditEvent, branch, branchMembership, employee, organizationMembership, posAuthSession, posPinCredential, posTerminal, user } from '@/lib/db/schema'
import { getAuthorizationContext, requirePermission } from '@/lib/auth/authorization'
import { canManageExistingRole, PermissionEnum, ROLE_PERMISSIONS, RoleEnum } from '@/lib/types/permissions'
import { generateId } from '@/lib/utils'
import { POS_PIN_LOCK_MINUTES, POS_PIN_MAX_ATTEMPTS, validatePosPin } from '@/lib/pos/pin-policy'
import { getTerminal, newToken, POS_AUTH_COOKIE, POS_TERMINAL_COOKIE, posCookieOptions, tokenHash } from '@/lib/pos/pos-auth'

export async function setOwnPosPin(pin: string) {
  const error = validatePosPin(pin); if (error) throw new Error(error)
  const context = await requirePermission(PermissionEnum.POS_PIN_USE)
  await db.insert(posPinCredential).values({ userId: context.userId, pinHash: await hashPassword(pin) }).onConflictDoUpdate({ target: posPinCredential.userId, set: { pinHash: await hashPassword(pin), failedAttempts: 0, lockedUntil: null, enabled: true, setAt: new Date(), updatedAt: new Date() } })
  await db.insert(auditEvent).values({ id: generateId(), organizationId: context.organizationId, userId: context.userId, action: 'pos.pin.created', metadata: {} })
  return { success: true }
}

export async function getOwnPosPinStatus() {
  const context = await getAuthorizationContext()
  const [credential] = await db.select({ enabled: posPinCredential.enabled, setAt: posPinCredential.setAt }).from(posPinCredential).where(eq(posPinCredential.userId, context.userId)).limit(1)
  return { eligible: context.permissions.includes(PermissionEnum.POS_PIN_USE), isSet: Boolean(credential?.enabled), setAt: credential?.setAt ?? null }
}

export async function resetStaffPosPin(employeeId: string) {
  const context = await requirePermission(PermissionEnum.POS_PIN_RESET)
  const [record] = await db.select().from(employee).where(and(eq(employee.id, employeeId), eq(employee.orgId, context.organizationId))).limit(1)
  if (!record?.userId) throw new Error('Employee account not found')
  if (record.userId === context.userId || !canManageExistingRole(context.role, record.role as RoleEnum)) throw new Error('You cannot reset this staff member’s PIN')
  if (!context.isOrganizationWide) {
    const assignments = await db.select({ branchId: branchMembership.branchId }).from(branchMembership).where(eq(branchMembership.userId, record.userId))
    if (!assignments.length || assignments.some(({ branchId }) => !context.branchIds.includes(branchId))) throw new Error('This staff member is outside your assigned branches')
  }
  await db.delete(posPinCredential).where(eq(posPinCredential.userId, record.userId))
  await db.update(posAuthSession).set({ status: 'revoked' }).where(and(eq(posAuthSession.userId, record.userId), eq(posAuthSession.organizationId, context.organizationId)))
  await db.insert(auditEvent).values({ id: generateId(), organizationId: context.organizationId, userId: context.userId, action: 'pos.pin.reset_requested', metadata: { employeeId } })
  return { success: true }
}

export async function registerCurrentPosTerminal(branchId: string) {
  const context = await getAuthorizationContext()
  if (!context.permissions.includes(PermissionEnum.POS_VIEW)) throw new Error('POS access is required')
  const [valid] = await db.select().from(branch).where(and(eq(branch.id, branchId), eq(branch.organizationId, context.organizationId))).limit(1)
  if (!valid || (!context.isOrganizationWide && !context.branchIds.includes(branchId))) throw new Error('Branch access denied')
  const existing = await getTerminal(); if (existing?.branchId === branchId) return { success: true }
  const token = newToken()
  await db.insert(posTerminal).values({ id: generateId(), organizationId: context.organizationId, branchId, tokenHash: tokenHash(token), registeredBy: context.userId })
  ;(await cookies()).set(POS_TERMINAL_COOKIE, token, { ...posCookieOptions, maxAge: 60 * 60 * 24 * 30 })
  return { success: true }
}

export async function getPosLockData() {
  const terminal = await getTerminal(); if (!terminal) return { terminal: null, staff: [], activeUserId: null }
  const members = await db.select({ id: user.id, name: user.name, role: organizationMembership.role, pinSet: sql<boolean>`${posPinCredential.userId} is not null` }).from(branchMembership)
    .innerJoin(user, eq(user.id, branchMembership.userId)).innerJoin(organizationMembership, and(eq(organizationMembership.userId, user.id), eq(organizationMembership.organizationId, terminal.organizationId)))
    .leftJoin(posPinCredential, and(eq(posPinCredential.userId, user.id), eq(posPinCredential.enabled, true))).innerJoin(employee, and(eq(employee.userId, user.id), eq(employee.orgId, terminal.organizationId), eq(employee.status, 'active')))
    .where(eq(branchMembership.branchId, terminal.branchId))
  const eligible = members.filter(({ role }) => ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS]?.includes(PermissionEnum.POS_PIN_USE))
  return { terminal: { id: terminal.id, branchId: terminal.branchId }, staff: eligible, activeUserId: null }
}

export async function unlockPosWithPin(userId: string, pin: string) {
  const terminal = await getTerminal(); if (!terminal) throw new Error('This POS terminal is not registered')
  const [[member], [staff], [credential]] = await Promise.all([
    db.select().from(branchMembership).where(and(eq(branchMembership.branchId, terminal.branchId), eq(branchMembership.userId, userId))).limit(1),
    db.select().from(employee).where(and(eq(employee.orgId, terminal.organizationId), eq(employee.userId, userId), eq(employee.status, 'active'))).limit(1),
    db.select().from(posPinCredential).where(and(eq(posPinCredential.userId, userId), eq(posPinCredential.enabled, true))).limit(1),
  ])
  const invalid = async () => { if (credential) { const attempts = credential.failedAttempts + 1, locked = attempts >= POS_PIN_MAX_ATTEMPTS; await db.update(posPinCredential).set({ failedAttempts: attempts, lockedUntil: locked ? new Date(Date.now() + POS_PIN_LOCK_MINUTES * 60000) : null, updatedAt: new Date() }).where(eq(posPinCredential.userId, userId)); await db.insert(auditEvent).values({ id: generateId(), organizationId: terminal.organizationId, userId, action: locked ? 'pos.pin.locked' : 'pos.pin.login_failed', metadata: { terminalId: terminal.id, attempts } }) } throw new Error('Invalid PIN') }
  if (!member || !staff || !credential || (credential.lockedUntil && credential.lockedUntil > new Date())) return invalid()
  if (!(await verifyPassword({ hash: credential.pinHash, password: pin }))) return invalid()
  await db.update(posPinCredential).set({ failedAttempts: 0, lockedUntil: null, updatedAt: new Date() }).where(eq(posPinCredential.userId, userId))
  await db.update(posAuthSession).set({ status: 'switched' }).where(and(eq(posAuthSession.terminalId, terminal.id), eq(posAuthSession.status, 'active')))
  const token = newToken(); await db.insert(posAuthSession).values({ id: generateId(), tokenHash: tokenHash(token), terminalId: terminal.id, userId, organizationId: terminal.organizationId, branchId: terminal.branchId, expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000) })
  ;(await cookies()).set(POS_AUTH_COOKIE, token, posCookieOptions)
  await db.insert(auditEvent).values({ id: generateId(), organizationId: terminal.organizationId, userId, action: 'pos.pin.login_success', metadata: { terminalId: terminal.id, branchId: terminal.branchId } })
  return { success: true }
}

/** Staff eligible to unlock the registered terminal. No contact data is exposed. */
export async function getPosTerminalStaff() {
  try {
    const terminal = await getTerminal()
    if (!terminal) return { staff: [], error: 'Terminal access not allowed' }

    const members = await db.select({
      userId: employee.userId,
      name: employee.name,
      role: organizationMembership.role,
      pinSet: sql<boolean>`${posPinCredential.userId} is not null`,
    }).from(employee)
      .innerJoin(branchMembership, eq(branchMembership.userId, employee.userId))
      .innerJoin(organizationMembership, and(eq(organizationMembership.userId, employee.userId), eq(organizationMembership.organizationId, terminal.organizationId)))
      .leftJoin(posPinCredential, and(eq(posPinCredential.userId, employee.userId), eq(posPinCredential.enabled, true)))
      .where(and(eq(employee.orgId, terminal.organizationId), eq(employee.status, 'active'), eq(branchMembership.branchId, terminal.branchId)))

    const staff = members
      .filter((member) => member.userId && ROLE_PERMISSIONS[member.role as keyof typeof ROLE_PERMISSIONS]?.includes(PermissionEnum.POS_PIN_USE))
      .map((member) => ({ id: member.userId!, name: member.name, role: member.role, pinSet: member.pinSet }))
    return { staff }
  } catch (error) {
    console.error('Unable to load POS terminal staff', error)
    return { staff: [], error: 'Unable to load staff for this terminal' }
  }
}

/**
 * PIN login for a terminal-selected staff member. Expected authentication
 * failures are returned to the UI so they never surface as an RSC exception.
 */
export async function unlockPosWithStaffPin(userId: string, pin: string) {
  const pinError = validatePosPin(pin)
  if (pinError) return { success: false, error: pinError }

  try {
    const terminal = await getTerminal()
    if (!terminal) return { success: false, error: 'Terminal access not allowed' }

    const [[staff], [membership], [account], [credential]] = await Promise.all([
      db.select().from(employee).where(and(eq(employee.orgId, terminal.organizationId), eq(employee.userId, userId))).limit(1),
      db.select().from(branchMembership).where(and(eq(branchMembership.branchId, terminal.branchId), eq(branchMembership.userId, userId))).limit(1),
      db.select({ status: user.status }).from(user).where(eq(user.id, userId)).limit(1),
      db.select().from(posPinCredential).where(and(eq(posPinCredential.userId, userId), eq(posPinCredential.enabled, true))).limit(1),
    ])
    if (!staff || staff.status !== 'active' || account?.status !== 'active')
      return { success: false, error: 'Staff account inactive' }
    if (!membership) return { success: false, error: 'Terminal access not allowed' }
    if (!credential) return { success: false, error: 'POS PIN is not set for this staff account' }
    if (credential.lockedUntil && credential.lockedUntil > new Date())
      return { success: false, error: 'PIN is temporarily locked. Try again later.' }

    const permitted = await db.select({ role: organizationMembership.role }).from(organizationMembership)
      .where(and(eq(organizationMembership.organizationId, terminal.organizationId), eq(organizationMembership.userId, userId))).limit(1)
    const role = permitted[0]?.role as keyof typeof ROLE_PERMISSIONS | undefined
    if (!role || !ROLE_PERMISSIONS[role]?.includes(PermissionEnum.POS_PIN_USE))
      return { success: false, error: 'Terminal access not allowed' }

    if (!(await verifyPassword({ hash: credential.pinHash, password: pin }))) {
      const attempts = credential.failedAttempts + 1
      const locked = attempts >= POS_PIN_MAX_ATTEMPTS
      await db.update(posPinCredential).set({ failedAttempts: attempts, lockedUntil: locked ? new Date(Date.now() + POS_PIN_LOCK_MINUTES * 60000) : null, updatedAt: new Date() }).where(eq(posPinCredential.userId, userId))
      await db.insert(auditEvent).values({ id: generateId(), organizationId: terminal.organizationId, userId, action: locked ? 'pos.pin.locked' : 'pos.pin.login_failed', metadata: { terminalId: terminal.id, attempts } })
      return { success: false, error: locked ? 'PIN is temporarily locked. Try again later.' : 'Incorrect PIN' }
    }

    await db.update(posPinCredential).set({ failedAttempts: 0, lockedUntil: null, updatedAt: new Date() }).where(eq(posPinCredential.userId, userId))
    await db.update(posAuthSession).set({ status: 'switched' }).where(and(eq(posAuthSession.terminalId, terminal.id), eq(posAuthSession.status, 'active')))
    const token = newToken()
    await db.insert(posAuthSession).values({ id: generateId(), tokenHash: tokenHash(token), terminalId: terminal.id, userId, organizationId: terminal.organizationId, branchId: terminal.branchId, expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000) })
    ;(await cookies()).set(POS_AUTH_COOKIE, token, posCookieOptions)
    await db.insert(auditEvent).values({ id: generateId(), organizationId: terminal.organizationId, userId, action: 'pos.pin.login_success', metadata: { terminalId: terminal.id, branchId: terminal.branchId } })
    return { success: true }
  } catch (error) {
    console.error('POS PIN unlock failed', error)
    return { success: false, error: 'Unable to unlock this POS terminal. Please try again.' }
  }
}

/** Unlock a registered terminal by a staff phone number without exposing its staff list. */
export async function unlockPosWithPhonePin(phone: string, pin: string) {
  const terminal = await getTerminal()
  if (!terminal) throw new Error('This POS terminal is not registered')
  const normalizedPhone = phone.replace(/\D/g, '')
  if (normalizedPhone.length < 7 || normalizedPhone.length > 15) throw new Error('Enter a valid phone number')

  const phoneKey = normalizedPhone.length >= 9 ? normalizedPhone.slice(-9) : normalizedPhone
  const candidates = await db.select({ userId: employee.userId, phone: employee.phone }).from(employee)
    .innerJoin(branchMembership, eq(branchMembership.userId, employee.userId))
    .where(and(
      eq(employee.orgId, terminal.organizationId),
      eq(employee.status, 'active'),
      eq(branchMembership.branchId, terminal.branchId),
    ))
  const matches = candidates.filter((candidate) => {
    const candidateDigits = candidate.phone?.replace(/\D/g, '') ?? ''
    const candidateKey = candidateDigits.length >= 9 ? candidateDigits.slice(-9) : candidateDigits
    return candidateKey === phoneKey
  }).filter((candidate, index, all) => all.findIndex((item) => item.userId === candidate.userId) === index)

  // A phone number must identify exactly one active staff member at this branch.
  // Keep the response generic so a terminal cannot be used to enumerate employees.
  if (matches.length !== 1 || !matches[0].userId) throw new Error('Phone number or PIN is incorrect')
  return unlockPosWithPin(matches[0].userId, pin)
}

export async function lockPos() {
  const jar = await cookies(), token = jar.get(POS_AUTH_COOKIE)?.value, terminal = await getTerminal()
  if (token) await db.update(posAuthSession).set({ status: 'locked' }).where(eq(posAuthSession.tokenHash, tokenHash(token)))
  jar.delete(POS_AUTH_COOKIE)
  if (terminal) { const session = await auth.api.getSession({ headers: await headers() }); if (session?.user) await db.insert(auditEvent).values({ id: generateId(), organizationId: terminal.organizationId, userId: session.user.id, action: 'pos.session.locked', metadata: { terminalId: terminal.id } }) }
  return { success: true }
}
