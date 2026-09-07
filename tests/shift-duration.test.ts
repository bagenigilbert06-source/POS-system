import assert from 'node:assert/strict'
import { formatRegisterShiftDuration, registerShiftDurationMinutes } from '../lib/pos/shift-duration'

const openedAt = new Date('2026-09-08T05:15:00.000Z')
assert.equal(registerShiftDurationMinutes(openedAt, new Date('2026-09-08T07:49:00.000Z')), 154)
assert.equal(formatRegisterShiftDuration(35), '35m')
assert.equal(formatRegisterShiftDuration(154), '2h 34m')
assert.equal(formatRegisterShiftDuration(605), '10h 05m')
assert.equal(registerShiftDurationMinutes(openedAt, new Date('2026-09-08T04:00:00.000Z')), 0)
console.log('Register shift duration unit test passed')
