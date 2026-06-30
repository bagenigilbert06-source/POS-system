/**
 * lib/templates/_shared/defaults.ts
 *
 * Shared default values composed into every template.
 * Each template overrides only what differs from these baselines.
 */

import type {
  WorkspaceSettings,
  PermissionsConfig,
  ReportDefinition,
} from '../types'

// ---------------------------------------------------------------------------
// Shared workspace settings baseline
// ---------------------------------------------------------------------------

export const BASE_SETTINGS: WorkspaceSettings = {
  currency: 'KES',
  timezone: 'Africa/Nairobi',
  tax: {
    name: 'VAT',
    rate: 16,
    inclusive: false,
  },
  receipt: {
    showLogo: true,
    showBusinessName: true,
    footerMessage: 'Thank you for your business!',
    printAutomatically: false,
  },
  invoice: {
    prefix: 'INV',
    startingNumber: 1000,
    dueDays: 14,
  },
  inventory: {
    trackStock: true,
    allowNegativeStock: false,
    lowStockThreshold: 10,
    autoReorder: false,
    enableExpiryTracking: false,
    enableBatchTracking: false,
    enableBarcodeScanning: true,
    enableSerialNumbers: false,
  },
  notifications: {
    lowStockAlerts: true,
    expiryAlerts: false,
    expiryAlertDays: 30,
    dailySalesSummary: true,
  },
}

// ---------------------------------------------------------------------------
// Retail settings override
// ---------------------------------------------------------------------------

export const RETAIL_SETTINGS: WorkspaceSettings = {
  ...BASE_SETTINGS,
  inventory: {
    ...BASE_SETTINGS.inventory,
    enableBarcodeScanning: true,
    lowStockThreshold: 10,
  },
}

// ---------------------------------------------------------------------------
// Restaurant settings override
// ---------------------------------------------------------------------------

export const RESTAURANT_SETTINGS: WorkspaceSettings = {
  ...BASE_SETTINGS,
  receipt: {
    ...BASE_SETTINGS.receipt,
    footerMessage: 'Thank you for dining with us!',
  },
  inventory: {
    ...BASE_SETTINGS.inventory,
    enableBarcodeScanning: false,
    enableExpiryTracking: true,
  },
  notifications: {
    ...BASE_SETTINGS.notifications,
    expiryAlerts: true,
    expiryAlertDays: 3,
  },
}

// ---------------------------------------------------------------------------
// Pharmacy settings override
// ---------------------------------------------------------------------------

export const PHARMACY_SETTINGS: WorkspaceSettings = {
  ...BASE_SETTINGS,
  receipt: {
    ...BASE_SETTINGS.receipt,
    footerMessage: 'Get well soon!',
  },
  inventory: {
    ...BASE_SETTINGS.inventory,
    enableExpiryTracking: true,
    enableBatchTracking: true,
    lowStockThreshold: 20,
  },
  notifications: {
    ...BASE_SETTINGS.notifications,
    expiryAlerts: true,
    expiryAlertDays: 60,
  },
}

// ---------------------------------------------------------------------------
// Shared permission roles
// ---------------------------------------------------------------------------

export const RETAIL_PERMISSIONS: PermissionsConfig = {
  defaultOwnerRole: 'admin',
  defaultEmployeeRole: 'cashier',
  roles: [
    {
      role: 'admin',
      permissions: ['*'],
    },
    {
      role: 'manager',
      permissions: [
        'sales.view', 'sales.create', 'sales.void',
        'products.view', 'products.create', 'products.edit',
        'inventory.view', 'inventory.adjust',
        'customers.view', 'customers.create',
        'reports.view',
      ],
    },
    {
      role: 'cashier',
      permissions: [
        'sales.view', 'sales.create',
        'products.view',
        'inventory.view',
        'customers.view',
      ],
    },
  ],
}

