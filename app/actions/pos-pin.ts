'use server';
import { cookies, headers } from 'next/headers';
import { and, eq, ne, sql } from 'drizzle-orm';
import { hashPassword, verifyPassword } from 'better-auth/crypto';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  auditEvent,
  branch,
  branchMembership,
  employee,
  organizationMembership,
  posAuthSession,
  posPinCredential,
  posSession,
  posTerminal,
  user,
} from '@/lib/db/schema';
import {
  AuthorizationError,
  getAuthorizationContext,
  requirePermission,
} from '@/lib/auth/authorization';
import {
  canManageExistingRole,
  PermissionEnum,
  ROLE_PERMISSIONS,
  RoleEnum,
} from '@/lib/types/permissions';
import { generateId } from '@/lib/utils';
import {
  POS_PIN_LOCK_SECONDS,
  POS_PIN_MAX_ATTEMPTS,
  findPosPinOwners,
  validatePosPin,
} from '@/lib/pos/pin-policy';
import {
  getTerminal,
  newToken,
  POS_AUTH_COOKIE,
  POS_LOCKED_SESSION_COOKIE,
  POS_TERMINAL_COOKIE,
  posCashierCookieOptions,
  posTerminalCookieOptions,
  tokenHash,
} from '@/lib/pos/pos-auth';

async function renewRegisteredTerminalIdentity() {
  const jar = await cookies();
  const token = jar.get(POS_TERMINAL_COOKIE)?.value;
  if (token) jar.set(POS_TERMINAL_COOKIE, token, posTerminalCookieOptions);
}

export async function setOwnPosPin(pin: string) {
  const error = validatePosPin(pin);
  if (error) throw new Error(error);
  const context = await requirePermission(PermissionEnum.POS_PIN_USE);
  const activeCredentials = await db
    .select({
      userId: posPinCredential.userId,
      pinHash: posPinCredential.pinHash,
    })
    .from(posPinCredential)
    .innerJoin(employee, eq(employee.userId, posPinCredential.userId))
    .where(
      and(
        eq(employee.orgId, context.organizationId),
        eq(employee.status, 'active'),
        eq(posPinCredential.enabled, true),
        ne(posPinCredential.userId, context.userId)
      )
    );
  const existingOwners = await findPosPinOwners(
    pin,
    activeCredentials,
    ({ pinHash }, value) => verifyPassword({ hash: pinHash, password: value })
  );
  if (existingOwners.length)
    throw new Error('This PIN is already assigned to another active cashier');
  const pinHash = await hashPassword(pin);
  await db
    .insert(posPinCredential)
    .values({ userId: context.userId, pinHash })
    .onConflictDoUpdate({
      target: posPinCredential.userId,
      set: {
        pinHash,
        failedAttempts: 0,
        lockedUntil: null,
        enabled: true,
        setAt: new Date(),
        updatedAt: new Date(),
      },
    });
  await db.insert(auditEvent).values({
    id: generateId(),
    organizationId: context.organizationId,
    userId: context.userId,
    action: 'pos.pin.created',
    metadata: {},
  });

  // Creating a PIN from the POS workspace is also proof that the signed-in
  // operator knows that PIN. If this browser is already bound to a terminal,
  // establish its cashier session now so the user is not immediately asked
  // to enter the same PIN a second time.
  const terminal = await getTerminal();
  if (
    terminal &&
    terminal.organizationId === context.organizationId &&
    (context.isOrganizationWide ||
      context.branchIds.includes(terminal.branchId))
  ) {
    const unlocked = await unlockPosWithStaffPin(context.userId, pin);
    if (!unlocked.success)
      throw new Error(
        unlocked.error ||
          'PIN was saved, but this POS terminal could not be unlocked'
      );
    return { success: true, unlocked: true };
  }

  return { success: true, unlocked: false };
}

