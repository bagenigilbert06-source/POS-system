import type { Metadata } from 'next';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { AttendanceDashboard } from '@/components/attendance/attendance-dashboard';
import { requireDashboardPermission } from '@/lib/auth/dashboard-access';
import { PermissionEnum } from '@/lib/types/permissions';
import { db } from '@/lib/db';
import {
  branch,
  organization,
  staffAttendance,
  staffAttendanceBreak,
  user,
} from '@/lib/db/schema';
import {
  breakMilliseconds,
  localWorkDate,
  workedMilliseconds,
} from '@/lib/attendance/calculations';

export const metadata: Metadata = { title: 'Attendance' };
export const dynamic = 'force-dynamic';
export default async function AttendancePage() {
  const authorization = await requireDashboardPermission(
    PermissionEnum.ATTENDANCE_USE
  );
  const canViewAll = authorization.permissions.includes(
    PermissionEnum.ATTENDANCE_VIEW_ALL
  );
  const [org] = await db
    .select({ timezone: organization.timezone })
    .from(organization)
    .where(eq(organization.id, authorization.organizationId))
    .limit(1);
  const timezone = org?.timezone || 'UTC';
  const records = await db
    .select({
      attendance: staffAttendance,
      name: user.name,
      branch: branch.name,
    })
    .from(staffAttendance)
    .innerJoin(user, eq(user.id, staffAttendance.userId))
    .innerJoin(branch, eq(branch.id, staffAttendance.branchId))
    .where(
      and(
        eq(staffAttendance.organizationId, authorization.organizationId),
        canViewAll
          ? undefined
          : eq(staffAttendance.userId, authorization.userId),
        authorization.isOrganizationWide
          ? undefined
          : inArray(staffAttendance.branchId, authorization.branchIds)
      )
    )
    .orderBy(desc(staffAttendance.clockInAt))
    .limit(250);
  const breaks = records.length
    ? await db
        .select()
        .from(staffAttendanceBreak)
        .where(
          inArray(
            staffAttendanceBreak.attendanceId,
            records.map((r) => r.attendance.id)
          )
        )
    : [];
  const byAttendance = new Map<string, typeof breaks>();
  breaks.forEach((item) =>
    byAttendance.set(item.attendanceId, [
      ...(byAttendance.get(item.attendanceId) ?? []),
      item,
    ])
  );
  const now = new Date();
  const rows = records.map(({ attendance, name, branch: branchName }) => {
    const pauses = byAttendance.get(attendance.id) ?? [];
    return {
      id: attendance.id,
      date: attendance.workDate,
      status: attendance.status,
      clockInAt: attendance.clockInAt.toISOString(),
      clockOutAt: attendance.clockOutAt?.toISOString() ?? null,
      breakMs: breakMilliseconds(pauses, now),
      workedMs: workedMilliseconds(
        attendance.clockInAt,
        attendance.clockOutAt,
        pauses,
        now
      ),
      name,
      branch: branchName,
    };
  });
  const [mine] = await db
    .select()
    .from(staffAttendance)
    .where(
      and(
        eq(staffAttendance.organizationId, authorization.organizationId),
        eq(staffAttendance.userId, authorization.userId)
      )
    )
    .orderBy(desc(staffAttendance.clockInAt))
    .limit(1);
  const current =
    mine && !mine.clockOutAt
      ? (mine.status as 'working' | 'on_break')
      : mine?.workDate === localWorkDate(now, timezone)
        ? 'clocked_out'
        : 'not_clocked_in';
  const [currentUser] = await db
    .select({ name: user.name })
    .from(user)
    .where(eq(user.id, authorization.userId))
    .limit(1);
  const me = currentUser?.name ?? 'there';
  return (
    <AttendanceDashboard
      name={me}
      timezone={timezone}
      state={current}
      rows={rows}
      managerView={canViewAll}
      canCorrect={authorization.permissions.includes(
        PermissionEnum.ATTENDANCE_CORRECT
      )}
      activePeople={rows
        .filter((r) => r.status !== 'clocked_out')
        .map((r) => ({
          name: r.name,
          status: r.status.replace('_', ' '),
          clockInAt: r.clockInAt,
        }))}
    />
  );
}
