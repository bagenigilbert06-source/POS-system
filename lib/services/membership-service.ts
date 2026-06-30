import { db } from '@/lib/db'
import { organizationMembership, user } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { generateId } from '@/lib/utils'

export class MembershipService {
  /**
   * Create a new membership for a user in an organization
   */
  static async createMembership(
    organizationId: string,
    userId: string,
    role: string = 'member'
  ) {
    const id = generateId()
    
    const result = await db
      .insert(organizationMembership)
      .values({
        id,
        organizationId,
        userId,
        role,
      })
      .returning()

    return result[0]
  }

  /**
   * Get a user's membership in an organization
   */
  static async getMembership(organizationId: string, userId: string) {
    const result = await db
      .select()
      .from(organizationMembership)
      .where(
        and(
          eq(organizationMembership.organizationId, organizationId),
          eq(organizationMembership.userId, userId)
        )
      )
      .limit(1)

    return result[0] || null
  }

  /**
   * Get all members of an organization
   */
  static async getMembers(organizationId: string) {
    const result = await db
      .select()
      .from(organizationMembership)
      .where(eq(organizationMembership.organizationId, organizationId))

    return result
  }

  /**
   * Get user's role in organization
   */
  static async getUserRole(organizationId: string, userId: string) {
    const membership = await this.getMembership(organizationId, userId)
    return membership?.role || null
  }

  /**
   * Check if user has a specific role in organization
   */
  static async hasRole(
    organizationId: string,
    userId: string,
    allowedRoles: string[]
  ): Promise<boolean> {
    const role = await this.getUserRole(organizationId, userId)
    return role ? allowedRoles.includes(role) : false
  }

  /**
   * Update user's role in organization
   */
  static async updateRole(
    organizationId: string,
    userId: string,
    newRole: string
  ) {
    const result = await db
      .update(organizationMembership)
      .set({ role: newRole, updatedAt: new Date() })
      .where(
        and(
          eq(organizationMembership.organizationId, organizationId),
          eq(organizationMembership.userId, userId)
        )
      )
      .returning()

    return result[0] || null
  }

  /**
   * Remove user from organization
   */
  static async removeMembership(organizationId: string, userId: string) {
    await db
      .delete(organizationMembership)
      .where(
        and(
          eq(organizationMembership.organizationId, organizationId),
          eq(organizationMembership.userId, userId)
        )
      )
  }
}
