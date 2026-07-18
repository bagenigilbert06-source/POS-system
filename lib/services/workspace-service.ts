import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { workspace } from '@/lib/db/schema'
import { getWorkspaceTemplate, resolveOnboardingTemplateId } from '@/lib/templates'
import type { SidebarNavItem, WorkspaceConfig } from '@/lib/types/workspace'
import { OrganizationService } from '@/lib/services/organization-service'
import { getBusinessExperience } from '@/lib/workspace/business-experience'

type StoredWorkspaceConfig = {
  templateId?: string
  enabledModules?: string[]
  enabledFeatures?: string[]
  businessFamily?: string
  businessCategory?: string
}

const MODULE_NAV: Record<string, SidebarNavItem> = {
  pos: { id: 'pos', label: 'Point of sale', icon: 'ShoppingCart', route: '/dashboard/pos' },
  sales: { id: 'sales', label: 'Sales', icon: 'ReceiptText', route: '/dashboard/sales' },
  products: { id: 'products', label: 'Products', icon: 'Package', route: '/dashboard/products' },
  inventory: { id: 'inventory', label: 'Inventory', icon: 'Boxes', route: '/dashboard/inventory' },
  customers: { id: 'customers', label: 'Customers', icon: 'Users', route: '/dashboard/customers' },
  reports: { id: 'reports', label: 'Reports', icon: 'ChartNoAxesCombined', route: '/dashboard/reports' },
}

function navigationFor(enabledModules: string[], businessFamily: string, businessCategory: string) {
  const experience = getBusinessExperience(businessFamily, businessCategory)
  const labels: Record<string, string> = {
    pos: experience.navigation.pos,
    sales: experience.navigation.sales,
    products: experience.navigation.products,
    inventory: experience.navigation.inventory,
    customers: experience.navigation.customers,
  }
  return {
    primaryNav: [
      { id: 'dashboard', label: experience.navigation.overview, icon: 'LayoutDashboard', route: '/dashboard' },
      ...enabledModules.map((id) => MODULE_NAV[id] ? { ...MODULE_NAV[id], label: labels[id] ?? MODULE_NAV[id].label } : undefined).filter((item): item is SidebarNavItem => Boolean(item)),
    ],
    secondaryNav: [{ id: 'settings', label: 'Settings', icon: 'Settings', route: '/dashboard/settings' }],
  }
}

function runtimeConfig(input: {
  organizationId: string
  name: string
  businessType: string
  businessCategory: string
  stored?: StoredWorkspaceConfig
}): WorkspaceConfig {
  const enabledModules = input.stored?.enabledModules ?? ['sales', 'reports']
  const storedTemplateId = input.stored?.templateId
  const templateId = storedTemplateId && storedTemplateId !== 'adaptive.generic'
    ? storedTemplateId
    : resolveOnboardingTemplateId(input.stored?.businessFamily ?? input.businessType, input.stored?.businessCategory ?? input.businessCategory)

  // WorkspaceTemplate remains part of the legacy context contract. Runtime
  // navigation and capabilities below are derived only from persisted modules.
  const template = getWorkspaceTemplate(templateId)
  return {
    id: input.organizationId,
    name: input.name,
    businessType: input.stored?.businessFamily ?? input.businessType,
    businessCategory: input.stored?.businessCategory ?? input.businessCategory,
    templateId,
    template,
    enabledModules,
    enabledFeatures: input.stored?.enabledFeatures ?? [],
    sidebarConfig: navigationFor(enabledModules, input.stored?.businessFamily ?? input.businessType, input.stored?.businessCategory ?? input.businessCategory),
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

export class WorkspaceService {
  static buildConfigFromOrg(org: {
    id: string
    name: string | null
    businessType: string | null
    businessCategory: string | null
    templateId: string | null
  }): WorkspaceConfig {
    return runtimeConfig({
      organizationId: org.id,
      name: org.name ?? 'Pesaby workspace',
      businessType: org.businessType ?? 'other',
      businessCategory: org.businessCategory ?? 'custom',
      stored: { templateId: org.templateId ?? 'adaptive.generic' },
    })
  }

  static async getWorkspaceConfig(organizationId: string, userId: string): Promise<WorkspaceConfig | null> {
    const org = await OrganizationService.getOrganization(organizationId, userId)
    if (!org) return null
    const [stored] = await db.select({ config: workspace.config }).from(workspace)
      .where(eq(workspace.organizationId, organizationId)).limit(1)
    return runtimeConfig({
      organizationId: org.id,
      name: org.name,
      businessType: org.businessType,
      businessCategory: org.businessCategory ?? 'custom',
      stored: (stored?.config ?? {}) as StoredWorkspaceConfig,
    })
  }

  static getDashboardRoute(): string {
    return '/dashboard'
  }

  static createWorkspaceConfig(
    organizationId: string,
    businessType: string,
    businessCategory: string,
    selectedModules?: string[],
  ): WorkspaceConfig {
    return runtimeConfig({
      organizationId,
      name: 'Pesaby workspace',
      businessType: businessType || 'other',
      businessCategory: businessCategory || 'custom',
      stored: { enabledModules: selectedModules ?? ['sales', 'reports'] },
    })
  }

  static isModuleEnabled(config: WorkspaceConfig, moduleId: string): boolean {
    return config.enabledModules.includes(moduleId)
  }

  static isFeatureEnabled(config: WorkspaceConfig, featureId: string): boolean {
    return config.enabledFeatures.includes(featureId)
  }
}
