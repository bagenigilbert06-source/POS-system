import { eq } from 'drizzle-orm';
import { cache } from 'react';
import { db } from '@/lib/db';
import { workspace } from '@/lib/db/schema';
import {
  getWorkspaceTemplate,
  resolveOnboardingTemplateId,
} from '@/lib/templates';
import type { SidebarNavItem, WorkspaceConfig } from '@/lib/types/workspace';
import { OrganizationService } from '@/lib/services/organization-service';
import { getBusinessExperience } from '@/lib/workspace/business-experience';
import { isPharmacyBusiness } from '@/lib/pharmacy/rules';
import { getProductTerminology } from '@/lib/products/terminology';

const workspaceConfigForUser = cache(
  async (
    organizationId: string,
    userId: string
  ): Promise<WorkspaceConfig | null> => {
    const org = await OrganizationService.getOrganization(
      organizationId,
      userId
    );
    if (!org) return null;
    return loadWorkspaceConfig(org);
  }
);

type StoredWorkspaceConfig = {
  templateId?: string;
  enabledModules?: string[];
  enabledFeatures?: string[];
  businessFamily?: string;
  businessCategory?: string;
};

type AuthorizedOrganization = {
  id: string;
  name: string;
  businessType: string;
  businessCategory: string | null;
};

async function loadWorkspaceConfig(
  organization: AuthorizedOrganization
): Promise<WorkspaceConfig> {
  const [stored] = await db
    .select({ config: workspace.config })
    .from(workspace)
    .where(eq(workspace.organizationId, organization.id))
    .limit(1);
  return runtimeConfig({
    organizationId: organization.id,
    name: organization.name,
    businessType: organization.businessType,
    businessCategory: organization.businessCategory ?? 'custom',
    stored: (stored?.config ?? {}) as StoredWorkspaceConfig,
  });
}

const MODULE_NAV: Record<string, SidebarNavItem> = {
  pos: {
    id: 'pos',
    label: 'Point of sale',
    icon: 'ShoppingCart',
    route: '/dashboard/pos',
  },
  sales: {
    id: 'sales',
    label: 'Sales',
    icon: 'ReceiptText',
    route: '/dashboard/sales',
  },
  prescriptions: {
    id: 'prescriptions',
    label: 'Prescription records',
    icon: 'FileText',
    route: '/dashboard/pharmacy/prescriptions',
  },
  products: {
    id: 'products',
    label: 'Products',
    icon: 'Package',
    route: '/dashboard/products',
  },
  categories: {
    id: 'categories',
    label: 'Categories',
    icon: 'Tags',
    route: '/dashboard/products/categories',
  },
  attendance: {
    id: 'attendance',
    label: 'Attendance',
    icon: 'Watch',
    route: '/dashboard/attendance',
  },
  inventory: {
    id: 'inventory',
    label: 'Inventory',
    icon: 'Boxes',
    route: '/dashboard/inventory',
  },
  batches: {
    id: 'batches',
    label: 'Batches & expiry',
    icon: 'Calendar',
    route: '/dashboard/inventory/batches',
  },
  purchases: {
    id: 'purchases',
    label: 'Stock Intake',
    icon: 'PackagePlus',
    route: '/dashboard/stock-intake',
  },
  customers: {
    id: 'customers',
    label: 'Customers',
    icon: 'Users',
    route: '/dashboard/customers',
  },
  expenses: {
    id: 'expenses',
    label: 'Expenses',
    icon: 'WalletCards',
    route: '/dashboard/expenses',
  },
  operations: {
    id: 'operations',
    label: 'Operations',
    icon: 'ClipboardCheck',
    route: '/dashboard/operations',
  },
  reports: {
    id: 'reports',
    label: 'Reports',
    icon: 'ChartNoAxesCombined',
    route: '/dashboard/reports',
  },
  analytics: {
    id: 'analytics',
    label: 'Analytics',
    icon: 'BarChart3',
    route: '/dashboard/analytics',
  },
  'sales-analytics': {
    id: 'sales-analytics',
    label: 'Sales Analytics',
    icon: 'TrendingUp',
    route: '/dashboard/sales-analytics',
  },
  'expense-analytics': {
    id: 'expense-analytics',
    label: 'Expense Analytics',
    icon: 'CreditCard',
    route: '/dashboard/expense-analytics',
  },
  'customer-analytics': {
    id: 'customer-analytics',
    label: 'Customer Analytics',
    icon: 'Users',
    route: '/dashboard/customer-analytics',
  },
  'inventory-analytics': {
    id: 'inventory-analytics',
    label: 'Inventory Analytics',
    icon: 'Package',
    route: '/dashboard/inventory-analytics',
  },
  'financial-insights': {
    id: 'financial-insights',
    label: 'Financial Insights',
    icon: 'TrendingUp',
    route: '/dashboard/financial-insights',
  },
  'staff-performance': {
    id: 'staff-performance',
    label: 'Staff Performance',
    icon: 'Users',
    route: '/dashboard/staff-performance',
  },
};