export async function getOwnPosPinStatus() {
  const context = await getAuthorizationContext();
  const [credential] = await db
    .select({
      enabled: posPinCredential.enabled,
      setAt: posPinCredential.setAt,
    })
    .from(posPinCredential)
    .where(eq(posPinCredential.userId, context.userId))
    .limit(1);
  return {
    eligible: context.permissions.includes(PermissionEnum.POS_PIN_USE),
    isSet: Boolean(credential?.enabled),
    setAt: credential?.setAt ?? null,
  };
}

export async function resetStaffPosPin(employeeId: string, pin: string) {
  const pinError = validatePosPin(pin);
  if (pinError) throw new Error(pinError);
  const context = await requirePermission(PermissionEnum.POS_PIN_RESET);
  const [record] = await db
    .select()
    .from(employee)
    .where(
      and(
        eq(employee.id, employeeId),
        eq(employee.orgId, context.organizationId)
      )
    )
    .limit(1);
  if (!record?.userId) throw new Error('Employee account not found');
  // An authenticated PIN-reset administrator may recover their own cashier
  // PIN. Role-hierarchy checks still protect every other staff member.
  if (
    record.userId !== context.userId &&
    !canManageExistingRole(context.role, record.role as RoleEnum)
  )
    throw new Error('You cannot reset this staff member’s PIN');
  if (!context.isOrganizationWide) {
    const assignments = await db
      .select({ branchId: branchMembership.branchId })
      .from(branchMembership)
      .where(eq(branchMembership.userId, record.userId));
    if (
      !assignments.length ||
      assignments.some(({ branchId }) => !context.branchIds.includes(branchId))
    )
      throw new Error('This staff member is outside your assigned branches');
  }
  const activeCredentials = await db
    .select({
      userId: posPinCredential.userId,
      pinHash: posPinCredential.pinHash,
    })
    .from(posPinCredential)
    .innerJoin(employee, eq(employee.userId, posPinCredential.userId))
    .where(
      and(
        eq(employee.orgId, context.organizationId),
        eq(employee.status, 'active'),
        eq(posPinCredential.enabled, true),
        ne(posPinCredential.userId, record.userId)
      )
    );
  const owners = await findPosPinOwners(
    pin,
    activeCredentials,
    ({ pinHash }, value) => verifyPassword({ hash: pinHash, password: value })
  );
  if (owners.length)
    throw new Error('This PIN is already assigned to another active cashier');
  const pinHash = await hashPassword(pin);
  await db
    .insert(posPinCredential)
    .values({ userId: record.userId, pinHash })
    .onConflictDoUpdate({
      target: posPinCredential.userId,
      set: {
        pinHash,
        enabled: true,
        failedAttempts: 0,
        lockedUntil: null,
        setAt: new Date(),
        updatedAt: new Date(),
      },
    });
  await db
    .update(posAuthSession)
    .set({ status: 'revoked' })
    .where(
      and(
        eq(posAuthSession.userId, record.userId),
        eq(posAuthSession.organizationId, context.organizationId)
      )
    );
  await db.insert(auditEvent).values({
    id: generateId(),
    organizationId: context.organizationId,
    userId: context.userId,
    action: 'staff.pos_pin_reset',
    metadata: { employeeId },
  });
  return { success: true };
}

export async function registerCurrentPosTerminal(
  branchId: string,
  name: string
) {
  const context = await requirePermission(PermissionEnum.ADMIN_ACCESS);
  const terminalName = name.trim();
  if (terminalName.length < 2 || terminalName.length > 80)
    throw new Error('Enter a terminal name between 2 and 80 characters');
  const [valid] = await db
    .select()
    .from(branch)
    .where(
      and(
        eq(branch.id, branchId),
        eq(branch.organizationId, context.organizationId)
      )
    )
    .limit(1);
  if (
    !valid ||
    (!context.isOrganizationWide && !context.branchIds.includes(branchId))
  )
    throw new Error('Branch access denied');
  const existing = await getTerminal();
  if (existing?.branchId === branchId) {
    await renewRegisteredTerminalIdentity();
    return { success: true, terminalId: existing.id, existing: true };
  }
  const token = newToken();
  // A browser without a terminal cookie is a new POS device. Never rotate an
  // existing branch terminal's token here: that would make two tills share a
  // terminal identity and allow one cashier switch to affect the other till.
  await db.insert(posTerminal).values({
    id: generateId(),
    organizationId: context.organizationId,
    branchId,
    tokenHash: tokenHash(token),
    name: terminalName,
    registeredBy: context.userId,
  });
  (await cookies()).set(POS_TERMINAL_COOKIE, token, {
    ...posTerminalCookieOptions,
  });
  await db.insert(auditEvent).values({
    id: generateId(),
    organizationId: context.organizationId,
    userId: context.userId,
    action: 'pos_terminal.registered',
    metadata: { branchId, name: terminalName },
  });
  return { success: true, existing: false };
}

