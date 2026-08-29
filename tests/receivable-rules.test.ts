import assert from 'node:assert/strict'
import { organizationDateBoundaries, receivableAge } from '../lib/finance/dates'

const now = new Date('2026-08-28T12:00:00Z')
assert.equal(receivableAge(new Date('2026-08-28T00:00:00Z'), 'Africa/Nairobi', now).bucket, 'current')
assert.equal(receivableAge(new Date('2026-08-18T00:00:00Z'), 'Africa/Nairobi', now).bucket, '1-30')
assert.equal(receivableAge(new Date('2026-07-01T00:00:00Z'), 'Africa/Nairobi', now).bucket, '31-60')
assert.equal(receivableAge(new Date('2026-04-01T00:00:00Z'), 'Africa/Nairobi', now).bucket, '90+')
const boundaries = organizationDateBoundaries('Africa/Nairobi', now)
assert.equal(boundaries.today.toISOString(), '2026-08-27T21:00:00.000Z')
assert.equal(boundaries.monthStart.toISOString(), '2026-07-31T21:00:00.000Z')
console.log('receivable ageing rules passed')
