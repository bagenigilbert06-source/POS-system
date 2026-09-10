'use server'

import { and, eq, inArray } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { getAuthorizationContext, hasPermission } from '@/lib/auth/authorization'
import { db } from '@/lib/db'
import { attendanceCorrectionRequest, attendancePolicy, auditEvent, branch, employee, staffAttendance, staffLeave } from '@/lib/db/schema'
import { PermissionEnum } from '@/lib/types/permissions'
import { localWorkDate } from '@/lib/attendance/calculations'

const leaveSchema = z.object({ type: z.enum(['annual', 'sick', 'paid', 'unpaid', 'emergency', 'maternity', 'paternity']), startDate: z.string().date(), endDate: z.string().date(), reason: z.string().trim().min(3).max(500), documentUrl: z.string().url().max(2048).optional() })
const requestSchema = z.object({ attendanceId: z.string().optional(), type: z.enum(['missed_clock_in', 'missed_clock_out', 'incorrect_time', 'missing_break', 'incorrect_branch', 'incorrect_absence']), requestedValue: z.record(z.string(), z.unknown()), reason: z.string().trim().min(3).max(500) })

async function employeeForActor(organizationId: string, userId: string) {
  return (await db.select().from(employee).where(and(eq(employee.orgId, organizationId), eq(employee.userId, userId), eq(employee.status, 'active'))).limit(1))[0]
}

export async function requestLeave(input: z.input<typeof leaveSchema>) {
  const parsed = leaveSchema.parse(input), context = await getAuthorizationContext(), record = await employeeForActor(context.organizationId, context.userId)
  if (!record) throw new Error('An active employee profile is required')
  if (parsed.endDate < parsed.startDate) throw new Error('Leave end date must be on or after the start date')
  await db.insert(staffLeave).values({ id: nanoid(), organizationId: context.organizationId, employeeId: record.id, ...parsed, requestedBy: context.userId })
  revalidatePath('/dashboard/attendance')
  return { success: true }
}

export async function requestAttendanceCorrection(input: z.input<typeof requestSchema>) {
  const parsed = requestSchema.parse(input), context = await getAuthorizationContext(), record = await employeeForActor(context.organizationId, context.userId)
  if (!record) throw new Error('An active employee profile is required')
  if (parsed.attendanceId) {
    const [attendance] = await db.select({ id: staffAttendance.id }).from(staffAttendance).where(and(eq(staffAttendance.id, parsed.attendanceId), eq(staffAttendance.organizationId, context.organizationId), eq(staffAttendance.userId, context.userId))).limit(1)
    if (!attendance) throw new Error('Attendance record not found')
  }
  await db.insert(attendanceCorrectionRequest).values({ id: nanoid(), organizationId: context.organizationId, employeeId: record.id, attendanceId: parsed.attendanceId, type: parsed.type, requestedValue: parsed.requestedValue, reason: parsed.reason, requestedBy: context.userId })
  revalidatePath('/dashboard/attendance')
  return { success: true }
}

const decisionSchema = z.object({ id: z.string().min(1), decision: z.enum(['approved', 'rejected']), notes: z.string().trim().max(500).optional() })
export async function decideLeave(input: z.input<typeof decisionSchema>) {
  const parsed = decisionSchema.parse(input), context = await getAuthorizationContext()
  if (!hasPermission(context, PermissionEnum.ATTENDANCE_CORRECT)) throw new Error('Attendance approval is not permitted')
  const rows = await db.update(staffLeave).set({ status: parsed.decision, managerNotes: parsed.notes, decidedBy: context.userId, decidedAt: new Date(), updatedAt: new Date() }).where(and(eq(staffLeave.id, parsed.id), eq(staffLeave.organizationId, context.organizationId))).returning({ id: staffLeave.id, employeeId: staffLeave.employeeId })
  if (!rows[0]) throw new Error('Leave request not found')
  await db.insert(auditEvent).values({ id: nanoid(), organizationId: context.organizationId, userId: context.userId, action: `attendance.leave_${parsed.decision}`, metadata: { leaveId: parsed.id, employeeId: rows[0].employeeId, notes: parsed.notes } })
  revalidatePath('/dashboard/attendance'); return { success: true }
}

const manualSchema = z.object({ employeeId: z.string().min(1), branchId: z.string().min(1), clockInAt: z.string().datetime(), clockOutAt: z.string().datetime().optional(), reason: z.string().trim().min(3).max(500) })
export async function createManualAttendance(input: z.input<typeof manualSchema>) {
  const parsed = manualSchema.parse(input), context = await getAuthorizationContext()
  if (!hasPermission(context, PermissionEnum.ATTENDANCE_CORRECT)) throw new Error('Manual attendance is not permitted')
  if (!context.isOrganizationWide && (!context.branchIds.includes(parsed.branchId))) throw new Error('No access to this branch')
  const [[person], [location]] = await Promise.all([db.select({ userId: employee.userId }).from(employee).where(and(eq(employee.id, parsed.employeeId), eq(employee.orgId, context.organizationId), eq(employee.status, 'active'))).limit(1), db.select({ timezone: branch.timezone }).from(branch).where(and(eq(branch.id, parsed.branchId), eq(branch.organizationId, context.organizationId))).limit(1)])
  if (!person?.userId || !location) throw new Error('Employee or branch is unavailable')
  const clockInAt = new Date(parsed.clockInAt), clockOutAt = parsed.clockOutAt ? new Date(parsed.clockOutAt) : null
  if (clockOutAt && clockOutAt <= clockInAt) throw new Error('Clock out must be after clock in')
  const id = nanoid(); await db.insert(staffAttendance).values({ id, organizationId: context.organizationId, branchId: parsed.branchId, userId: person.userId, workDate: localWorkDate(clockInAt, location.timezone || 'UTC'), clockInAt, clockOutAt, status: clockOutAt ? 'clocked_out' : 'working' })
  await db.insert(auditEvent).values({ id: nanoid(), organizationId: context.organizationId, userId: context.userId, action: 'attendance.manual_entry_created', metadata: { attendanceId: id, employeeId: parsed.employeeId, reason: parsed.reason } })
  revalidatePath('/dashboard/attendance'); return { success: true }
}

export async function updateAttendancePolicy(input: { graceMinutes: number; overtimeAfterMinutes: number; missingClockOutAfterMinutes: number; expectedWorkdays: number[] }) {
  const parsed = z.object({ graceMinutes: z.number().int().min(0).max(180), overtimeAfterMinutes: z.number().int().min(0).max(480), missingClockOutAfterMinutes: z.number().int().min(0).max(1440), expectedWorkdays: z.array(z.number().int().min(0).max(6)).min(1) }).parse(input), context = await getAuthorizationContext()
  if (!hasPermission(context, PermissionEnum.ATTENDANCE_CORRECT)) throw new Error('Attendance policy management is not permitted')
  await db.insert(attendancePolicy).values({ id: nanoid(), organizationId: context.organizationId, ...parsed, updatedBy: context.userId }).onConflictDoUpdate({ target: attendancePolicy.organizationId, set: { ...parsed, updatedBy: context.userId, updatedAt: new Date() } })
  revalidatePath('/dashboard/attendance'); return { success: true }
}