export async function getPosLockData() {
  const terminal = await getTerminal();
  if (!terminal) return { terminal: null, staff: [], activeUserId: null };
  const members = await db
    .select({
      id: user.id,
      name: user.name,
      role: organizationMembership.role,
      pinSet: sql<boolean>`${posPinCredential.userId} is not null`,
    })
    .from(branchMembership)
    .innerJoin(user, eq(user.id, branchMembership.userId))
    .innerJoin(
      organizationMembership,
      and(
        eq(organizationMembership.userId, user.id),
        eq(organizationMembership.organizationId, terminal.organizationId)
      )
    )
    .leftJoin(
      posPinCredential,
      and(
        eq(posPinCredential.userId, user.id),
        eq(posPinCredential.enabled, true)
      )
    )
    .innerJoin(
      employee,
      and(
        eq(employee.userId, user.id),
        eq(employee.orgId, terminal.organizationId),
        eq(employee.status, 'active')
      )
    )
    .where(eq(branchMembership.branchId, terminal.branchId));
  const eligible = members.filter(({ role }) =>
    ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS]?.includes(
      PermissionEnum.POS_PIN_USE
    )
  );
  return {
    terminal: { id: terminal.id, branchId: terminal.branchId },
    staff: eligible,
    activeUserId: null,
  };
}

