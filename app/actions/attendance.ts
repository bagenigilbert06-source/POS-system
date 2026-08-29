'use server';

import { and, eq, inArray, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import {
  branch,
  employee,
  organization,
  posSession,
  staffAttendance,
  staffAttendanceAudit,
  staffAttendanceBreak,
  user,
} from '@/lib/db/schema';
import {
  getAuthorizationContext,
  AuthorizationError,
} from '@/lib/auth/authorization';
import { PermissionEnum } from '@/lib/types/permissions';
import { localWorkDate } from '@/lib/attendance/calculations';

type Result = { ok: true } | { ok: false; error: string };

async function actor() {
  const context = await getAuthorizationContext();
  if (!context.permissions.includes(PermissionEnum.ATTENDANCE_USE))
    throw new AuthorizationError('Attendance access is not permitted');
  const [account, org, activeEmployee] = await Promise.all([
    db
      .select({ status: user.status })
      .from(user)
      .where(eq(user.id, context.userId))
      .limit(1),
    db
      .select({ timezone: organization.timezone })
      .from(organization)
      .where(eq(organization.id, context.organizationId))
      .limit(1),
    db
      .select({ id: employee.id })
      .from(employee)
      .where(
        and(
          eq(employee.orgId, context.organizationId),
          eq(employee.userId, context.userId),
          eq(employee.status, 'active')
        )
      )
      .limit(1),
  ]);
  if (account[0]?.status !== 'active')
    throw new AuthorizationError('Your account is inactive');
  // Organization owners/admins may not have employee profiles yet.
  if (!activeEmployee[0] && !context.isOrganizationWide)
    throw new AuthorizationError('An active employee profile is required');
  const branches = await db
    .select({ id: branch.id, timezone: branch.timezone })
    .from(branch)
    .where(
      and(
        eq(branch.organizationId, context.organizationId),
        context.isOrganizationWide
          ? undefined
          : inArray(branch.id, context.branchIds)
      )
    );
  const selected = branches[0];
  if (!selected)
    throw new AuthorizationError('No authorized branch is assigned');
  return {
    context,
    branch: selected,
    timezone: selected.timezone || org[0]?.timezone || 'UTC',
  };
}

async function active(organizationId: string, userId: string) {
  return (
    await db
      .select()
      .from(staffAttendance)
      .where(
        and(
          eq(staffAttendance.organizationId, organizationId),
          eq(staffAttendance.userId, userId),
          isNull(staffAttendance.clockOutAt)
        )
      )
      .limit(1)
  )[0];
}
function refresh() {
  revalidatePath('/dashboard/attendance');
}

export async function clockIn(): Promise<Result> {
  try {
    const { context, branch: selectedBranch, timezone } = await actor();
    const now = new Date();
    try {
      await db.insert(staffAttendance).values({
        id: nanoid(),
        organizationId: context.organizationId,
        branchId: selectedBranch.id,
        userId: context.userId,
        workDate: localWorkDate(now, timezone),
        clockInAt: now,
        status: 'working',
      });
    } catch {
      return {
        ok: false,
        error: 'You already have an active attendance session.',
      };
    }
    refresh();
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unable to clock in',
    };
  }
}

export async function startBreak(): Promise<Result> {
  try {
    const { context } = await actor();
    const record = await active(context.organizationId, context.userId);
    if (!record)
      return { ok: false, error: 'Clock in before starting a break.' };
    const open = await db
      .select({ id: staffAttendanceBreak.id })
      .from(staffAttendanceBreak)
      .where(
        and(
          eq(staffAttendanceBreak.attendanceId, record.id),
          isNull(staffAttendanceBreak.endedAt)
        )
      )
      .limit(1);
    if (open[0]) return { ok: false, error: 'A break is already active.' };
    await db.transaction(async (tx) => {
      await tx.insert(staffAttendanceBreak).values({
        id: nanoid(),
        attendanceId: record.id,
        startedAt: new Date(),
      });
      await tx
        .update(staffAttendance)
        .set({ status: 'on_break', updatedAt: new Date() })
        .where(eq(staffAttendance.id, record.id));
    });
    refresh();
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unable to start break',
    };
  }
}

