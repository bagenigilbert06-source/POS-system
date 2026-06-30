import { db } from '@/lib/db'
import { organization, organizationMembership, workspace, Workspace } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { generateId, slugify } from '@/lib/utils'
import { MembershipService } from './membership-service'

export interface WorkspaceConfig {
  enabledModules: string[]
  settings?: Record<string, any>
}

export class OrganizationService {
  /**
   * Create organization for a user with auto-generated slug
   * This creates the org, membership (as owner), and workspace in one go
   */
  static async createOrganizationForUser(
    userId: string,
    name: string,
    businessType: string = 'retail',
    businessCategory: string = 'other_retail'
  ) {
    const orgId = generateId()
    
    // Generate unique slug
    let slug = slugify(name)
    let uniqueSlug = slug
    let counter = 1
    
    // Check if slug exists and make it unique
    while (true) {
      const existing = await db
        .select()
        .from(organization)
        .where(eq(organization.slug, uniqueSlug))
        .limit(1)
      
      if (!existing.length) break
      uniqueSlug = `${slug}-${counter}`
      counter++
    }

    // Create organization
    const orgResult = await db
      .insert(organization)
      .values({
        id: orgId,
        name,
        slug: uniqueSlug,
        businessType,
        businessCategory,
        userId,
        currency: 'KES',
        timezone: 'Africa/Nairobi',
      })
      .returning()

    const org = orgResult[0]

    // Create membership (user as owner)
    await MembershipService.createMembership(orgId, userId, 'owner')

    // Create workspace with default config
    const workspaceId = generateId()
    const defaultConfig: WorkspaceConfig = {
      enabledModules: ['sales', 'inventory', 'customers'],
      settings: {
        theme: 'light',
        currency: 'KES',
      },
    }

    await db
      .insert(workspace)
      .values({
        id: workspaceId,
        organizationId: orgId,
        config: defaultConfig,
      })
      .returning()

    return org
  }

  /**
   * Get organization by ID with auth check
   */
  static async getOrganization(orgId: string, userId?: string) {
    const result = await db
      .select()
      .from(organization)
      .where(eq(organization.id, orgId))
      .limit(1)

    const org = result[0]

    // If userId provided, verify they have access
    if (org && userId) {
      const membership = await MembershipService.getMembership(orgId, userId)
      if (!membership) return null
    }

    return org || null
  }

  /**
   * Get all organizations for a user
   */
  static async getOrganizationsForUser(userId: string) {
    const memberships = await db
      .select()
      .from(organizationMembership)
      .where(eq(organizationMembership.userId, userId))

    const orgIds = memberships.map((m) => m.organizationId)

    if (orgIds.length === 0) return []

    const results = await db
      .select()
      .from(organization)
      .where(organization.id.inArray(orgIds))

    return results
  }

  /**
   * Get primary organization for user (first one they own or first membership)
   */
  static async getPrimaryOrganization(userId: string) {
    // First try to find one they own
    const ownResult = await db
      .select()
      .from(organizationMembership)
      .where(
        and(
          eq(organizationMembership.userId, userId),
          eq(organizationMembership.role, 'owner')
        )
      )
      .limit(1)

    if (ownResult.length > 0) {
      return this.getOrganization(ownResult[0].organizationId)
    }

    // Otherwise get first membership
    const result = await db
      .select()
      .from(organizationMembership)
      .where(eq(organizationMembership.userId, userId))
      .limit(1)

    if (result.length > 0) {
      return this.getOrganization(result[0].organizationId)
    }

    return null
  }

  /**
   * Update organization
   */
  static async updateOrganization(
    orgId: string,
    userId: string,
    updates: Partial<typeof organization.$inferSelect>
  ) {
    // Verify ownership
    const membership = await MembershipService.getMembership(orgId, userId)
    if (!membership || membership.role !== 'owner') {
      throw new Error('Unauthorized: Only org owner can update')
    }

    // Remove fields that shouldn't be updated
    const { id, userId: _, createdAt, ...safeUpdates } = updates as any
    safeUpdates.updatedAt = new Date()

    const result = await db
      .update(organization)
      .set(safeUpdates)
      .where(eq(organization.id, orgId))
      .returning()

    return result[0]
  }

  /**
   * Mark onboarding as completed
   */
  static async completeOnboarding(orgId: string, userId: string) {
    return this.updateOrganization(orgId, userId, {
      onboardingCompleted: true,
      onboardingStep: 0,
    } as any)
  }

  /**
   * Check if user can access organization
   */
  static async canUserAccess(orgId: string, userId: string): Promise<boolean> {
    const membership = await MembershipService.getMembership(orgId, userId)
    return !!membership
  }

  /**
   * Get organization with workspace config
   */
  static async getOrganizationWithWorkspace(
    orgId: string,
    userId: string
  ) {
    // Verify access
    const canAccess = await this.canUserAccess(orgId, userId)
    if (!canAccess) return null

    const org = await this.getOrganization(orgId, userId)
    if (!org) return null

    // Get workspace
    const workspaceResult = await db
      .select()
      .from(workspace)
      .where(eq(workspace.organizationId, orgId))
      .limit(1)

    return {
      organization: org,
      workspace: workspaceResult[0] || null,
    }
  }
}
