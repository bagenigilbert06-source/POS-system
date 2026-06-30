/**
 * lib/services/workspace-service.ts
 *
 * Thin helper surface for reading workspace configuration at runtime
 * (e.g. in dashboard layouts and RSC pages).
 *
 * Workspace *creation* is handled entirely by WorkspaceFactory.
 * This service is read-only: it never writes to the database.
 */

import { getWorkspaceTemplate, getDashboardRoute } from '@/lib/templates'
import type { WorkspaceConfig } from '@/lib/types/workspace'

export class WorkspaceService {
  /**
   * Build a WorkspaceConfig from data already stored on the organization row.
   * Used by the dashboard layout to hydrate the WorkspaceProvider SSR.
   *
   * No database queries — config is assembled from the template registry.
   */
  static buildConfigFromOrg(org: {
    id: string
    name: string | null
    businessType: string | null
    businessCategory: string | null
    templateId: string | null
  }): WorkspaceConfig {
    const businessType = (org.businessType ?? 'retail').toLowerCase()
    const businessCategory = (org.businessCategory ?? 'other_retail').toLowerCase()

    // templateId stored on org row is the primary key — fall back to general
    const templateId = org.templateId ?? `${businessType}.general`
    const template = getWorkspaceTemplate(templateId)

    const sidebarConfig = {
      primaryNav: template.navigation.primaryNav,
      secondaryNav: template.navigation.secondaryNav,
    }

    return {
      id: org.id,
      name: org.name ?? template.name,
      businessType,
      businessCategory,
      templateId,
      template,
      enabledModules: template.enabledModules,
      enabledFeatures: template.enabledFeatures,
      sidebarConfig,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }

  /**
   * The correct dashboard route for a given business type.
   */
  static getDashboardRoute(businessType: string): string {
    return getDashboardRoute(businessType.toLowerCase())
  }

  /**
   * Check if a module is enabled for this workspace.
   */
  static isModuleEnabled(config: WorkspaceConfig, moduleId: string): boolean {
    return config.enabledModules.includes(moduleId)
  }

  /**
   * Check if a feature is enabled for this workspace.
   */
  static isFeatureEnabled(config: WorkspaceConfig, featureId: string): boolean {
    return config.enabledFeatures.includes(featureId)
  }
}