export async function endBreak(): Promise<Result> {
  try {
    const { context } = await actor();
    const record = await active(context.organizationId, context.userId);
    if (!record) return { ok: false, error: 'No active attendance session.' };
    const updated = await db
      .update(staffAttendanceBreak)
      .set({ endedAt: new Date() })
      .where(
        and(
          eq(staffAttendanceBreak.attendanceId, record.id),
          isNull(staffAttendanceBreak.endedAt)
        )
      )
      .returning({ id: staffAttendanceBreak.id });
    if (!updated[0])
      return { ok: false, error: 'There is no active break to end.' };
    await db
      .update(staffAttendance)
      .set({ status: 'working', updatedAt: new Date() })
      .where(eq(staffAttendance.id, record.id));
    refresh();
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unable to end break',
    };
  }
}

export async function clockOut(): Promise<Result> {
  try {
    const { context } = await actor();
    const record = await active(context.organizationId, context.userId);
    if (!record) return { ok: false, error: 'No active attendance session.' };
    const [openBreak, openRegister] = await Promise.all([
      db
        .select({ id: staffAttendanceBreak.id })
        .from(staffAttendanceBreak)
        .where(
          and(
            eq(staffAttendanceBreak.attendanceId, record.id),
            isNull(staffAttendanceBreak.endedAt)
          )
        )
        .limit(1),
      db
        .select({ id: posSession.id })
        .from(posSession)
        .where(
          and(
            eq(posSession.orgId, context.organizationId),
            eq(posSession.openedBy, context.userId),
            inArray(posSession.status, ['open', 'closing'])
          )
        )
        .limit(1),
    ]);
    if (openBreak[0])
      return { ok: false, error: 'End your active break before clocking out.' };
    if (openRegister[0])
      return {
        ok: false,
        error: 'Close your active register shift before clocking out.',
      };
    const updated = await db
      .update(staffAttendance)
      .set({
        clockOutAt: new Date(),
        status: 'clocked_out',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(staffAttendance.id, record.id),
          isNull(staffAttendance.clockOutAt)
        )
      )
      .returning({ id: staffAttendance.id });
    if (!updated[0])
      return {
        ok: false,
        error: 'This attendance session has already been clocked out.',
      };
    refresh();
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unable to clock out',
    };
  }
}

const correctionSchema = z.object({
  attendanceId: z.string().min(1),
  clockInAt: z.string().datetime(),
  clockOutAt: z.string().datetime().nullable(),
  reason: z.string().trim().min(3).max(500),
});

/** Correct a record without erasing its original values. */
export async function correctAttendance(
  input: z.infer<typeof correctionSchema>
): Promise<Result> {
  try {
    const parsed = correctionSchema.parse(input);
    const context = await getAuthorizationContext();
    if (!context.permissions.includes(PermissionEnum.ATTENDANCE_CORRECT))
      throw new AuthorizationError('Attendance correction is not permitted');
    const [record] = await db
      .select()
      .from(staffAttendance)
      .where(
        and(
          eq(staffAttendance.id, parsed.attendanceId),
          eq(staffAttendance.organizationId, context.organizationId)
        )
      )
      .limit(1);
    if (
      !record ||
      (!context.isOrganizationWide &&
        !context.branchIds.includes(record.branchId))
    )
      throw new AuthorizationError('No access to this attendance record');
    const clockInAt = new Date(parsed.clockInAt),
      clockOutAt = parsed.clockOutAt ? new Date(parsed.clockOutAt) : null;
    if (clockOutAt && clockOutAt <= clockInAt)
      return { ok: false, error: 'Clock out must be after clock in.' };
    await db.transaction(async (tx) => {
      await tx.insert(staffAttendanceAudit).values({
        id: nanoid(),
        attendanceId: record.id,
        organizationId: context.organizationId,
        managerId: context.userId,
        originalValue: {
          clockInAt: record.clockInAt.toISOString(),
          clockOutAt: record.clockOutAt?.toISOString() ?? null,
          status: record.status,
        },
        correctedValue: {
          clockInAt: clockInAt.toISOString(),
          clockOutAt: clockOutAt?.toISOString() ?? null,
          status: clockOutAt ? 'clocked_out' : record.status,
        },
        reason: parsed.reason,
      });
      await tx
        .update(staffAttendance)
        .set({
          clockInAt,
          clockOutAt,
          status: clockOutAt ? 'clocked_out' : record.status,
          updatedAt: new Date(),
        })
        .where(eq(staffAttendance.id, record.id));
    });
    refresh();
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : 'Unable to correct attendance',
    };
  }
}
