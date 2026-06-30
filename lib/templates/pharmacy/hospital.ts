import type { WorkspaceTemplate } from '../types'

export const hospitalPharmacyTemplate: WorkspaceTemplate = {
  id: 'pharmacy.hospital',
  name: 'Hospital Pharmacy',
  businessType: 'pharmacy',
  enabledFeatures: ['batch-tracking', 'expiry-tracking', 'prescription-management', 'ward-distribution', 'low-stock-alerts'],
  defaultSettings: { enableWardTracking: true, enableBatchTracking: true, enableExpiryTracking: true },
  starterCategories: [
    { name: 'Inpatient Medicines', description: 'Ward-dispensed drugs and IV fluids' },
    { name: 'Outpatient Medicines', description: 'Prescription and OTC for walk-in patients' },
    { name: 'Emergency Medicines', description: 'Critical, fast-acting drugs for emergencies' },
    { name: 'Medical Consumables', description: 'Needles, syringes, cannulas, dressings' },
    { name: 'Disinfectants', description: 'Hospital-grade antiseptics and cleaning agents' },
  ],
  starterProducts: [
    { name: 'Normal Saline 1L (IV)', sku: 'INP-001', sellingPrice: 450, buyingPrice: 200, stock: 100, unit: 'bag', category: 'Inpatient Medicines' },
    { name: 'Paracetamol 1g IV (Vial)', sku: 'EMG-001', sellingPrice: 350, buyingPrice: 150, stock: 80, unit: 'vial', category: 'Emergency Medicines' },
    { name: 'Amoxicillin 500mg (Cap)', sku: 'OUT-001', sellingPrice: 180, buyingPrice: 70, stock: 200, unit: 'strip', category: 'Outpatient Medicines' },
    { name: 'Disposable Syringe 5ml', sku: 'CON-001', sellingPrice: 30, buyingPrice: 12, stock: 500, unit: 'pcs', category: 'Medical Consumables' },
    { name: 'Hand Sanitiser 500ml', sku: 'DIS-001', sellingPrice: 700, buyingPrice: 350, stock: 50, unit: 'bottle', category: 'Disinfectants' },
  ],
  dashboardWidgets: [
    { id: 'daily-sales', type: 'stat', title: 'Daily Dispensing', dataSource: 'todaysSales', span: 1 },
    { id: 'low-stock-count', type: 'stat', title: 'Low Stock Items', dataSource: 'lowStockCount', span: 1 },
    { id: 'expiring-soon', type: 'stat', title: 'Expiring Soon', dataSource: 'expiringCount', span: 1 },
    { id: 'pending-prescriptions', type: 'stat', title: 'Pending Prescriptions', dataSource: 'pendingPrescriptions', span: 1 },
    { id: 'expiry-alerts', type: 'alert-list', title: 'Expiry Alerts', dataSource: 'expiryAlerts', span: 2 },
    { id: 'low-stock-medicines', type: 'alert-list', title: 'Critical Low Stock', dataSource: 'lowStockAlerts', span: 2 },
    { id: 'pending-prescriptions-list', type: 'prescription-list', title: 'Pending Prescriptions', dataSource: 'pendingPrescriptionsList', span: 2 },
    { id: 'batch-tracking', type: 'batch-list', title: 'Batch Tracking', dataSource: 'batchList', span: 2 },
  ],
  quickActions: [
    { label: 'Dispense Medicine', href: '/dashboard/sales', icon: 'Pill', primary: true },
    { label: 'Prescriptions', href: '/dashboard/prescriptions', icon: 'FileCheck' },
    { label: 'Inventory', href: '/dashboard/inventory', icon: 'Package' },
  ],
  gettingStartedTasks: [
    { id: 'inventory', title: 'Set up drug inventory', description: 'Add medicines to the pre-loaded categories', action: '/dashboard/products' },
    { id: 'batch', title: 'Enable batch tracking', description: 'Track batch numbers and expiry per batch', action: '/dashboard/settings' },
    { id: 'prescriptions', title: 'Configure prescriptions', description: 'Set up inpatient and outpatient workflows', action: '/dashboard/settings' },
    { id: 'staff', title: 'Invite pharmacists', description: 'Add your pharmacy team', action: '/dashboard/settings' },
  ],
}
