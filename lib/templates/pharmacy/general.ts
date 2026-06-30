import type { WorkspaceTemplate } from '../types'

export const generalPharmacyTemplate: WorkspaceTemplate = {
  id: 'pharmacy.general',
  name: 'Pharmacy',
  businessType: 'pharmacy',
  enabledFeatures: ['expiry-tracking', 'batch-tracking', 'prescription-management', 'low-stock-alerts'],
  defaultSettings: { enableExpiryTracking: true },
  starterCategories: [
    { name: 'Over-the-Counter', description: 'Non-prescription medicines' },
    { name: 'Prescription', description: 'Doctor-prescribed medicines' },
    { name: 'Supplements', description: 'Vitamins and health supplements' },
    { name: 'Medical Supplies', description: 'Equipment and consumables' },
  ],
  starterProducts: [
    { name: 'Paracetamol 500mg (Strip)', sku: 'OTC-001', sellingPrice: 50, buyingPrice: 20, stock: 200, unit: 'strip', category: 'Over-the-Counter' },
    { name: 'Ibuprofen 400mg (Strip)', sku: 'OTC-002', sellingPrice: 80, buyingPrice: 35, stock: 150, unit: 'strip', category: 'Over-the-Counter' },
    { name: 'Multivitamin Tabs (30)', sku: 'SUP-001', sellingPrice: 450, buyingPrice: 200, stock: 80, unit: 'pack', category: 'Supplements' },
    { name: 'Surgical Gloves (Box)', sku: 'MED-001', sellingPrice: 650, buyingPrice: 300, stock: 60, unit: 'box', category: 'Medical Supplies' },
  ],
  dashboardWidgets: [
    { id: 'daily-sales', type: 'stat', title: 'Daily Sales', dataSource: 'todaysSales', span: 1 },
    { id: 'low-stock-count', type: 'stat', title: 'Low Stock Items', dataSource: 'lowStockCount', span: 1 },
    { id: 'expiring-soon', type: 'stat', title: 'Expiring Soon', dataSource: 'expiringCount', span: 1 },
    { id: 'pending-prescriptions', type: 'stat', title: 'Pending Prescriptions', dataSource: 'pendingPrescriptions', span: 1 },
    { id: 'expiry-alerts', type: 'alert-list', title: 'Expiry Alerts', dataSource: 'expiryAlerts', span: 2 },
    { id: 'low-stock-medicines', type: 'alert-list', title: 'Low Stock Medicines', dataSource: 'lowStockAlerts', span: 2 },
    { id: 'pending-prescriptions-list', type: 'prescription-list', title: 'Pending Prescriptions', dataSource: 'pendingPrescriptionsList', span: 2 },
    { id: 'batch-tracking', type: 'batch-list', title: 'Batch Tracking', dataSource: 'batchList', span: 2 },
  ],
  quickActions: [
    { label: 'New Sale', href: '/dashboard/sales', icon: 'ShoppingCart', primary: true },
    { label: 'Prescriptions', href: '/dashboard/prescriptions', icon: 'FileCheck' },
    { label: 'Inventory', href: '/dashboard/inventory', icon: 'Package' },
  ],
  gettingStartedTasks: [
    { id: 'inventory', title: 'Set up inventory', description: 'Add medicines to the pre-loaded categories', action: '/dashboard/products' },
    { id: 'prescriptions', title: 'Configure prescription tracking', description: 'Set up your dispensing workflow', action: '/dashboard/settings' },
    { id: 'expiry', title: 'Enable expiry alerts', description: 'Get notified before medicines expire', action: '/dashboard/settings' },
    { id: 'staff', title: 'Invite pharmacists', description: 'Add your team to the workspace', action: '/dashboard/settings' },
  ],
}
