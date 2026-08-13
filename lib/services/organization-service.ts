import { and, eq } from 'drizzle-orm'
import { cache } from 'react'
import { db } from '@/lib/db'
import { employee, organization, organizationMembership } from '@/lib/db/schema'

const organizationsForUser = cache(async (userId: string) => {
  const memberships = await db.select({ organization }).from(organizationMembership)
    .innerJoin(organization, eq(organization.id, organizationMembership.organizationId))
    .where(eq(organizationMembership.userId, userId))
  if (memberships.length) return memberships.map((row) => row.organization)

  // Compatibility for valid active employees created before membership records
  // were consistently persisted. Authorization applies the same scoped fallback.
  const staffOrganizations = await db.select({ organization }).from(employee)
    .innerJoin(organization, eq(organization.id, employee.orgId))
    .where(and(eq(employee.userId, userId), eq(employee.status, 'active')))
  return staffOrganizations.map((row) => row.organization)
})

/** Tenant-scoped organization reads. Persistence belongs to transactional services. */
export class OrganizationService {
  static async getOrganization(organizationId: string, userId?: string) {
    if (!userId) return null
    const [owned] = await db.select().from(organization).where(and(eq(organization.id, organizationId), eq(organization.userId, userId))).limit(1)
    if (owned) return owned
    const [membership] = await db.select({ organization: organization }).from(organizationMembership)
      .innerJoin(organization, eq(organization.id, organizationMembership.organizationId))
      .where(and(eq(organizationMembership.organizationId, organizationId), eq(organizationMembership.userId, userId))).limit(1)
    return membership?.organization ?? null
  }

  static async getOrganizationsForUser(userId: string) {
    return organizationsForUser(userId)
  }

  static async getPrimaryOrganization(userId: string) {
    return (await this.getOrganizationsForUser(userId))[0] ?? null
  }

  static async getOwnedOrganization(userId: string) {
    const [owned] = await db.select().from(organization).where(eq(organization.userId, userId)).limit(1)
    return owned ?? null
  }

  static async canUserAccess(organizationId: string, userId: string) {
    return Boolean(await this.getOrganization(organizationId, userId))
  }
}