function navigationFor(
  enabledModules: string[],
  businessFamily: string,
  businessCategory: string
) {
  const experience = getBusinessExperience(businessFamily, businessCategory);
  const productTerms = getProductTerminology(businessFamily, businessCategory);
  const labels: Record<string, string> = {
    pos: experience.navigation.pos,
    sales: experience.navigation.sales,
    products: experience.navigation.products,
    inventory: experience.navigation.inventory,
    customers: experience.navigation.customers,
  };
  return {
    primaryNav: [
      {
        id: 'dashboard',
        label: experience.navigation.overview,
        icon: 'LayoutDashboard',
        route: '/dashboard',
      },
      MODULE_NAV.attendance,
      ...enabledModules.flatMap((id) => {
        if (!MODULE_NAV[id]) return [];
        const items = [
          { ...MODULE_NAV[id], label: labels[id] ?? MODULE_NAV[id].label },
        ];
        if (id === 'sales' && isPharmacyBusiness(businessFamily, businessCategory)) return [...items, MODULE_NAV.prescriptions];
        if (id === 'products') return [
          ...items,
          { ...MODULE_NAV.categories, label: `${productTerms.singular} categories` },
        ];
        if (id === 'inventory' && isPharmacyBusiness(businessFamily, businessCategory)) return [...items, MODULE_NAV.batches];
        return items;
      }),
    ],
    secondaryNav: [
      {
        id: 'settings',
        label: 'Settings',
        icon: 'Settings',
        route: '/dashboard/settings',
      },
    ],
  };
}

function runtimeConfig(input: {
  organizationId: string;
  name: string;
  businessType: string;
  businessCategory: string;
  stored?: StoredWorkspaceConfig;
}): WorkspaceConfig {
  const storedModules = input.stored?.enabledModules ?? [
    'sales',
    'expenses',
    'reports',
    'analytics',
  ];
  const pharmacyWorkspace = isPharmacyBusiness(input.stored?.businessFamily ?? input.businessType, input.stored?.businessCategory ?? input.businessCategory);
  const enabledModules = Array.from(
    new Set([
      ...storedModules,
      ...(pharmacyWorkspace ? ['pos', 'sales', 'products', 'inventory', 'customers', 'purchases'] : []),
      'expenses',
      'reports',
      'analytics',
      'operations',
      'products',
    ])
  );
  const storedTemplateId = input.stored?.templateId;
  const legacyLiquorTemplate =
    input.businessCategory === 'liquor_shop' &&
    storedTemplateId === 'retail.grocery';
  const templateId =
    storedTemplateId &&
    storedTemplateId !== 'adaptive.generic' &&
    !legacyLiquorTemplate
      ? storedTemplateId
      : resolveOnboardingTemplateId(
          input.stored?.businessFamily ?? input.businessType,
          input.stored?.businessCategory ?? input.businessCategory
        );

  // WorkspaceTemplate remains part of the legacy context contract. Runtime
  // navigation and capabilities below are derived only from persisted modules.
  const template = getWorkspaceTemplate(templateId);
  return {
    id: input.organizationId,
    name: input.name,
    businessType: input.stored?.businessFamily ?? input.businessType,
    businessCategory: input.stored?.businessCategory ?? input.businessCategory,
    templateId,
    template,
    enabledModules,
    enabledFeatures: input.stored?.enabledFeatures ?? [],
    sidebarConfig: navigationFor(
      enabledModules,
      input.stored?.businessFamily ?? input.businessType,
      input.stored?.businessCategory ?? input.businessCategory
    ),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export class WorkspaceService {
  static buildConfigFromOrg(org: {
    id: string;
    name: string | null;
    businessType: string | null;
    businessCategory: string | null;
    templateId: string | null;
  }): WorkspaceConfig {
    return runtimeConfig({
      organizationId: org.id,
      name: org.name ?? 'Pesaby workspace',
      businessType: org.businessType ?? 'other',
      businessCategory: org.businessCategory ?? 'custom',
      stored: { templateId: org.templateId ?? 'adaptive.generic' },
    });
  }

  static async getWorkspaceConfig(
    organizationId: string,
    userId: string
  ): Promise<WorkspaceConfig | null> {
    return workspaceConfigForUser(organizationId, userId);
  }

  /** Use only after the caller has established access to this organization. */
  static async getAuthorizedWorkspaceConfig(
    organization: AuthorizedOrganization
  ): Promise<WorkspaceConfig> {
    return loadWorkspaceConfig(organization);
  }

  static getDashboardRoute(): string {
    return '/dashboard';
  }

  static createWorkspaceConfig(
    organizationId: string,
    businessType: string,
    businessCategory: string,
    selectedModules?: string[]
  ): WorkspaceConfig {
    return runtimeConfig({
      organizationId,
      name: 'Pesaby workspace',
      businessType: businessType || 'other',
      businessCategory: businessCategory || 'custom',
      stored: {
        enabledModules: selectedModules ?? [
          'sales',
          'expenses',
          'reports',
          'analytics',
        ],
      },
    });
  }

  static isModuleEnabled(config: WorkspaceConfig, moduleId: string): boolean {
    return config.enabledModules.includes(moduleId);
  }

  static isFeatureEnabled(config: WorkspaceConfig, featureId: string): boolean {
    return config.enabledFeatures.includes(featureId);
  }
}
