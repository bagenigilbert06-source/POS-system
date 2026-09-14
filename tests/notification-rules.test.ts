import assert from 'node:assert/strict'
import { digestIsDue } from '../lib/notifications/digest'
import { defaultRolesForNotification, resolvePreference } from '../lib/notifications/recipients'
import { inventoryAlertEmail } from '../lib/email/templates/operational-notification'

assert.equal(resolvePreference(undefined, undefined, true), true)
assert.equal(resolvePreference(undefined, false, true), false, 'explicit organization OFF wins')
assert.equal(resolvePreference(true, false, false), true, 'branch ON wins over organization OFF')
assert.equal(resolvePreference(false, true, true), false, 'branch OFF wins over organization ON')
assert.deepEqual(defaultRolesForNotification('LOW_STOCK'), ['inventory', 'store_manager'])
assert.deepEqual(defaultRolesForNotification('OUT_OF_STOCK'), ['inventory', 'store_manager', 'owner', 'admin'])

const beforeNairobi = new Date('2026-09-14T16:59:00Z')
const atNairobi = new Date('2026-09-14T17:00:00Z')
assert.equal(digestIsDue(beforeNairobi, 'Africa/Nairobi'), false)
assert.equal(digestIsDue(atNairobi, 'Africa/Nairobi'), true)
assert.equal(digestIsDue(new Date('2026-09-14T15:44:00Z'), 'Africa/Nairobi', '18:45'), false)
assert.equal(digestIsDue(new Date('2026-09-14T15:45:00Z'), 'Africa/Nairobi', '18:45'), true)
assert.equal(digestIsDue(new Date('2026-09-14T19:00:00Z'), 'Europe/London', '20:00'), true)

const email = inventoryAlertEmail({ type: 'LOW_STOCK', organization: 'Acme & Co', branch: '<Main>', product: '<Product>', available: 5, reorderPoint: 5, occurredAt: new Date('2026-09-14T10:00:00Z'), dashboardUrl: 'https://example.test/dashboard/inventory' })
assert.match(email.subject, /Low Stock Alert/)
assert.match(email.html, /&lt;Product&gt;/)
assert.doesNotMatch(email.html, /<Product>/)
assert.match(email.text, /Available stock: 5/)
console.log('Notification defaults, scheduling, precedence, and templates passed')
