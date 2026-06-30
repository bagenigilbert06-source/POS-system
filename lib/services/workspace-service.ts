import type { WorkspaceConfig } from '@/lib/types/workspace'
import { getWorkspaceTemplate, getDashboardRoute } from '@/lib/templates'

// Business-type → enabled modules (stable; does not change per category)
const MODULES_BY_TYPE: Record<string, string[]> = {
  retail: ['inventory', 'sales', 'products', 'customers', 'reports', 'analytics'],
  restaurant: ['kitchen', 'tables', 'orders', 'inventory', 'sales', 'customers', 'reports', 'analytics'],
  pharmacy: ['prescriptions', 'inventory', 'batch-tracking', 'sales', 'products', 'customers', 'reports', 'analytics'],
}

// Business-type → sidebar navigation
const SIDEBAR_BY_TYPE: Record<string, WorkspaceConfig['sidebarConfig']> = {
  retail: {
    primaryNav: [
      { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', route: '/dashboard/retail' },
      { id: 'sales', label: 'Sales', icon: 'ShoppingCart', route: '/dashboard/sales' },
      { id: 'products', label: 'Products', icon: 'Package', route: '/dashboard/products' },
      { id: 'inventory', label: 'Inventory', icon: 'PackageSearch', route: '/dashboard/inventory' },
      { id: 'customers', label: 'Customers', icon: 'Users', route: '/dashboard/customers' },
      { id: 'analytics', label: 'Analytics', icon: 'BarChart3', route: '/dashboard/analytics' },
    ],
    secondaryNav: [
      { id: 'settings', label: 'Settings', icon: 'Settings', route: '/dashboard/settings' },
    ],
  },
  restaurant: {
    primaryNav: [
      { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', route: '/dashboard/restaurant' },
      { id: 'orders', label: 'Orders', icon: 'ClipboardList', route: '/dashboard/orders' },
      { id: 'kitchen', label: 'Kitchen', icon: 'ChefHat', route: '/dashboard/kitchen' },
      { id: 'tables', label: 'Tables', icon: 'UtensilsCrossed', route: '/dashboard/tables' },
      { id: 'products', label: 'Menu', icon: 'Package', route: '/dashboard/products' },
      { id: 'customers', label: 'Customers', icon: 'Users', route: '/dashboard/customers' },
      { id: 'analytics', label: 'Analytics', icon: 'BarChart3', route: '/dashboard/analytics' },
    ],
    secondaryNav: [
      { id: 'settings', label: 'Settings', icon: 'Settings', route: '/dashboard/settings' },
    ],
  },
  pharmacy: {
    primaryNav: [
      { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', route: '/dashboard/pharmacy' },
      { id: 'prescriptions', label: 'Prescriptions', icon: 'FileText', route: '/dashboard/prescriptions' },
      { id: 'sales', label: 'Sales', icon: 'ShoppingCart', route: '/dashboard/sales' },
      { id: 'products', label: 'Products', icon: 'Package', route: '/dashboard/products' },
      { id: 'inventory', label: 'Inventory', icon: 'PackageSearch', route: '/dashboard/inventory' },
      { id: 'customers', label: 'Customers', icon: 'Users', route: '/dashboard/customers' },
      { id: 'analytics', label: 'Analytics', icon: 'BarChart3', route: '/dashboard/analytics' },
    ],
    secondaryNav: [
      { id: 'settings', label: 'Settings', icon: 'Settings', route: '/dashboard/settings' },
    ],
  },
}

export class WorkspaceService {
  /**
   * Build a WorkspaceConfig from onboarding data.
   *
   * - businessType  determines: modules, sidebar, dashboard route
   * - businessCategory determines: template (starter data, widgets, features, quick actions)
   *
   * No if/else chains — everything is driven by the registry.
   */
  static createWorkspaceConfig(
    workspaceId: string,
    businessType: string,
    businessCategory: string
  ): WorkspaceConfig {
    const normalizedType = businessType.toLowerCase()
    const normalizedCategory = businessCategory.toLowerCase()

    const template = getWorkspaceTemplate(normalizedCategory, normalizedType)
    const modules = MODULES_BY_TYPE[normalizedType] ?? MODULES_BY_TYPE.retail
    const sidebarConfig = SIDEBAR_BY_TYPE[normalizedType] ?? SIDEBAR_BY_TYPE.retail

    return {
      id: workspaceId,
      name: template.name,
      businessType: normalizedType,
      businessCategory: normalizedCategory,
      templateId: template.id,
      template,
      enabledModules: modules,
      enabledFeatures: template.enabledFeatures,
      sidebarConfig,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }

  /**
   * The dashboard route for a given business type.
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
