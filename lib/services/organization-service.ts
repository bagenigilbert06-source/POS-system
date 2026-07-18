import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { organization, organizationMembership } from '@/lib/db/schema'

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
    const memberships = await db.select({ organization }).from(organizationMembership)
      .innerJoin(organization, eq(organization.id, organizationMembership.organizationId))
      .where(eq(organizationMembership.userId, userId))
    return memberships.map((row) => row.organization)
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
