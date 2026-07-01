/**
 * OrganizationService - Simplified for existing database schema
 * 
 * This service provides organization-related operations.
 * Since we don't have dedicated org/membership tables in the actual database,
 * this is a simplified implementation that:
 * 1. Uses metadata in the User model or a simple in-memory cache
 * 2. Stores org config in ShopData
 * 3. Treats each user as owning one organization
 */

import { db } from '@/lib/db'
import { organization } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { generateId, slugify } from '@/lib/utils'

export interface WorkspaceConfig {
  enabledModules: string[]
  settings?: Record<string, any>
}

// In-memory cache for user organizations (map of userId -> org data)
// In production, this would be stored in a dedicated table
const userOrgCache = new Map<string, any>()

export class OrganizationService {
  /**
   * Create organization for a user
   * Simplified: stores org metadata in memory/metadata
   */
  static async createOrganizationForUser(
    userId: string,
    name: string,
    businessType: string = 'retail',
    businessCategory: string = 'other_retail'
  ) {
    const orgId = generateId()
    const slug = await this.generateUniqueSlug(slugify(name))

    const org = {
      id: orgId,
      name,
      slug,
      businessType,
      businessCategory,
      userId,
      currency: 'KES',
      timezone: 'Africa/Nairobi',
      onboardingCompleted: false,
      onboardingStep: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    try {
      console.debug('[createOrganizationForUser] attempting insert', { userId, orgId, slug })
      await db.insert(organization).values({
        ...org,
        taxRate: '16',
      } as any)

      const existing = await db
        .select()
        .from(organization)
        .where(eq(organization.userId, userId))
        .limit(1)

      console.debug('[createOrganizationForUser] db lookup after insert', {
        userId,
        found: !!existing[0],
        orgId: existing[0]?.id,
      })

      if (existing[0]) {
        userOrgCache.set(userId, existing[0])
        return existing[0]
      }

      const bySlug = await db
        .select()
        .from(organization)
        .where(eq(organization.slug, slug))
        .limit(1)

      if (bySlug[0]) {
        userOrgCache.set(userId, bySlug[0])
        return bySlug[0]
      }
    } catch (err) {
      console.warn('[v0] Failed to persist organization to DB, retrying lookup by user', err)

      const existing = await db
        .select()
        .from(organization)
        .where(eq(organization.userId, userId))
        .limit(1)

      if (existing[0]) {
        userOrgCache.set(userId, existing[0])
        return existing[0]
      }
    }

    // Store in cache regardless so the current request can continue
    console.debug('[createOrganizationForUser] falling back to cache', { userId, orgId })
    userOrgCache.set(userId, org)

    return org
  }

  private static async generateUniqueSlug(baseSlug: string) {
    let slug = baseSlug
    let counter = 1

    while (true) {
      try {
        const existing = await db
          .select()
          .from(organization)
          .where(eq(organization.slug, slug))
          .limit(1)

        if (!existing[0]) {
          return slug
        }

        slug = `${baseSlug}-${counter}`
        counter += 1
      } catch (err) {
        console.warn('[createOrganizationForUser] failed to verify slug uniqueness, falling back to random suffix:', err)
        return `${baseSlug}-${generateId().slice(0, 8)}`
      }
    }
  }

  /**
   * Get organization by ID
   */
  static async getOrganization(orgId: string, userId?: string) {
    // Try database first
    try {
      const result = await db
        .select()
        .from(organization)
        .where(eq(organization.id, orgId))
        .limit(1)

      const org = result[0]
      if (org && userId) {
        // Simple check: user is owner if they created it
        if (org.userId === userId) return org
        return null
      }
      return org || null
    } catch (err) {
      console.warn('[v0] Failed to query organization table:', err)
    }

    // Fallback to cache
    if (userId) {
      const cached = userOrgCache.get(userId)
      if (cached && cached.id === orgId) return cached
    }

    return null
  }

  /**
   * Get organizations for a user
   */
  static async getOrganizationsForUser(userId: string) {
    try {
      const results = await db
        .select()
        .from(organization)
        .where(eq(organization.userId, userId))

      return results
    } catch (err) {
      console.warn('[v0] Failed to query organizations:', err)
    }

    // Fallback to cache
    const cached = userOrgCache.get(userId)
    return cached ? [cached] : []
  }

  /**
   * Get primary organization for user (the one they own)
   */
  static async getPrimaryOrganization(userId: string) {
    const orgs = await this.getOrganizationsForUser(userId)
    return orgs[0] || null
  }

  /**
   * Update organization
   */
  static async updateOrganization(
    orgId: string,
    userId: string,
    updates: Record<string, any>
  ) {
    // Verify ownership
    const org = await this.getOrganization(orgId, userId)
    if (!org || org.userId !== userId) {
      throw new Error('Unauthorized: Only org owner can update')
    }

    try {
      // Try updating in database
      const result = await db
        .update(organization)
        .set({
          ...updates,
          updatedAt: new Date(),
        } as any)
        .where(eq(organization.id, orgId))
        .returning()

      return result[0]
    } catch (err) {
      console.warn('[v0] Failed to update organization in DB:', err)
      // Update cache
      const cached = userOrgCache.get(userId)
      if (cached && cached.id === orgId) {
        cached.updatedAt = new Date()
        Object.assign(cached, updates)
        return cached
      }
    }

    throw new Error('Failed to update organization')
  }

  /**
   * Save progress for an individual onboarding step.
   * Updates the org with partial step data and advances onboardingStep.
   */
  static async saveOnboardingStep(
    orgId: string,
    userId: string,
    step: number,
    stepData: Record<string, any>
  ) {
    return this.updateOrganization(orgId, userId, {
      ...stepData,
      onboardingStep: step,
    })
  }

  /**
   * Mark onboarding as completed
   */
  static async completeOnboarding(orgId: string, userId: string) {
    return this.updateOrganization(orgId, userId, {
      onboardingCompleted: true,
      onboardingStep: 0,
    })
  }

  /**
   * Check if user can access organization
   */
  static async canUserAccess(orgId: string, userId: string): Promise<boolean> {
    // Try database first — look up by orgId
    try {
      const result = await db
        .select()
        .from(organization)
        .where(eq(organization.id, orgId))
        .limit(1)

      const org = result[0]
      console.debug('[canUserAccess] db lookup by orgId', { orgId, userId, found: !!org })
      if (org && org.userId === userId) {
        // Refresh cache so subsequent requests hit the fast path
        userOrgCache.set(userId, org)
        return true
      }
    } catch (err) {
      console.warn('[v0] Failed to query organization table in canUserAccess:', err)
    }

    // Fallback: query by userId (handles cases where orgId in the request is
    // the one that was just created and cached but the cache was cleared)
    try {
      const byUser = await db
        .select()
        .from(organization)
        .where(eq(organization.userId, userId))
        .limit(1)

      const org = byUser[0]
      console.debug('[canUserAccess] db lookup by userId', { orgId, userId, found: !!org, orgIdFound: org?.id })
      if (org && org.id === orgId) {
        userOrgCache.set(userId, org)
        return true
      }
    } catch (err) {
      console.warn('[v0] Failed to query organization by userId in canUserAccess:', err)
    }

    // Final fallback to in-memory cache
    const cached = userOrgCache.get(userId)
    console.debug('[canUserAccess] cache lookup', { orgId, userId, cached: !!cached, cachedId: cached?.id })
    if (cached && cached.id === orgId && cached.userId === userId) {
      return true
    }

    return false
  }

  /**
   * Get organization with workspace config
   */
  static async getOrganizationWithWorkspace(
    orgId: string,
    userId: string
  ) {
    const org = await this.getOrganization(orgId, userId)
    if (!org) return null

    return {
      organization: org,
      workspace: null, // Workspace would be queried from DB in production
    }
  }
}
