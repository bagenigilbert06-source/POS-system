import './test-database-env.mjs'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import pg from 'pg'

const { db, pool } = await import('../lib/db')
const schema = await import('../lib/db/schema')
const { eq, and } = await import('drizzle-orm')
const { recordInventoryAlerts } = await import('../lib/notifications/inventory-alerts')
const { resolveNotificationRecipients, notificationEnabled } = await import('../lib/notifications/recipients')
const { materializeNotificationEvents } = await import('../lib/notifications/materialize')
const { claimNotificationDelivery, processDueNotifications } = await import('../lib/notifications/processor')
const { EmailDeliveryError } = await import('../lib/email/client')

const ssl = process.env.TEST_DATABASE_URL!.includes('supabase.com') ? { rejectUnauthorized: false } : undefined
const admin = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL, ssl })
const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`
const id = (name: string) => `notification-test-${name}-${suffix}`
const ownerId = id('owner'), orgId = id('org'), branchA = id('branch-a'), branchB = id('branch-b'), productId = id('product')
let migrationApplied = false

async function events(type?: string) {
  return db.select().from(schema.notificationEvent).where(type
    ? and(eq(schema.notificationEvent.organizationId, orgId), eq(schema.notificationEvent.type, type))
    : eq(schema.notificationEvent.organizationId, orgId))
}

async function alert(before: number, after: number) {
  await db.transaction((tx) => recordInventoryAlerts(tx, {
    organizationId: orgId, branchId: branchA, productId, productName: 'Test product',
    stockBefore: before, stockAfter: after, reorderPoint: 5,
  }))
}

await admin.connect()
try {
  const existing = await admin.query("select to_regclass('public.notification_event') as table")
  if (!existing.rows[0].table) {
    await admin.query(fs.readFileSync('drizzle/0078_notification_foundation.sql', 'utf8'))
    migrationApplied = true
  }

  await admin.query('begin')
  await admin.query('insert into "user" (id,name,email,status) values ($1,$2,$3,$4)', [ownerId, 'Owner', `${id('owner')}@example.test`, 'active'])
  await admin.query('insert into organization (id,name,slug,"userId",timezone) values ($1,$2,$3,$4,$5)', [orgId, 'Notification Test', id('slug'), ownerId, 'Africa/Nairobi'])
  await admin.query('insert into branch (id,"organizationId",code,name,timezone) values ($1,$2,$3,$4,$5),($6,$2,$7,$8,$9)', [branchA, orgId, 'A', 'Branch A', 'Africa/Nairobi', branchB, 'B', 'Branch B', 'Africa/Lagos'])
  await admin.query('insert into product (id,name,"sellingPrice","userId","orgId") values ($1,$2,$3,$4,$5)', [productId, 'Test product', '10', ownerId, orgId])
  await admin.query('commit')

  // PostgreSQL partial unique indexes distinguish organization and branch scope.
  await db.insert(schema.notificationPreference).values({ id: id('pref-org'), organizationId: orgId, role: 'inventory', type: 'LOW_STOCK', enabled: false })
  await assert.rejects(db.insert(schema.notificationPreference).values({ id: id('pref-org-dup'), organizationId: orgId, role: 'inventory', type: 'LOW_STOCK' }))
  await db.insert(schema.notificationPreference).values({ id: id('pref-a'), organizationId: orgId, branchId: branchA, role: 'inventory', type: 'LOW_STOCK', enabled: true })
  await db.insert(schema.notificationPreference).values({ id: id('pref-b'), organizationId: orgId, branchId: branchB, role: 'inventory', type: 'LOW_STOCK', enabled: false })
  assert.equal(await notificationEnabled(orgId, branchA, 'inventory', 'LOW_STOCK'), true)
  assert.equal(await notificationEnabled(orgId, branchB, 'inventory', 'LOW_STOCK'), false)
  assert.equal(await notificationEnabled(orgId, null, 'inventory', 'LOW_STOCK'), false)

  // Transaction rollback must remove an event completely.
  await assert.rejects(db.transaction(async (tx) => {
    await tx.insert(schema.notificationEvent).values({ id: id('rollback-event'), organizationId: orgId, type: 'LOW_STOCK', severity: 'WARNING', entityType: 'test', dedupeKey: id('rollback') })
    throw new Error('rollback')
  }))
  assert.equal((await events()).some((event) => event.id === id('rollback-event')), false)

  // Complete episode matrix, including direct healthy-to-zero policy.
  await alert(10, 5); await alert(5, 4); await alert(4, 2)
  assert.equal((await events('LOW_STOCK')).length, 1)
  await alert(2, 0); await alert(0, -1)
  assert.equal((await events('OUT_OF_STOCK')).length, 1)
  await alert(0, 3)
  assert.equal((await events('LOW_STOCK')).length, 1)
  await alert(3, 8); await alert(8, 5)
  assert.equal((await events('LOW_STOCK')).length, 2)
  await alert(5, 8)
  await db.delete(schema.notificationEvent).where(eq(schema.notificationEvent.organizationId, orgId))
  await alert(10, 0)
  assert.equal((await events('LOW_STOCK')).length, 0)
  assert.equal((await events('OUT_OF_STOCK')).length, 1)
  await alert(0, 3); await alert(3, 8); await alert(8, 5)
  assert.equal((await events('LOW_STOCK')).length, 1)

  // Two concurrent episode evaluations serialize on alert state and emit once.
  await alert(5, 8)
  await db.delete(schema.notificationEvent).where(eq(schema.notificationEvent.organizationId, orgId))
  await Promise.all([alert(10, 5), alert(10, 5)])
  assert.equal((await events('LOW_STOCK')).length, 1)

  // Build active/inactive and cross-branch recipient fixtures.
  const people = [
    ['inventory', 'inventory', 'active', branchA], ['manager', 'store_manager', 'active', branchA],
    ['admin', 'admin', 'active', null], ['inactive-user', 'inventory', 'inactive', branchA],
    ['inactive-employee', 'inventory', 'active', branchA], ['other-branch', 'inventory', 'active', branchB],
  ] as const
  for (const [name, role, userStatus, assignedBranch] of people) {
    const userId = id(name)
    await db.insert(schema.user).values({ id: userId, name, email: `${id(name)}@example.test`, status: userStatus })
    await db.insert(schema.organizationMembership).values({ id: id(`membership-${name}`), organizationId: orgId, userId, role: role === 'admin' ? 'admin' : 'member' })
    if (role !== 'admin') await db.insert(schema.employee).values({ id: id(`employee-${name}`), userId, name, email: `${id(name)}@example.test`, role, orgId, status: name === 'inactive-employee' ? 'inactive' : 'active' })
    if (assignedBranch) await db.insert(schema.branchMembership).values({ id: id(`branch-member-${name}`), branchId: assignedBranch, userId, role })
  }
  await db.delete(schema.notificationPreference).where(eq(schema.notificationPreference.organizationId, orgId))
  const lowRecipients = await resolveNotificationRecipients({ organizationId: orgId, branchId: branchA, type: 'LOW_STOCK' })
  assert.deepEqual(new Set(lowRecipients.map((item) => item.role)), new Set(['inventory', 'store_manager']))
  assert.equal(lowRecipients.length, 2)
  const outRecipients = await resolveNotificationRecipients({ organizationId: orgId, branchId: branchA, type: 'OUT_OF_STOCK' })
  assert.deepEqual(new Set(outRecipients.map((item) => item.role)), new Set(['inventory', 'store_manager', 'admin', 'owner']))
  assert.equal(outRecipients.length, 4)

  // Materialization snapshots normalized recipients once and remains idempotent.
  await db.delete(schema.notificationEvent).where(eq(schema.notificationEvent.organizationId, orgId))
  await db.insert(schema.notificationEvent).values({ id: id('materialize'), organizationId: orgId, branchId: branchA, type: 'LOW_STOCK', severity: 'WARNING', entityType: 'inventory_balance', entityId: productId, dedupeKey: id('materialize'), payload: { productName: 'Test', availableStock: 4, reorderPoint: 5 } })
  assert.equal(await materializeNotificationEvents(), 2)
  assert.equal(await materializeNotificationEvents(), 0)
  let deliveries = await db.select().from(schema.notificationDelivery).where(eq(schema.notificationDelivery.organizationId, orgId))
  assert.equal(deliveries.length, 2)
  assert.ok(deliveries.every((item) => item.recipientEmail === item.recipientEmail.toLowerCase()))

  // SKIP LOCKED claims are exclusive; success persists provider ID and protects SENT.
  const claimTime = new Date('2026-01-01T00:00:00Z')
  const claims = await Promise.all([claimNotificationDelivery(claimTime), claimNotificationDelivery(claimTime)])
  assert.equal(new Set(claims.map((item) => item?.id)).size, 2)
  await db.update(schema.notificationDelivery).set({ status: 'PENDING', attempts: 0, leaseUntil: null }).where(eq(schema.notificationDelivery.organizationId, orgId))
  const clock = () => claimTime
  const outcomes = await processDueNotifications(10, async () => ({ delivered: true, development: false, providerMessageId: 'test-provider-id' }), clock)
  assert.deepEqual(outcomes, ['SENT', 'SENT'])
  deliveries = await db.select().from(schema.notificationDelivery).where(eq(schema.notificationDelivery.organizationId, orgId))
  assert.ok(deliveries.every((item) => item.status === 'SENT' && item.providerMessageId === 'test-provider-id' && item.sentAt))
  assert.equal(await claimNotificationDelivery(claimTime), null)

  // Retry, permanent failure, max attempts, and stale-lease recovery.
  const retryId = deliveries[0].id
  await db.update(schema.notificationDelivery).set({ status: 'PENDING', attempts: 0, sentAt: null, providerMessageId: null }).where(eq(schema.notificationDelivery.id, retryId))
  await processDueNotifications(1, async () => { throw new EmailDeliveryError('temporary\nsecret-safe', true) }, clock)
  let [retry] = await db.select().from(schema.notificationDelivery).where(eq(schema.notificationDelivery.id, retryId))
  assert.equal(retry.status, 'RETRYABLE_FAILURE'); assert.equal(retry.attempts, 1); assert.ok(retry.nextRetryAt); assert.equal(retry.lastError?.includes('\n'), false)
  await db.update(schema.notificationDelivery).set({ status: 'PROCESSING', attempts: 7, leaseUntil: new Date(claimTime.getTime() - 1), nextRetryAt: null }).where(eq(schema.notificationDelivery.id, retryId))
  await processDueNotifications(1, async () => { throw new EmailDeliveryError('still temporary', true) }, clock)
  ;[retry] = await db.select().from(schema.notificationDelivery).where(eq(schema.notificationDelivery.id, retryId))
  assert.equal(retry.status, 'PERMANENT_FAILURE'); assert.equal(retry.attempts, 8); assert.ok(retry.failedAt)

  console.log('Notification PostgreSQL integration tests passed')
} finally {
  await admin.query('delete from "user" where id like $1', [`notification-test-%-${suffix}`]).catch(() => undefined)
  if (migrationApplied) await admin.query('drop table if exists notification_delivery, notification_alert_state, notification_preference, notification_event cascade')
  await admin.end()
  await pool.end()
}
