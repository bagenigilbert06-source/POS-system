import assert from 'node:assert/strict'
import { breakMilliseconds, workedMilliseconds } from '../lib/attendance/calculations'

const clockIn = new Date('2026-08-28T08:00:00Z')
const clockOut = new Date('2026-08-28T17:00:00Z')
const breaks = [{ startedAt: new Date('2026-08-28T12:00:00Z'), endedAt: new Date('2026-08-28T13:00:00Z') }]
assert.equal(breakMilliseconds(breaks), 60 * 60 * 1000)
assert.equal(workedMilliseconds(clockIn, clockOut, breaks), 8 * 60 * 60 * 1000)
assert.equal(workedMilliseconds(new Date('2026-08-28T20:00:00Z'), new Date('2026-08-29T04:00:00Z'), []), 8 * 60 * 60 * 1000)
console.log('attendance calculation tests passed')
