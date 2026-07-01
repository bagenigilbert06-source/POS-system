/**
 * lib/types/workspace.ts
 *
 * WorkspaceConfig is the runtime shape of a loaded workspace.
 * WorkspaceTemplate (the configuration blueprint) lives in lib/templates/types.ts
 * and is imported here so consumers can use a single import path.
 */
import type { WorkspaceTemplate, GettingStartedTask } from '@/lib/templates/types'

export type { WorkspaceTemplate, GettingStartedTask }

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

export interface BusinessTemplate {
  id: string
  name: string
  description: string
  enabledModules: string[]
  defaultCategories: string[]
  defaultProducts: Array<{
    name: string
    sku: string
    price: number
    category: string
  }>
  gettingStartedTasks: GettingStartedTask[]
  sidebarConfig: {
    primaryNav: SidebarNavItem[]
    secondaryNav: SidebarNavItem[]
  }
}

export interface WorkspaceConfig {
  id: string
  name: string
  businessType: string
  businessCategory: string
  /**
   * Stable dot-namespaced template id, e.g. "retail.supermarket".
   * Stored on the organization row and used as the primary template key.
   */
  templateId: string
  /** Full template resolved from the registry — never null after onboarding */
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
