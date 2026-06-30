import type { WorkspaceTemplate, NavigationConfig, DashboardWidget, QuickAction, GettingStartedTask, StarterCategory, StarterProduct } from '../../types'
import { PHARMACY_PERMISSIONS, PHARMACY_REPORTS, PHARMACY_SETTINGS } from '../../_shared/defaults'

const navigation: NavigationConfig = {
  primaryNav: [
    { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', route: '/dashboard/pharmacy' },
    { id: 'prescriptions', label: 'Prescriptions', icon: 'FileText', route: '/dashboard/prescriptions' },
    { id: 'sales', label: 'Sales', icon: 'ShoppingCart', route: '/dashboard/sales' },
    { id: 'products', label: 'Medicines', icon: 'Pill', route: '/dashboard/products' },
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
  { id: 'prescriptions', type: 'stat', title: 'Prescriptions Today', dataSource: 'prescriptionsToday', span: 1 },
  { id: 'low-stock', type: 'stat', title: 'Low Stock Items', dataSource: 'lowStockCount', span: 1 },
  { id: 'expiry-count', type: 'stat', title: 'Expiring Soon', dataSource: 'expiringCount', span: 1 },
  { id: 'prescriptions-list', type: 'prescription-list', title: 'Recent Prescriptions', dataSource: 'recentPrescriptions', span: 2 },
  { id: 'expiry-alerts', type: 'alert-list', title: 'Expiry Alerts', dataSource: 'expiryAlerts', span: 2 },
]

const quickActions: QuickAction[] = [
  { id: 'new-prescription', label: 'New Prescription', href: '/dashboard/prescriptions', icon: 'FileText', primary: true },
  { id: 'new-sale', label: 'New Sale', href: '/dashboard/sales', icon: 'ShoppingCart' },
  { id: 'add-medicine', label: 'Add Medicine', href: '/dashboard/products', icon: 'Pill' },
  { id: 'check-expiry', label: 'Expiry Report', href: '/dashboard/reports/expiry', icon: 'AlertTriangle' },
]

const starterCategories: StarterCategory[] = [
  { name: 'Prescription Medicines', description: 'Prescription-only drugs', icon: 'FileText' },
  { name: 'Over-the-Counter', description: 'OTC medicines and treatments', icon: 'Pill' },
  { name: 'Supplements', description: 'Vitamins, minerals, and supplements', icon: 'Leaf' },
  { name: 'Medical Supplies', description: 'Bandages, gloves, syringes', icon: 'Stethoscope' },
  { name: 'Personal Care', description: 'Skincare, hygiene, and wellness', icon: 'Sparkles' },
]

const starterProducts: StarterProduct[] = [
  { name: 'Paracetamol 500mg (Strip)', sku: 'OTC-001', sellingPrice: 50, buyingPrice: 20, stock: 500, unit: 'strip', category: 'Over-the-Counter' },
  { name: 'Ibuprofen 400mg (Strip)', sku: 'OTC-002', sellingPrice: 80, buyingPrice: 35, stock: 300, unit: 'strip', category: 'Over-the-Counter' },
  { name: 'Vitamin C 1000mg (30 tabs)', sku: 'SUP-001', sellingPrice: 450, buyingPrice: 200, stock: 100, unit: 'bottle', category: 'Supplements' },
  { name: 'Surgical Gloves (Box)', sku: 'MED-001', sellingPrice: 600, buyingPrice: 300, stock: 50, unit: 'box', category: 'Medical Supplies' },
  { name: 'Antiseptic Cream 30g', sku: 'OTC-003', sellingPrice: 250, buyingPrice: 120, stock: 150, unit: 'tube', category: 'Over-the-Counter' },
  { name: 'Multivitamin (30 tabs)', sku: 'SUP-002', sellingPrice: 750, buyingPrice: 350, stock: 80, unit: 'bottle', category: 'Supplements' },
]

const gettingStartedTasks: GettingStartedTask[] = [
  { id: 'medicines', title: 'Add your medicine catalog', description: 'Import or create your drug inventory', action: '/dashboard/products' },
  { id: 'batches', title: 'Set up batch tracking', description: 'Enable batch numbers for traceability', action: '/dashboard/settings' },
  { id: 'expiry', title: 'Configure expiry alerts', description: 'Get notified 60 days before medicines expire', action: '/dashboard/settings' },
  { id: 'staff', title: 'Invite pharmacists', description: 'Add pharmacists and dispensary staff', action: '/dashboard/settings' },
  { id: 'prescriptions', title: 'Start dispensing', description: 'Record your first prescription', action: '/dashboard/prescriptions' },
]

export const communityPharmacyTemplate: WorkspaceTemplate = {
  id: 'pharmacy.community',
  version: 1,
  name: 'Community Pharmacy',
  businessType: 'pharmacy',
  navigation,
  dashboardWidgets,
  quickActions,
  enabledModules: ['prescriptions', 'inventory', 'batch-tracking', 'sales', 'products', 'customers', 'reports', 'analytics'],
  enabledFeatures: ['prescription-management', 'expiry-tracking', 'batch-tracking', 'low-stock-alerts'],
  settings: PHARMACY_SETTINGS,
  permissions: PHARMACY_PERMISSIONS,
  reports: PHARMACY_REPORTS,
  starterCategories,
  starterProducts,
  gettingStartedTasks,
}
