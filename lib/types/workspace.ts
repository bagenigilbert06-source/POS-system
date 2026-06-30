import type { WorkspaceTemplate } from '@/lib/templates/types'

export type { WorkspaceTemplate }

export interface SidebarNavItem {
  id: string
  label: string
  icon: string
  route?: string
}

export interface SidebarConfig {
  primaryNav: SidebarNavItem[]
  secondaryNav: SidebarNavItem[]
}

export interface GettingStartedTask {
  id: string
  title: string
  description: string
  action: string
}

export interface WorkspaceConfig {
  id: string
  name: string
  businessType: string
  businessCategory: string
  /**
   * Dot-namespaced template id, e.g. "retail.supermarket".
   * Used by the dashboard to load the correct template without if/else.
   */
  templateId: string
  template: WorkspaceTemplate
  enabledModules: string[]
  enabledFeatures: string[]
  sidebarConfig: SidebarConfig
  createdAt: Date
  updatedAt: Date
}

export interface WorkspaceContextType {
  config: WorkspaceConfig | null
  isLoading: boolean
  error: string | null
  refreshConfig: () => Promise<void>
}
