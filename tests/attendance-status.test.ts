import assert from 'node:assert/strict'
import { calculateAttendanceStatus, durationAfter, durationBefore } from '../lib/attendance/status'

const d = (hour: number, minute = 0) => new Date(Date.UTC(2026, 8, 10, hour, minute))
assert.equal(calculateAttendanceStatus({ now: d(9), scheduled: true, scheduledStart: d(8), scheduledEnd: d(17) }), 'scheduled')
assert.equal(calculateAttendanceStatus({ now: d(18), scheduled: true, scheduledStart: d(8), scheduledEnd: d(17) }), 'absent')
assert.equal(calculateAttendanceStatus({ now: d(12), scheduled: true, scheduledEnd: d(17), clockInAt: d(8), rawStatus: 'on_break' }), 'on_break')
assert.equal(calculateAttendanceStatus({ now: d(21), scheduled: true, scheduledEnd: d(17), clockInAt: d(8), missingClockOutAfterMinutes: 60 }), 'missing_clock_out')
assert.equal(calculateAttendanceStatus({ now: d(18), scheduled: true, scheduledStart: d(8), scheduledEnd: d(17), clockInAt: d(8, 20), clockOutAt: d(17), graceMinutes: 10 }), 'late')
assert.equal(calculateAttendanceStatus({ now: d(18), scheduled: true, scheduledStart: d(8), scheduledEnd: d(17), clockInAt: d(8), clockOutAt: d(16) }), 'early_departure')
assert.equal(calculateAttendanceStatus({ now: d(18), scheduled: true, scheduledStart: d(8), scheduledEnd: d(17), clockInAt: d(8), clockOutAt: d(18) }), 'overtime')
assert.equal(calculateAttendanceStatus({ now: d(18), scheduled: true, approvedLeave: true }), 'on_leave')
assert.equal(durationAfter(d(9), d(8)), 3_600_000)
assert.equal(durationBefore(d(16), d(17)), 3_600_000)
console.log('Attendance status tests passed')
