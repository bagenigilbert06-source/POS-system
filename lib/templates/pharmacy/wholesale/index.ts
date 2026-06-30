import type { WorkspaceTemplate, NavigationConfig, DashboardWidget, QuickAction, GettingStartedTask, StarterCategory, StarterProduct, WorkspaceSettings } from '../../types'
import { PHARMACY_PERMISSIONS, PHARMACY_REPORTS, PHARMACY_SETTINGS } from '../../_shared/defaults'

const navigation: NavigationConfig = {
  primaryNav: [
    { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', route: '/dashboard/pharmacy' },
    { id: 'sales', label: 'Sales', icon: 'ShoppingCart', route: '/dashboard/sales' },
    { id: 'products', label: 'Medicines', icon: 'Package', route: '/dashboard/products' },
    { id: 'inventory', label: 'Inventory', icon: 'PackageSearch', route: '/dashboard/inventory' },
    { id: 'customers', label: 'Customers', icon: 'Users', route: '/dashboard/customers' },
    { id: 'analytics', label: 'Analytics', icon: 'BarChart3', route: '/dashboard/analytics' },
    { id: 'reports', label: 'Reports', icon: 'FileBarChart', route: '/dashboard/reports' },
  ],
  secondaryNav: [
    { id: 'settings', label: 'Settings', icon: 'Settings', route: '/dashboard/settings' },
  ],
}

const dashboardWidgets: DashboardWidget[] = [
  { id: 'daily-revenue', type: 'stat', title: 'Daily Revenue', dataSource: 'todaysSales', span: 1 },
  { id: 'transactions', type: 'stat', title: 'Transactions', dataSource: 'todaysTransactions', span: 1 },
  { id: 'low-stock', type: 'stat', title: 'Low Stock Items', dataSource: 'lowStockCount', span: 1 },
  { id: 'expiry-count', type: 'stat', title: 'Expiring ≤60 Days', dataSource: 'expiringCount', span: 1 },
  { id: 'expiry-alerts', type: 'alert-list', title: 'Expiry Alerts', dataSource: 'expiryAlerts', span: 2 },
  { id: 'batch-list', type: 'batch-list', title: 'Batch Overview', dataSource: 'batchAlerts', span: 2 },
]

const quickActions: QuickAction[] = [
  { id: 'new-sale', label: 'New Sale', href: '/dashboard/sales', icon: 'ShoppingCart', primary: true },
  { id: 'add-medicine', label: 'Add Medicine', href: '/dashboard/products', icon: 'Package' },
  { id: 'purchase-order', label: 'Purchase Order', href: '/dashboard/purchase-orders', icon: 'ClipboardList' },
  { id: 'expiry-report', label: 'Expiry Report', href: '/dashboard/reports/expiry', icon: 'AlertTriangle' },
]

const starterCategories: StarterCategory[] = [
  { name: 'Antibiotics', description: 'Broad-spectrum and specific antibiotics', icon: 'Pill' },
  { name: 'Analgesics', description: 'Pain relief medicines', icon: 'Pill' },
  { name: 'Vitamins & Supplements', description: 'Nutritional supplements', icon: 'Leaf' },
  { name: 'Cardiovascular', description: 'Heart and blood pressure medicines', icon: 'Heart' },
  { name: 'Medical Consumables', description: 'Gloves, masks, syringes', icon: 'Stethoscope' },
]

const starterProducts: StarterProduct[] = [
  { name: 'Amoxicillin 500mg (Box of 100)', sku: 'ANT-001', sellingPrice: 2500, buyingPrice: 1200, stock: 50, unit: 'box', category: 'Antibiotics' },
  { name: 'Paracetamol 500mg (Box of 100)', sku: 'ANL-001', sellingPrice: 800, buyingPrice: 350, stock: 100, unit: 'box', category: 'Analgesics' },
  { name: 'Vitamin C 1000mg (Box of 30)', sku: 'VIT-001', sellingPrice: 1200, buyingPrice: 600, stock: 80, unit: 'box', category: 'Vitamins & Supplements' },
  { name: 'Surgical Gloves L (Box)', sku: 'CON-001', sellingPrice: 700, buyingPrice: 400, stock: 200, unit: 'box', category: 'Medical Consumables' },
  { name: 'Aspirin 75mg (Box of 100)', sku: 'CAR-001', sellingPrice: 1500, buyingPrice: 700, stock: 60, unit: 'box', category: 'Cardiovascular' },
]

const settings: WorkspaceSettings = {
  ...PHARMACY_SETTINGS,
  inventory: {
    ...PHARMACY_SETTINGS.inventory,
    lowStockThreshold: 30,
    enableBatchTracking: true,
    enableExpiryTracking: true,
  },
}

const gettingStartedTasks: GettingStartedTask[] = [
  { id: 'medicines', title: 'Add your product catalog', description: 'Import your wholesale medicine list', action: '/dashboard/products' },
  { id: 'batches', title: 'Configure batch tracking', description: 'Track batch numbers from manufacturers', action: '/dashboard/settings' },
  { id: 'customers', title: 'Add your pharmacy clients', description: 'Set up accounts for retail pharmacy customers', action: '/dashboard/customers' },
  { id: 'pricing', title: 'Configure wholesale pricing', description: 'Set up customer-specific pricing tiers', action: '/dashboard/settings' },
]

export const wholesalePharmacyTemplate: WorkspaceTemplate = {
  id: 'pharmacy.wholesale',
  version: 1,
  name: 'Wholesale Pharmacy',
  businessType: 'pharmacy',
  navigation,
  dashboardWidgets,
  quickActions,
  enabledModules: ['inventory', 'batch-tracking', 'sales', 'products', 'customers', 'reports', 'analytics'],
  enabledFeatures: ['batch-tracking', 'expiry-tracking', 'wholesale-pricing', 'low-stock-alerts', 'purchase-orders'],
  settings,
  permissions: PHARMACY_PERMISSIONS,
  reports: PHARMACY_REPORTS,
  starterCategories,
  starterProducts,
  gettingStartedTasks,
}
