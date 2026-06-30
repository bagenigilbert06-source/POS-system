import { WorkspaceConfig } from '@/lib/types/workspace'
import { BUSINESS_TEMPLATES, getBusinessTemplate, getTemplateByCustomCategory } from '@/lib/config/business-templates'

export class WorkspaceService {
  /**
   * Create workspace configuration based on onboarding data
   */
  static createWorkspaceConfig(
    workspaceId: string,
    businessType: string,
    customCategory?: string
  ): WorkspaceConfig {
    // Determine which template to use
    let template = getBusinessTemplate(businessType)
    
    // If custom category provided, try to map to a specialized template
    if (customCategory && !template) {
      template = getTemplateByCustomCategory(customCategory)
    }

    // Fallback to retail store template
    if (!template) {
      template = BUSINESS_TEMPLATES.retail_store
    }

    const config: WorkspaceConfig = {
      id: workspaceId,
      name: template.name,
      businessType,
      customCategory,
      template,
      enabledModules: template.enabledModules,
      sidebarConfig: template.sidebarConfig,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    return config
  }

  /**
   * Get workspace configuration from database
   */
  static async getWorkspaceConfig(workspaceId: string): Promise<WorkspaceConfig | null> {
    try {
      // Fetch from the organization record
      const response = await fetch(`/api/workspace/${workspaceId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        return null
      }

      const data = await response.json()
      return data.workspaceConfig || null
    } catch (error) {
      console.error('Failed to fetch workspace config:', error)
      return null
    }
  }

  /**
   * Save workspace configuration to database
   */
  static async saveWorkspaceConfig(config: WorkspaceConfig): Promise<boolean> {
    try {
      // This would normally save to database
      // TODO: Implement database save
      console.log('[v0] Saving workspace config:', config)
      return true
    } catch (error) {
      console.error('Failed to save workspace config:', error)
      return false
    }
  }

  /**
   * Get sidebar navigation for workspace
   */
  static getSidebarNav(config: WorkspaceConfig) {
    return {
      primaryNav: config.sidebarConfig.primaryNav.map((item) => ({
        ...item,
        enabled: config.enabledModules.includes(item.id),
      })),
      secondaryNav: config.sidebarConfig.secondaryNav,
    }
  }

  /**
   * Check if module is enabled for workspace
   */
  static isModuleEnabled(config: WorkspaceConfig, moduleId: string): boolean {
    return config.enabledModules.includes(moduleId)
  }
}
