import type { WorkspaceTemplate, NavigationConfig, DashboardWidget, QuickAction, GettingStartedTask, StarterCategory, StarterProduct, WorkspaceSettings } from '../../types'
import { PHARMACY_PERMISSIONS, PHARMACY_REPORTS, PHARMACY_SETTINGS } from '../../_shared/defaults'

const navigation: NavigationConfig = {
  primaryNav: [
    { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', route: '/dashboard/pharmacy' },
    { id: 'prescriptions', label: 'Prescriptions', icon: 'FileText', route: '/dashboard/prescriptions' },
    { id: 'dispensing', label: 'Dispensing', icon: 'Pill', route: '/dashboard/sales' },
    { id: 'products', label: 'Medicines', icon: 'Package', route: '/dashboard/products' },
    { id: 'inventory', label: 'Inventory', icon: 'PackageSearch', route: '/dashboard/inventory' },
    { id: 'analytics', label: 'Analytics', icon: 'BarChart3', route: '/dashboard/analytics' },
    { id: 'reports', label: 'Reports', icon: 'FileBarChart', route: '/dashboard/reports' },
  ],
  secondaryNav: [
    { id: 'settings', label: 'Settings', icon: 'Settings', route: '/dashboard/settings' },
  ],
}

const dashboardWidgets: DashboardWidget[] = [
  { id: 'prescriptions', type: 'stat', title: 'Prescriptions Today', dataSource: 'prescriptionsToday', span: 1 },
  { id: 'dispensed', type: 'stat', title: 'Items Dispensed', dataSource: 'itemsDispensed', span: 1 },
  { id: 'low-stock', type: 'stat', title: 'Low Stock Items', dataSource: 'lowStockCount', span: 1 },
  { id: 'expiry-count', type: 'stat', title: 'Expiring ≤30 Days', dataSource: 'expiringCount', span: 1 },
  { id: 'prescriptions-list', type: 'prescription-list', title: 'Prescription Queue', dataSource: 'recentPrescriptions', span: 2 },
  { id: 'batch-list', type: 'batch-list', title: 'Batch Alerts', dataSource: 'batchAlerts', span: 2 },
]

const quickActions: QuickAction[] = [
  { id: 'new-prescription', label: 'New Prescription', href: '/dashboard/prescriptions', icon: 'FileText', primary: true },
  { id: 'add-medicine', label: 'Add Medicine', href: '/dashboard/products', icon: 'Pill' },
  { id: 'batch-report', label: 'Batch Report', href: '/dashboard/reports/batches', icon: 'Package' },
  { id: 'expiry-report', label: 'Expiry Report', href: '/dashboard/reports/expiry', icon: 'AlertTriangle' },
]

const starterCategories: StarterCategory[] = [
  { name: 'Inpatient Medicines', description: 'Medicines for ward patients', icon: 'BedDouble' },
  { name: 'Outpatient Medicines', description: 'Medicines for clinic patients', icon: 'Users' },
  { name: 'IV & Infusions', description: 'Intravenous fluids and infusions', icon: 'Droplets' },
  { name: 'Emergency Drugs', description: 'Critical and emergency medicines', icon: 'AlertTriangle' },
  { name: 'Medical Supplies', description: 'Consumables and disposables', icon: 'Stethoscope' },
]

const starterProducts: StarterProduct[] = [
  { name: 'Normal Saline 500ml', sku: 'IV-001', sellingPrice: 350, buyingPrice: 150, stock: 200, unit: 'bag', category: 'IV & Infusions' },
  { name: 'Paracetamol IV 1g', sku: 'INP-001', sellingPrice: 450, buyingPrice: 200, stock: 100, unit: 'vial', category: 'Inpatient Medicines' },
  { name: 'Amoxicillin 500mg (Cap)', sku: 'OUT-001', sellingPrice: 30, buyingPrice: 12, stock: 1000, unit: 'capsule', category: 'Outpatient Medicines' },
  { name: 'Adrenaline 1mg/ml', sku: 'EMG-001', sellingPrice: 800, buyingPrice: 400, stock: 50, unit: 'ampoule', category: 'Emergency Drugs' },
  { name: 'Surgical Mask (Box)', sku: 'SUP-001', sellingPrice: 900, buyingPrice: 500, stock: 100, unit: 'box', category: 'Medical Supplies' },
]

const settings: WorkspaceSettings = {
  ...PHARMACY_SETTINGS,
  inventory: {
    ...PHARMACY_SETTINGS.inventory,
    lowStockThreshold: 50,
    enableBatchTracking: true,
    enableExpiryTracking: true,
  },
  notifications: {
    ...PHARMACY_SETTINGS.notifications,
    expiryAlertDays: 90,
    lowStockAlerts: true,
  },
}

const gettingStartedTasks: GettingStartedTask[] = [
  { id: 'medicines', title: 'Add your medicine catalog', description: 'Import your formulary list', action: '/dashboard/products' },
  { id: 'batches', title: 'Enable batch tracking', description: 'Set up batch numbers for full traceability', action: '/dashboard/settings' },
  { id: 'wards', title: 'Configure ward distribution', description: 'Set up dispensing locations', action: '/dashboard/settings' },
  { id: 'staff', title: 'Invite pharmacy staff', description: 'Add pharmacists and technicians', action: '/dashboard/settings' },
]

export const hospitalPharmacyTemplate: WorkspaceTemplate = {
  id: 'pharmacy.hospital',
  version: 1,
  name: 'Hospital Pharmacy',
  businessType: 'pharmacy',
  navigation,
  dashboardWidgets,
  quickActions,
  enabledModules: ['prescriptions', 'inventory', 'batch-tracking', 'sales', 'products', 'reports', 'analytics'],
  enabledFeatures: ['batch-tracking', 'expiry-tracking', 'ward-distribution', 'prescription-management', 'low-stock-alerts'],
  settings,
  permissions: PHARMACY_PERMISSIONS,
  reports: PHARMACY_REPORTS,
  starterCategories,
  starterProducts,
  gettingStartedTasks,
}