export async function unlockPosWithPin(userId: string, pin: string) {
  const terminal = await getTerminal();
  if (!terminal) throw new Error('This POS terminal is not registered');
  const [[member], [account], [organizationRole], [staff], [credential]] =
    await Promise.all([
      db
        .select()
        .from(branchMembership)
        .where(
          and(
            eq(branchMembership.branchId, terminal.branchId),
            eq(branchMembership.userId, userId)
          )
        )
        .limit(1),
      db
        .select({ status: user.status })
        .from(user)
        .where(eq(user.id, userId))
        .limit(1),
      db
        .select({ role: organizationMembership.role })
        .from(organizationMembership)
        .where(
          and(
            eq(organizationMembership.organizationId, terminal.organizationId),
            eq(organizationMembership.userId, userId)
          )
        )
        .limit(1),
      db
        .select()
        .from(employee)
        .where(
          and(
            eq(employee.orgId, terminal.organizationId),
            eq(employee.userId, userId),
            eq(employee.status, 'active')
          )
        )
        .limit(1),
      db
        .select()
        .from(posPinCredential)
        .where(
          and(
            eq(posPinCredential.userId, userId),
            eq(posPinCredential.enabled, true)
          )
        )
        .limit(1),
    ]);
  const invalid = async () => {
    if (credential) {
      const attempts = credential.failedAttempts + 1,
        locked = attempts >= POS_PIN_MAX_ATTEMPTS;
      await db
        .update(posPinCredential)
        .set({
          failedAttempts: attempts,
          lockedUntil: locked
            ? new Date(Date.now() + POS_PIN_LOCK_SECONDS * 1000)
            : null,
          updatedAt: new Date(),
        })
        .where(eq(posPinCredential.userId, userId));
      await db.insert(auditEvent).values({
        id: generateId(),
        organizationId: terminal.organizationId,
        userId,
        action: locked ? 'pos.pin.locked' : 'pos.pin.login_failed',
        metadata: { terminalId: terminal.id, attempts },
      });
    }
    throw new Error('Invalid PIN');
  };
  if (
    !member ||
    !staff ||
    !credential ||
    account?.status !== 'active' ||
    !organizationRole ||
    !ROLE_PERMISSIONS[
      organizationRole.role as keyof typeof ROLE_PERMISSIONS
    ]?.includes(PermissionEnum.POS_PIN_USE) ||
    (credential.lockedUntil && credential.lockedUntil > new Date())
  )
    return invalid();
  if (!(await verifyPassword({ hash: credential.pinHash, password: pin })))
    return invalid();
  await db
    .update(posPinCredential)
    .set({ failedAttempts: 0, lockedUntil: null, updatedAt: new Date() })
    .where(eq(posPinCredential.userId, userId));
  const token = newToken();
  await db.transaction(async (tx) => {
    // Serialize PIN changes per physical terminal. This closes the race where
    // two cashiers submit valid PINs at the same time.
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`${terminal.organizationId}:terminal:${terminal.id}:pin`}, 0))`
    );
    const [activeShift] = await tx
      .select({
        openedBy: posSession.openedBy,
        status: posSession.status,
        cashierName: user.name,
      })
      .from(posSession)
      .leftJoin(user, eq(user.id, posSession.openedBy))
      .where(
        and(
          eq(posSession.orgId, terminal.organizationId),
          eq(posSession.terminalId, terminal.id),
          sql`${posSession.status} in ('open', 'closing')`
        )
      )
      .limit(1);
    if (activeShift && activeShift.openedBy !== userId)
      throw new Error(
        `${terminal.name} currently has an open shift for ${activeShift.cashierName || 'another cashier'}. End and reconcile the current shift before another cashier signs in.`
      );
    await tx
      .update(posAuthSession)
      .set({ status: 'switched' })
      .where(
        and(
          eq(posAuthSession.terminalId, terminal.id),
          eq(posAuthSession.status, 'active')
        )
      );
    await tx.insert(posAuthSession).values({
      id: generateId(),
      tokenHash: tokenHash(token),
      terminalId: terminal.id,
      userId,
      organizationId: terminal.organizationId,
      branchId: terminal.branchId,
      expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
    });
  });
  (await cookies()).set(POS_AUTH_COOKIE, token, posCashierCookieOptions);
  await renewRegisteredTerminalIdentity();
  await db.insert(auditEvent).values({
    id: generateId(),
    organizationId: terminal.organizationId,
    userId,
    action: 'pos.pin.login_success',
    metadata: { terminalId: terminal.id, branchId: terminal.branchId },
  });
  return { success: true };
}

/** Staff eligible to unlock the registered terminal. No contact data is exposed. */
export async function getPosTerminalContext() {
  const terminal = await getTerminal();
  if (!terminal) return { terminalName: null, branchName: null };
  const [location] = await db
    .select({ name: branch.name })
    .from(branch)
    .where(eq(branch.id, terminal.branchId))
    .limit(1);
  return {
    terminalName: terminal.name || null,
    branchName: location?.name || null,
  };
}

export async function getPosTerminalStaff() {
  try {
    const terminal = await getTerminal();
    if (!terminal) return { staff: [], error: 'Terminal access not allowed' };

    const members = await db
      .select({
        userId: employee.userId,
        name: employee.name,
        role: organizationMembership.role,
        pinSet: sql<boolean>`${posPinCredential.userId} is not null`,
      })
      .from(employee)
      .innerJoin(branchMembership, eq(branchMembership.userId, employee.userId))
      .innerJoin(
        organizationMembership,
        and(
          eq(organizationMembership.userId, employee.userId),
          eq(organizationMembership.organizationId, terminal.organizationId)
        )
      )
      .leftJoin(
        posPinCredential,
        and(
          eq(posPinCredential.userId, employee.userId),
          eq(posPinCredential.enabled, true)
        )
      )
      .where(
        and(
          eq(employee.orgId, terminal.organizationId),
          eq(employee.status, 'active'),
          eq(branchMembership.branchId, terminal.branchId)
        )
      );

    const staff = members
      .filter(
        (member) =>
          member.userId &&
          member.pinSet &&
          ROLE_PERMISSIONS[
            member.role as keyof typeof ROLE_PERMISSIONS
          ]?.includes(PermissionEnum.POS_PIN_USE)
      )
      .map((member) => ({
        id: member.userId!,
        name: member.name,
        pinSet: true as const,
      }));
    return { staff };
  } catch (error) {
    console.error('Unable to load POS terminal staff', error);
    return { staff: [], error: 'Unable to load staff for this terminal' };
  }
}

/** The cashier who locked this browser's current terminal session, if any. */
export async function getLockedPosStaff() {
  try {
    const jar = await cookies();
    const token = jar.get(POS_LOCKED_SESSION_COOKIE)?.value;
    const terminal = await getTerminal();
    if (!token || !terminal) return { staff: null };
    const [locked] = await db
      .select({
        userId: posAuthSession.userId,
        terminalId: posAuthSession.terminalId,
        organizationId: posAuthSession.organizationId,
        branchId: posAuthSession.branchId,
        expiresAt: posAuthSession.expiresAt,
      })
      .from(posAuthSession)
      .where(
        and(
          eq(posAuthSession.tokenHash, tokenHash(token)),
          eq(posAuthSession.status, 'locked')
        )
      )
      .limit(1);
    if (
      !locked ||
      locked.terminalId !== terminal.id ||
      locked.organizationId !== terminal.organizationId ||
      locked.branchId !== terminal.branchId ||
      locked.expiresAt <= new Date()
    )
      return { staff: null };
    const [staff] = await db
      .select({ name: employee.name, status: employee.status })
      .from(employee)
      .where(
        and(
          eq(employee.orgId, terminal.organizationId),
          eq(employee.userId, locked.userId)
        )
      )
      .limit(1);
    if (!staff || staff.status !== 'active')
      return { staff: null, error: 'Staff account inactive' };
    return { staff: { name: staff.name } };
  } catch (error) {
    console.error('Unable to load locked POS session', error);
    return { staff: null, error: 'Unable to restore the locked POS session' };
  }
}

/**
 * PIN login for a terminal-selected staff member. Expected authentication
 * failures are returned to the UI so they never surface as an RSC exception.
 */
export async function unlockPosWithStaffPin(userId: string, pin: string) {
  const pinError = validatePosPin(pin);
  if (pinError) return { success: false, error: pinError };

  try {
    const terminal = await getTerminal();
    if (!terminal)
      return { success: false, error: 'Terminal access not allowed' };

    const [[staff], [membership], [account], [credential]] = await Promise.all([
      db
        .select()
        .from(employee)
        .where(
          and(
            eq(employee.orgId, terminal.organizationId),
            eq(employee.userId, userId)
          )
        )
        .limit(1),
      db
        .select()
        .from(branchMembership)
        .where(
          and(
            eq(branchMembership.branchId, terminal.branchId),
            eq(branchMembership.userId, userId)
          )
        )
        .limit(1),
      db
        .select({ status: user.status })
        .from(user)
        .where(eq(user.id, userId))
        .limit(1),
      db
        .select()
        .from(posPinCredential)
        .where(
          and(
            eq(posPinCredential.userId, userId),
            eq(posPinCredential.enabled, true)
          )
        )
        .limit(1),
    ]);
    if (!staff || staff.status !== 'active' || account?.status !== 'active')
      return { success: false, error: 'Staff account inactive' };
    if (!membership)
      return { success: false, error: 'Terminal access not allowed' };
    if (!credential)
      return {
        success: false,
        error: 'POS PIN is not set for this staff account',
      };
    if (credential.lockedUntil && credential.lockedUntil > new Date())
      return {
        success: false,
        error: 'PIN is temporarily locked. Try again later.',
      };

    const permitted = await db
      .select({ role: organizationMembership.role })
      .from(organizationMembership)
      .where(
        and(
          eq(organizationMembership.organizationId, terminal.organizationId),
          eq(organizationMembership.userId, userId)
        )
      )
      .limit(1);
    const role = permitted[0]?.role as
      | keyof typeof ROLE_PERMISSIONS
      | undefined;
    if (!role || !ROLE_PERMISSIONS[role]?.includes(PermissionEnum.POS_PIN_USE))
      return { success: false, error: 'Terminal access not allowed' };

    if (!(await verifyPassword({ hash: credential.pinHash, password: pin }))) {
      const attempts = credential.failedAttempts + 1;
      const locked = attempts >= POS_PIN_MAX_ATTEMPTS;
      await db
        .update(posPinCredential)
        .set({
          failedAttempts: attempts,
          lockedUntil: locked
            ? new Date(Date.now() + POS_PIN_LOCK_SECONDS * 1000)
            : null,
          updatedAt: new Date(),
        })
        .where(eq(posPinCredential.userId, userId));
      await db.insert(auditEvent).values({
        id: generateId(),
        organizationId: terminal.organizationId,
        userId,
        action: locked ? 'pos.pin.locked' : 'pos.pin.login_failed',
        metadata: { terminalId: terminal.id, attempts },
      });
      return {
        success: false,
        error: locked
          ? 'PIN is temporarily locked. Try again later.'
          : 'Incorrect PIN',
      };
    }

    await db
      .update(posPinCredential)
      .set({ failedAttempts: 0, lockedUntil: null, updatedAt: new Date() })
      .where(eq(posPinCredential.userId, userId));
    await db
      .update(posAuthSession)
      .set({ status: 'switched' })
      .where(
        and(
          eq(posAuthSession.terminalId, terminal.id),
          sql`${posAuthSession.status} in ('active', 'locked')`
        )
      );
    const token = newToken();
    await db.insert(posAuthSession).values({
      id: generateId(),
      tokenHash: tokenHash(token),
      terminalId: terminal.id,
      userId,
      organizationId: terminal.organizationId,
      branchId: terminal.branchId,
      expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
    });
    (await cookies()).set(POS_AUTH_COOKIE, token, posCashierCookieOptions);
    (await cookies()).delete(POS_LOCKED_SESSION_COOKIE);
    await renewRegisteredTerminalIdentity();
    await db.insert(auditEvent).values({
      id: generateId(),
      organizationId: terminal.organizationId,
      userId,
      action: 'pos.pin.login_success',
      metadata: { terminalId: terminal.id, branchId: terminal.branchId },
    });
    return { success: true };
  } catch (error) {
    console.error('POS PIN unlock failed', error);
    return {
      success: false,
      error: 'Unable to unlock this POS terminal. Please try again.',
    };
  }
}

/** PIN-only login identifies the cashier server-side. */
export async function unlockPosByPin(pin: string) {
  const pinError = validatePosPin(pin);
  if (pinError) return { success: false, error: 'PIN_INVALID_FORMAT' };
  try {
    const terminal = await getTerminal();
    if (!terminal)
      return { success: false, error: 'Terminal access not allowed' };
    // A signed-in dashboard user may have switched workspaces while this
    // browser still holds a terminal cookie from a previous store. Never use
    // that stale terminal to search another store's PIN credentials.
    try {
      const dashboard = await getAuthorizationContext();
      if (dashboard.organizationId !== terminal.organizationId)
        return {
          success: false,
          error:
            'This POS device is registered to a different store. Register this device for the current store before unlocking it.',
        };
    } catch (error) {
      if (!(error instanceof AuthorizationError)) throw error;
    }
    const candidates = await db
      .select({
        userId: posPinCredential.userId,
        pinHash: posPinCredential.pinHash,
      })
      .from(posPinCredential)
      .innerJoin(employee, eq(employee.userId, posPinCredential.userId))
      .innerJoin(
        branchMembership,
        eq(branchMembership.userId, posPinCredential.userId)
      )
      .where(
        and(
          eq(employee.orgId, terminal.organizationId),
          eq(employee.status, 'active'),
          eq(posPinCredential.enabled, true),
          eq(branchMembership.branchId, terminal.branchId)
        )
      );
    const owners = await findPosPinOwners(
      pin,
      candidates,
      ({ pinHash }, value) => verifyPassword({ hash: pinHash, password: value })
    );
    if (owners.length === 1) return await unlockPosWithPin(owners[0], pin);
    return { success: false, error: 'PIN_NOT_FOUND' };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Unable to unlock this terminal',
    };
  }
}

/** Unlocks only the cashier who created the current locked terminal session. */
export async function unlockCurrentLockedPos(pin: string) {
  const pinError = validatePosPin(pin);
  if (pinError) return { success: false, error: pinError };

  try {
    const jar = await cookies();
    const token = jar.get(POS_LOCKED_SESSION_COOKIE)?.value;
    const terminal = await getTerminal();
    if (!token || !terminal)
      return { success: false, error: 'Terminal access not allowed' };
    const [locked] = await db
      .select()
      .from(posAuthSession)
      .where(
        and(
          eq(posAuthSession.tokenHash, tokenHash(token)),
          eq(posAuthSession.status, 'locked')
        )
      )
      .limit(1);
    if (
      !locked ||
      locked.terminalId !== terminal.id ||
      locked.organizationId !== terminal.organizationId ||
      locked.branchId !== terminal.branchId ||
      locked.expiresAt <= new Date()
    )
      return {
        success: false,
        error:
          'The locked POS session has expired. Use Switch cashier to continue.',
      };

    const [[staff], [membership], [account], [credential]] = await Promise.all([
      db
        .select({ status: employee.status })
        .from(employee)
        .where(
          and(
            eq(employee.orgId, locked.organizationId),
            eq(employee.userId, locked.userId)
          )
        )
        .limit(1),
      db
        .select({ role: organizationMembership.role })
        .from(organizationMembership)
        .where(
          and(
            eq(organizationMembership.organizationId, locked.organizationId),
            eq(organizationMembership.userId, locked.userId)
          )
        )
        .limit(1),
      db
        .select({ status: user.status })
        .from(user)
        .where(eq(user.id, locked.userId))
        .limit(1),
      db
        .select()
        .from(posPinCredential)
        .where(
          and(
            eq(posPinCredential.userId, locked.userId),
            eq(posPinCredential.enabled, true)
          )
        )
        .limit(1),
    ]);
    const [branchAccess] = await db
      .select({ userId: branchMembership.userId })
      .from(branchMembership)
      .where(
        and(
          eq(branchMembership.branchId, locked.branchId),
          eq(branchMembership.userId, locked.userId)
        )
      )
      .limit(1);

    if (staff?.status !== 'active' || account?.status !== 'active')
      return { success: false, error: 'Staff account inactive' };
    const role = membership?.role as keyof typeof ROLE_PERMISSIONS | undefined;
    if (
      !branchAccess ||
      !role ||
      !ROLE_PERMISSIONS[role]?.includes(PermissionEnum.POS_PIN_USE)
    )
      return { success: false, error: 'Terminal access not allowed' };
    if (!credential)
      return {
        success: false,
        error: 'POS PIN is not set for this staff account',
      };
    if (credential.lockedUntil && credential.lockedUntil > new Date())
      return {
        success: false,
        error: 'PIN is temporarily locked. Try again later.',
      };

    if (!(await verifyPassword({ hash: credential.pinHash, password: pin }))) {
      const attempts = credential.failedAttempts + 1;
      const pinLocked = attempts >= POS_PIN_MAX_ATTEMPTS;
      await db
        .update(posPinCredential)
        .set({
          failedAttempts: attempts,
          lockedUntil: pinLocked
            ? new Date(Date.now() + POS_PIN_LOCK_SECONDS * 1000)
            : null,
          updatedAt: new Date(),
        })
        .where(eq(posPinCredential.userId, locked.userId));
      await db.insert(auditEvent).values({
        id: generateId(),
        organizationId: locked.organizationId,
        userId: locked.userId,
        action: pinLocked ? 'pos.pin.locked' : 'pos.pin.login_failed',
        metadata: {
          terminalId: locked.terminalId,
          attempts,
          unlockExistingSession: true,
        },
      });
      return {
        success: false,
        error: pinLocked
          ? 'PIN is temporarily locked. Try again later.'
          : 'Incorrect PIN',
      };
    }

    await db.transaction(async (tx) => {
      await tx
        .update(posPinCredential)
        .set({ failedAttempts: 0, lockedUntil: null, updatedAt: new Date() })
        .where(eq(posPinCredential.userId, locked.userId));
      await tx
        .update(posAuthSession)
        .set({ status: 'active', lastSeenAt: new Date() })
        .where(
          and(
            eq(posAuthSession.id, locked.id),
            eq(posAuthSession.status, 'locked')
          )
        );
      await tx.insert(auditEvent).values({
        id: generateId(),
        organizationId: locked.organizationId,
        userId: locked.userId,
        action: 'pos.pin.unlock_success',
        metadata: {
          terminalId: locked.terminalId,
          branchId: locked.branchId,
          restoredSessionId: locked.id,
        },
      });
    });
    jar.set(POS_AUTH_COOKIE, token, posCashierCookieOptions);
    jar.delete(POS_LOCKED_SESSION_COOKIE);
    const terminalToken = jar.get(POS_TERMINAL_COOKIE)?.value;
    if (terminalToken)
      jar.set(POS_TERMINAL_COOKIE, terminalToken, posTerminalCookieOptions);
    return { success: true };
  } catch (error) {
    console.error('Unable to unlock locked POS session', error);
    return {
      success: false,
      error: 'Unable to unlock this POS terminal. Please try again.',
    };
  }
}

/** Unlock a registered terminal by a staff phone number without exposing its staff list. */
export async function unlockPosWithPhonePin(phone: string, pin: string) {
  const terminal = await getTerminal();
  if (!terminal) throw new Error('This POS terminal is not registered');
  const normalizedPhone = phone.replace(/\D/g, '');
  if (normalizedPhone.length < 7 || normalizedPhone.length > 15)
    throw new Error('Enter a valid phone number');

  const phoneKey =
    normalizedPhone.length >= 9 ? normalizedPhone.slice(-9) : normalizedPhone;
  const candidates = await db
    .select({ userId: employee.userId, phone: employee.phone })
    .from(employee)
    .innerJoin(branchMembership, eq(branchMembership.userId, employee.userId))
    .where(
      and(
        eq(employee.orgId, terminal.organizationId),
        eq(employee.status, 'active'),
        eq(branchMembership.branchId, terminal.branchId)
      )
    );
  const matches = candidates
    .filter((candidate) => {
      const candidateDigits = candidate.phone?.replace(/\D/g, '') ?? '';
      const candidateKey =
        candidateDigits.length >= 9
          ? candidateDigits.slice(-9)
          : candidateDigits;
      return candidateKey === phoneKey;
    })
    .filter(
      (candidate, index, all) =>
        all.findIndex((item) => item.userId === candidate.userId) === index
    );

  // A phone number must identify exactly one active staff member at this branch.
  // Keep the response generic so a terminal cannot be used to enumerate employees.
  if (matches.length !== 1 || !matches[0].userId)
    throw new Error('Phone number or PIN is incorrect');
  return unlockPosWithPin(matches[0].userId, pin);
}

export async function lockPos() {
  const jar = await cookies(),
    token = jar.get(POS_AUTH_COOKIE)?.value,
    terminal = await getTerminal();
  if (token) {
    await db
      .update(posAuthSession)
      .set({ status: 'locked' })
      .where(eq(posAuthSession.tokenHash, tokenHash(token)));
    jar.set(POS_LOCKED_SESSION_COOKIE, token, posCashierCookieOptions);
  }
  jar.delete(POS_AUTH_COOKIE);
  if (terminal) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (session?.user)
      await db.insert(auditEvent).values({
        id: generateId(),
        organizationId: terminal.organizationId,
        userId: session.user.id,
        action: 'pos.session.locked',
        metadata: { terminalId: terminal.id },
      });
  }
  return { success: true };
}
