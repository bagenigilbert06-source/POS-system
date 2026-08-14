export interface ModuleDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  route: string;
  enabled: boolean;
}

export const MODULE_REGISTRY: Record<string, ModuleDefinition> = {
  products: {
    id: 'products',
    name: 'Products',
    description: 'Manage products, prices, and catalogues',
    icon: 'Package',
    route: '/dashboard/products',
    enabled: true,
  },
  inventory: {
    id: 'inventory',
    name: 'Inventory Management',
    description: 'Manage products and stock levels',
    icon: 'Package',
    route: '/dashboard/inventory',
    enabled: true,
  },
  sales: {
    id: 'sales',
    name: 'Sales Orders',
    description: 'Track and manage sales orders',
    icon: 'ShoppingCart',
    route: '/dashboard/sales',
    enabled: true,
  },
  pos: {
    id: 'pos',
    name: 'Point of Sale',
    description: 'Checkout and payment processing',
    icon: 'CreditCard',
    route: '/dashboard/pos',
    enabled: true,
  },
  customers: {
    id: 'customers',
    name: 'Customer Management',
    description: 'Manage customer profiles and loyalty',
    icon: 'Users',
    route: '/dashboard/customers',
    enabled: true,
  },
  analytics: {
    id: 'analytics',
    name: 'Analytics & Reports',
    description: 'Business insights and analytics',
    icon: 'BarChart3',
    route: '/dashboard/analytics',
    enabled: true,
  },
  expenses: {
    id: 'expenses',
    name: 'Expenses',
    description: 'Operating costs and cash outflows',
    icon: 'Wallet',
    route: '/dashboard/expenses',
    enabled: true,
  },
  reports: {
    id: 'reports',
    name: 'Reports',
    description: 'Operational reporting',
    icon: 'FileText',
    route: '/dashboard/reports',
    enabled: true,
  },
};

export function getModule(moduleId: string): ModuleDefinition | null {
  return MODULE_REGISTRY[moduleId] || null;
}

export function getEnabledModules(moduleIds: string[]): ModuleDefinition[] {
  return moduleIds
    .map((id) => MODULE_REGISTRY[id])
    .filter((module): module is ModuleDefinition => module !== undefined);
}
