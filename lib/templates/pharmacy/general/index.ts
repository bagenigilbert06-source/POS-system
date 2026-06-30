import type { WorkspaceTemplate, NavigationConfig, DashboardWidget, QuickAction, GettingStartedTask } from '../../types'
import { PHARMACY_PERMISSIONS, PHARMACY_REPORTS, PHARMACY_SETTINGS } from '../../_shared/defaults'

const navigation: NavigationConfig = {
  primaryNav: [
    { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', route: '/dashboard/pharmacy' },
    { id: 'prescriptions', label: 'Prescriptions', icon: 'FileText', route: '/dashboard/prescriptions' },
    { id: 'sales', label: 'Sales', icon: 'ShoppingCart', route: '/dashboard/sales' },
    { id: 'products', label: 'Medicines', icon: 'Pill', route: '/dashboard/products' },
    { id: 'inventory', label: 'Inventory', icon: 'PackageSearch', route: '/dashboard/inventory' },
    { id: 'analytics', label: 'Analytics', icon: 'BarChart3', route: '/dashboard/analytics' },
    { id: 'reports', label: 'Reports', icon: 'FileBarChart', route: '/dashboard/reports' },
  ],
  secondaryNav: [
    { id: 'settings', label: 'Settings', icon: 'Settings', route: '/dashboard/settings' },
  ],
}

const dashboardWidgets: DashboardWidget[] = [
  { id: 'daily-revenue', type: 'stat', title: 'Daily Revenue', dataSource: 'todaysSales', span: 1 },
  { id: 'prescriptions', type: 'stat', title: 'Prescriptions Today', dataSource: 'prescriptionsToday', span: 1 },
  { id: 'low-stock', type: 'stat', title: 'Low Stock Items', dataSource: 'lowStockCount', span: 1 },
  { id: 'expiry-count', type: 'stat', title: 'Expiring Soon', dataSource: 'expiringCount', span: 1 },
  { id: 'expiry-alerts', type: 'alert-list', title: 'Expiry Alerts', dataSource: 'expiryAlerts', span: 2 },
  { id: 'top-products', type: 'product-table', title: 'Top Products', dataSource: 'topProducts', span: 2 },
]

const quickActions: QuickAction[] = [
  { id: 'new-prescription', label: 'New Prescription', href: '/dashboard/prescriptions', icon: 'FileText', primary: true },
  { id: 'new-sale', label: 'New Sale', href: '/dashboard/sales', icon: 'ShoppingCart' },
  { id: 'add-medicine', label: 'Add Medicine', href: '/dashboard/products', icon: 'Pill' },
]

const gettingStartedTasks: GettingStartedTask[] = [
  { id: 'medicines', title: 'Add your medicines', description: 'Build your pharmacy catalog', action: '/dashboard/products' },
  { id: 'expiry', title: 'Enable expiry tracking', description: 'Monitor medicine shelf life', action: '/dashboard/settings' },
  { id: 'staff', title: 'Invite pharmacists', description: 'Add your pharmacy team', action: '/dashboard/settings' },
]

export const generalPharmacyTemplate: WorkspaceTemplate = {
  id: 'pharmacy.general',
  version: 1,
  name: 'Pharmacy',
  businessType: 'pharmacy',
  navigation,
  dashboardWidgets,
  quickActions,
  enabledModules: ['prescriptions', 'inventory', 'batch-tracking', 'sales', 'products', 'customers', 'reports', 'analytics'],
  enabledFeatures: ['expiry-tracking', 'batch-tracking', 'prescription-management', 'low-stock-alerts'],
  settings: PHARMACY_SETTINGS,
  permissions: PHARMACY_PERMISSIONS,
  reports: PHARMACY_REPORTS,
  starterCategories: [],
  starterProducts: [],
  gettingStartedTasks,
}
