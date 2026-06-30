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
  sidebarConfig: SidebarConfig
}

export interface WorkspaceConfig {
  id: string
  name: string
  businessType: string
  customCategory?: string
  template: BusinessTemplate
  enabledModules: string[]
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
