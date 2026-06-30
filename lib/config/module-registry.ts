export interface ModuleDefinition {
  id: string
  name: string
  description: string
  icon: string
  route: string
  enabled: boolean
}

export const MODULE_REGISTRY: Record<string, ModuleDefinition> = {
  inventory: {
    id: 'inventory',
    name: 'Inventory Management',
    description: 'Manage products, stock levels, and suppliers',
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
  menu: {
    id: 'menu',
    name: 'Menu Management',
    description: 'Manage menu items and categories',
    icon: 'UtensilsCrossed',
    route: '/dashboard/menu',
    enabled: true,
  },
  orders: {
    id: 'orders',
    name: 'Order Management',
    description: 'Track restaurant orders',
    icon: 'ClipboardList',
    route: '/dashboard/orders',
    enabled: true,
  },
  tables: {
    id: 'tables',
    name: 'Table Management',
    description: 'Manage dining tables and reservations',
    icon: 'Grid',
    route: '/dashboard/tables',
    enabled: true,
  },
  kitchen: {
    id: 'kitchen',
    name: 'Kitchen Display',
    description: 'Kitchen order display system',
    icon: 'ChefHat',
    route: '/dashboard/kitchen',
    enabled: true,
  },
  prescriptions: {
    id: 'prescriptions',
    name: 'Prescription Management',
    description: 'Manage customer prescriptions',
    icon: 'FileText',
    route: '/dashboard/prescriptions',
    enabled: true,
  },
  compliance: {
    id: 'compliance',
    name: 'Compliance & Audit',
    description: 'Compliance tracking and audit logs',
    icon: 'ShieldCheck',
    route: '/dashboard/compliance',
    enabled: true,
  },
  services: {
    id: 'services',
    name: 'Services',
    description: 'Manage services offered',
    icon: 'Scissors',
    route: '/dashboard/services',
    enabled: true,
  },
  appointments: {
    id: 'appointments',
    name: 'Appointments',
    description: 'Schedule and manage appointments',
    icon: 'Calendar',
    route: '/dashboard/appointments',
    enabled: true,
  },
}

export function getModule(moduleId: string): ModuleDefinition | null {
  return MODULE_REGISTRY[moduleId] || null
}

export function getEnabledModules(moduleIds: string[]): ModuleDefinition[] {
  return moduleIds
    .map((id) => MODULE_REGISTRY[id])
    .filter((module): module is ModuleDefinition => module !== undefined)
}
