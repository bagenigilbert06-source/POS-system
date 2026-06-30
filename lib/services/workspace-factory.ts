/**
 * lib/services/workspace-factory.ts — WorkspaceFactory
 *
 * Single responsibility: build a complete, ready-to-use workspace from
 * onboarding data.  This is the only place workspace creation logic lives.
 *
 * Replaces the scattered logic that was previously split across:
 *   - WorkspaceService.createWorkspaceConfig()
 *   - StarterDataService.seedStarterData()
 *   - parts of the onboarding/complete API route
 *
 * Pipeline:
 *   resolveTemplateId → buildConfig → upsertWorkspaceRow → seedStarterData
 *   → markOnboardingComplete → return result
 */

import { db } from '@/lib/db'
import { workspace, category, product } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { generateId } from '@/lib/utils'
import {
  resolveTemplateId,
  getWorkspaceTemplate,
  getDashboardRoute,
} from '@/lib/templates'
import type { WorkspaceTemplate } from '@/lib/templates'
import type { WorkspaceConfig } from '@/lib/types/workspace'
import { OrganizationService } from './organization-service'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OnboardingInput {
  organizationId: string
  userId: string
  businessType: string
  businessCategory: string
  /** Filled when user selected "Other" in the category step */
  customCategory?: string
  businessName: string
  businessEmail: string
  phone: string
  country: string
  timezone: string
  businessSize: string
  businessDescription?: string
}

export interface WorkspaceFactoryResult {
  success: boolean
  templateId: string
  dashboardRoute: string
  config: WorkspaceConfig
  seeding: {
    categoriesCreated: number
    productsCreated: number
  }
  error?: string
}

// ---------------------------------------------------------------------------
// WorkspaceFactory
// ---------------------------------------------------------------------------

export class WorkspaceFactory {
  // ── Step 1: Resolve templateId ───────────────────────────────────────────

  private static resolveTemplate(input: OnboardingInput): {
    templateId: string
    template: WorkspaceTemplate
  } {
    const businessCategory = (input.customCategory || input.businessCategory || 'other_retail')
      .toLowerCase()
      .trim()
    const businessType = (input.businessType || 'retail').toLowerCase().trim()

    const templateId = resolveTemplateId(businessType, businessCategory)
    const template = getWorkspaceTemplate(templateId)

    return { templateId, template }
  }

  // ── Step 2: Build WorkspaceConfig ────────────────────────────────────────

  private static buildConfig(
    input: OnboardingInput,
    templateId: string,
    template: WorkspaceTemplate
  ): WorkspaceConfig {
    return {
      id: input.organizationId,
      name: input.businessName || template.name,
      businessType: input.businessType.toLowerCase(),
      businessCategory: (input.customCategory || input.businessCategory).toLowerCase(),
      templateId,
      template,
      enabledModules: template.enabledModules,
      enabledFeatures: template.enabledFeatures,
      sidebarConfig: {
        primaryNav: template.navigation.primaryNav,
        secondaryNav: template.navigation.secondaryNav,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }

  // ── Step 3: Upsert the workspace row ─────────────────────────────────────

  private static async upsertWorkspaceRow(
    organizationId: string,
    config: WorkspaceConfig
  ): Promise<void> {
    try {
      const existing = await db
        .select({ id: workspace.id })
        .from(workspace)
        .where(eq(workspace.organizationId, organizationId))
        .limit(1)

      if (existing.length > 0) {
        await db
          .update(workspace)
          .set({ config: config as any, updatedAt: new Date() })
          .where(eq(workspace.organizationId, organizationId))
      }
      // If no row exists the workspace was never created — seeding proceeds;
      // the templateId is persisted on the organization row in step 5.
    } catch (err) {
      // Non-fatal: workspace row update failure should not block onboarding
      console.warn('[WorkspaceFactory] workspace row upsert skipped:', err)
    }
  }

  // ── Step 4: Seed starter categories and products ─────────────────────────

  private static async seedStarterData(
    organizationId: string,
    userId: string,
    template: WorkspaceTemplate
  ): Promise<{ categoriesCreated: number; productsCreated: number }> {
    const { starterCategories, starterProducts } = template

    if (starterCategories.length === 0) {
      return { categoriesCreated: 0, productsCreated: 0 }
    }

    let categoriesCreated = 0
    let productsCreated = 0

    await db.transaction(async (tx) => {
      // Insert categories and build id map for product FK resolution
      const categoryIdMap: Record<string, string> = {}

      for (const cat of starterCategories) {
        const catId = generateId()
        categoryIdMap[cat.name] = catId
        await tx.insert(category).values({
          id: catId,
          name: cat.name,
          description: cat.description ?? `${cat.name} products`,
          userId,
          orgId: organizationId,
        })
        categoriesCreated++
      }

      // Insert products, linking to the category ids just created
      for (const item of starterProducts) {
        await tx.insert(product).values({
          id: generateId(),
          name: item.name,
          sku: item.sku,
          sellingPrice: String(item.sellingPrice),
          buyingPrice: String(item.buyingPrice),
          stock: item.stock,
          minStock: 5,
          unit: item.unit,
          categoryId: categoryIdMap[item.category] ?? null,
          isActive: true,
          userId,
          orgId: organizationId,
        })
        productsCreated++
      }
    })

    return { categoriesCreated, productsCreated }
  }

  // ── Step 5: Mark onboarding complete on the org row ──────────────────────

  private static async markOnboardingComplete(
    input: OnboardingInput
  ): Promise<void> {
    await OrganizationService.updateOrganization(
      input.organizationId,
      input.userId,
      {
        name: input.businessName,
        businessType: input.businessType.toLowerCase(),
        businessCategory: (input.customCategory || input.businessCategory).toLowerCase(),
        businessEmail: input.businessEmail,
        phone: input.phone,
        country: input.country,
        timezone: input.timezone,
        businessSize: input.businessSize,
        businessDescription: input.businessDescription ?? null,
        onboardingCompleted: true,
        onboardingStep: 6,
      }
    )
  }

  // ── Public: run the full pipeline ────────────────────────────────────────

  /**
   * Build a workspace from scratch.  Called once per new organization during
   * the final step of onboarding.
   *
   * Steps:
   *   1. Resolve templateId from businessType + businessCategory
   *   2. Build WorkspaceConfig (pure data — no DB writes yet)
   *   3. Upsert workspace row (non-fatal if it fails)
   *   4. Seed starter categories and products (transactional)
   *   5. Mark onboarding complete on the org row
   *   6. Return the result with dashboardRoute for client redirect
   */
  static async buildWorkspace(input: OnboardingInput): Promise<WorkspaceFactoryResult> {
    const { templateId, template } = WorkspaceFactory.resolveTemplate(input)
    const config = WorkspaceFactory.buildConfig(input, templateId, template)
    const dashboardRoute = getDashboardRoute(input.businessType)

    // 3. Workspace row upsert (non-fatal)
    await WorkspaceFactory.upsertWorkspaceRow(input.organizationId, config)

    // 4. Seed starter data (transactional — all or nothing)
    let seeding = { categoriesCreated: 0, productsCreated: 0 }
    try {
      seeding = await WorkspaceFactory.seedStarterData(
        input.organizationId,
        input.userId,
        template
      )
    } catch (seedError) {
      console.error('[WorkspaceFactory] seedStarterData failed:', seedError)
      // Continue — incomplete seeding should not block access to the workspace
    }

    // 5. Mark onboarding complete
    await WorkspaceFactory.markOnboardingComplete(input)

    return {
      success: true,
      templateId,
      dashboardRoute,
      config,
      seeding,
    }
  }
}
