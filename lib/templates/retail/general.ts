import type { WorkspaceTemplate } from '../types'

/**
 * General / Other Retail — no opinionated defaults.
 * The owner builds their own store from scratch.
 * Provides one generic "General Products" category only.
 */
export const generalRetailTemplate: WorkspaceTemplate = {
  id: 'retail.general',
  name: 'Retail Store',
  businessType: 'retail',
  enabledFeatures: ['barcode-scanning', 'low-stock-alerts'],
  defaultSettings: {},
  starterCategories: [
    { name: 'General Products', description: 'All products — rename or replace this category to get started' },
  ],
  starterProducts: [],
  dashboardWidgets: [
    { id: 'today-revenue', type: 'stat', title: "Today's Revenue", dataSource: 'todaysSales', span: 1 },
    { id: 'transactions', type: 'stat', title: 'Transactions', dataSource: 'todaysTransactions', span: 1 },
    { id: 'avg-order', type: 'stat', title: 'Avg Order Value', dataSource: 'averageOrderValue', span: 1 },
    { id: 'profit', type: 'stat', title: "Today's Profit", dataSource: 'todaysProfit', span: 1 },
    { id: 'low-stock', type: 'alert-list', title: 'Low Stock Alerts', dataSource: 'lowStockAlerts', span: 2 },
    { id: 'top-products', type: 'product-table', title: 'Top Products', dataSource: 'topProducts', span: 2 },
  ],
  quickActions: [
    { label: 'New Sale', href: '/dashboard/sales', icon: 'ShoppingCart', primary: true },
    { label: 'Add Product', href: '/dashboard/products', icon: 'Package' },
    { label: 'View Inventory', href: '/dashboard/inventory', icon: 'PackageSearch' },
  ],
  gettingStartedTasks: [
    { id: 'first-product', title: 'Add your first product', description: 'Create your first product in inventory', action: '/dashboard/products' },
    { id: 'categories', title: 'Create categories', description: 'Organise your products with custom categories', action: '/dashboard/inventory' },
    { id: 'barcode', title: 'Connect a barcode scanner', description: 'Speed up checkout with barcode scanning', action: '/dashboard/settings' },
    { id: 'employees', title: 'Invite employees', description: 'Add your team to the workspace', action: '/dashboard/settings' },
  ],
}
