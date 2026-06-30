import type { WorkspaceTemplate, DashboardWidget, QuickAction, GettingStartedTask } from '../../types'
import { RETAIL_PERMISSIONS, RETAIL_REPORTS, RETAIL_SETTINGS } from '../../_shared/defaults'
import { navigation } from '../supermarket/navigation'

const dashboardWidgets: DashboardWidget[] = [
  { id: 'today-revenue', type: 'stat', title: "Today's Revenue", dataSource: 'todaysSales', span: 1 },
  { id: 'transactions', type: 'stat', title: 'Transactions', dataSource: 'todaysTransactions', span: 1 },
  { id: 'avg-order', type: 'stat', title: 'Avg Order Value', dataSource: 'averageOrderValue', span: 1 },
  { id: 'profit', type: 'stat', title: "Today's Profit", dataSource: 'todaysProfit', span: 1 },
  { id: 'low-stock', type: 'alert-list', title: 'Low Stock Alerts', dataSource: 'lowStockAlerts', span: 2 },
  { id: 'top-products', type: 'product-table', title: 'Top Products', dataSource: 'topProducts', span: 2 },
]

const quickActions: QuickAction[] = [
  { id: 'new-sale', label: 'New Sale', href: '/dashboard/sales', icon: 'ShoppingCart', primary: true },
  { id: 'add-product', label: 'Add Product', href: '/dashboard/products', icon: 'Package' },
  { id: 'inventory', label: 'Inventory', href: '/dashboard/inventory', icon: 'PackageSearch' },
]

const gettingStartedTasks: GettingStartedTask[] = [
  { id: 'products', title: 'Add your first products', description: 'Build your product catalog', action: '/dashboard/products' },
  { id: 'categories', title: 'Create product categories', description: 'Organise your inventory by category', action: '/dashboard/inventory' },
  { id: 'staff', title: 'Invite your team', description: 'Add staff to your workspace', action: '/dashboard/settings' },
]

export const generalRetailTemplate: WorkspaceTemplate = {
  id: 'retail.general',
  version: 1,
  name: 'Retail Store',
  businessType: 'retail',
  navigation,
  dashboardWidgets,
  quickActions,
  enabledModules: ['inventory', 'sales', 'products', 'customers', 'reports', 'analytics'],
  enabledFeatures: ['barcode-scanning', 'low-stock-alerts'],
  settings: RETAIL_SETTINGS,
  permissions: RETAIL_PERMISSIONS,
  reports: RETAIL_REPORTS,
  starterCategories: [],
  starterProducts: [],
  gettingStartedTasks,
}