export const RESTAURANT_PERMISSIONS: PermissionsConfig = {
  defaultOwnerRole: 'admin',
  defaultEmployeeRole: 'waiter',
  roles: [
    {
      role: 'admin',
      permissions: ['*'],
    },
    {
      role: 'manager',
      permissions: [
        'orders.view', 'orders.create', 'orders.void',
        'kitchen.view',
        'tables.view', 'tables.manage',
        'products.view', 'products.edit',
        'reports.view',
      ],
    },
    {
      role: 'waiter',
      permissions: [
        'orders.view', 'orders.create',
        'tables.view',
        'products.view',
      ],
    },
    {
      role: 'kitchen',
      permissions: ['kitchen.view', 'orders.view'],
    },
  ],
}

export const PHARMACY_PERMISSIONS: PermissionsConfig = {
  defaultOwnerRole: 'admin',
  defaultEmployeeRole: 'pharmacist',
  roles: [
    {
      role: 'admin',
      permissions: ['*'],
    },
    {
      role: 'pharmacist',
      permissions: [
        'prescriptions.view', 'prescriptions.create', 'prescriptions.dispense',
        'products.view', 'products.create', 'products.edit',
        'inventory.view', 'inventory.adjust',
        'sales.view', 'sales.create',
        'customers.view', 'customers.create',
        'reports.view',
      ],
    },
    {
      role: 'cashier',
      permissions: [
        'sales.view', 'sales.create',
        'products.view',
        'prescriptions.view',
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// Shared report definitions
// ---------------------------------------------------------------------------

export const RETAIL_REPORTS: ReportDefinition[] = [
  { id: 'sales-summary', title: 'Sales Summary', description: 'Daily, weekly, and monthly sales totals', route: '/dashboard/reports/sales', enabled: true },
  { id: 'inventory-valuation', title: 'Inventory Valuation', description: 'Current stock value by category', route: '/dashboard/reports/inventory', enabled: true },
  { id: 'top-products', title: 'Top Products', description: 'Best-selling products by revenue and quantity', route: '/dashboard/reports/products', enabled: true },
  { id: 'customer-activity', title: 'Customer Activity', description: 'Purchase history and loyalty points', route: '/dashboard/reports/customers', enabled: true },
  { id: 'profit-loss', title: 'Profit & Loss', description: 'Revenue vs cost of goods sold', route: '/dashboard/reports/profit-loss', enabled: true },
  { id: 'low-stock', title: 'Low Stock Report', description: 'Products below minimum stock levels', route: '/dashboard/reports/low-stock', enabled: true },
]

export const RESTAURANT_REPORTS: ReportDefinition[] = [
  { id: 'sales-summary', title: 'Sales Summary', description: 'Daily revenue and order counts', route: '/dashboard/reports/sales', enabled: true },
  { id: 'menu-performance', title: 'Menu Performance', description: 'Top-selling dishes and categories', route: '/dashboard/reports/menu', enabled: true },
  { id: 'table-occupancy', title: 'Table Occupancy', description: 'Table turnover and peak hours', route: '/dashboard/reports/tables', enabled: true },
  { id: 'staff-performance', title: 'Staff Performance', description: 'Orders per waiter and shift breakdown', route: '/dashboard/reports/staff', enabled: true },
  { id: 'waste-tracking', title: 'Waste Tracking', description: 'Food waste and spoilage logs', route: '/dashboard/reports/waste', enabled: true },
]

export const PHARMACY_REPORTS: ReportDefinition[] = [
  { id: 'sales-summary', title: 'Sales Summary', description: 'Daily and monthly dispensing totals', route: '/dashboard/reports/sales', enabled: true },
  { id: 'prescription-log', title: 'Prescription Log', description: 'All prescriptions dispensed', route: '/dashboard/reports/prescriptions', enabled: true },
  { id: 'expiry-report', title: 'Expiry Report', description: 'Medicines expiring within 60 days', route: '/dashboard/reports/expiry', enabled: true },
  { id: 'batch-tracking', title: 'Batch Tracking', description: 'Batch numbers and inventory traceability', route: '/dashboard/reports/batches', enabled: true },
  { id: 'stock-valuation', title: 'Stock Valuation', description: 'Current medicine stock value', route: '/dashboard/reports/inventory', enabled: true },
  { id: 'low-stock', title: 'Low Stock Report', description: 'Medicines below minimum stock', route: '/dashboard/reports/low-stock', enabled: true },
]
