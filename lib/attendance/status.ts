export type AttendanceStatus = 'not_scheduled' | 'scheduled' | 'working' | 'on_break' | 'present' | 'late' | 'absent' | 'early_departure' | 'overtime' | 'missing_clock_out' | 'on_leave' | 'holiday' | 'off_duty'

export type AttendanceStatusInput = {
  now: Date; scheduledStart?: Date | null; scheduledEnd?: Date | null; clockInAt?: Date | null; clockOutAt?: Date | null;
  rawStatus?: string | null; approvedLeave?: boolean; holiday?: boolean; scheduled?: boolean; graceMinutes?: number; missingClockOutAfterMinutes?: number;
}

export function calculateAttendanceStatus(input: AttendanceStatusInput): AttendanceStatus {
  if (input.approvedLeave) return 'on_leave'
  if (input.holiday) return 'holiday'
  if (!input.scheduled) return input.clockInAt ? activeOrCompleted(input) : 'not_scheduled'
  if (!input.clockInAt) return input.scheduledEnd && input.now > input.scheduledEnd ? 'absent' : 'scheduled'
  if (!input.clockOutAt && input.scheduledEnd && input.now.getTime() > input.scheduledEnd.getTime() + (input.missingClockOutAfterMinutes ?? 180) * 60_000) return 'missing_clock_out'
  if (!input.clockOutAt) return input.rawStatus === 'on_break' ? 'on_break' : 'working'
  if (input.scheduledStart && input.clockInAt.getTime() > input.scheduledStart.getTime() + (input.graceMinutes ?? 10) * 60_000) return 'late'
  if (input.scheduledEnd && input.clockOutAt < input.scheduledEnd) return 'early_departure'
  if (input.scheduledEnd && input.clockOutAt > input.scheduledEnd) return 'overtime'
  return 'present'
}

function activeOrCompleted(input: AttendanceStatusInput): AttendanceStatus {
  if (!input.clockOutAt) return input.rawStatus === 'on_break' ? 'on_break' : 'working'
  return 'present'
}

export function durationAfter(actual: Date | null | undefined, threshold: Date | null | undefined) {
  return actual && threshold ? Math.max(0, actual.getTime() - threshold.getTime()) : 0
}

export function durationBefore(actual: Date | null | undefined, threshold: Date | null | undefined) {
  return actual && threshold ? Math.max(0, threshold.getTime() - actual.getTime()) : 0
}
