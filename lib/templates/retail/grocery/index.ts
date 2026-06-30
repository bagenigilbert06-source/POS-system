import type { WorkspaceTemplate } from '../../types'
import { RETAIL_PERMISSIONS, RETAIL_REPORTS, RETAIL_SETTINGS } from '../../_shared/defaults'
import { navigation } from '../supermarket/navigation'
import type { DashboardWidget, QuickAction, GettingStartedTask, StarterCategory, StarterProduct, WorkspaceSettings } from '../../types'

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

const starterCategories: StarterCategory[] = [
  { name: 'Fresh Produce', description: 'Vegetables, fruits, herbs', icon: 'Apple' },
  { name: 'Grains & Cereals', description: 'Rice, flour, maize, wheat', icon: 'Wheat' },
  { name: 'Beverages', description: 'Water, juices, sodas', icon: 'GlassWater' },
  { name: 'Dairy & Eggs', description: 'Milk, eggs, cheese', icon: 'Milk' },
  { name: 'Household', description: 'Cleaning and home supplies', icon: 'Home' },
]

const starterProducts: StarterProduct[] = [
  { name: 'Tomatoes 1kg', sku: 'PRD-001', sellingPrice: 120, buyingPrice: 80, stock: 50, unit: 'kg', category: 'Fresh Produce' },
  { name: 'Rice 2kg', sku: 'GRN-001', sellingPrice: 250, buyingPrice: 170, stock: 100, unit: 'packet', category: 'Grains & Cereals' },
  { name: 'Mineral Water 500ml', sku: 'BEV-001', sellingPrice: 60, buyingPrice: 30, stock: 200, unit: 'bottle', category: 'Beverages' },
  { name: 'Fresh Milk 500ml', sku: 'DAI-001', sellingPrice: 65, buyingPrice: 45, stock: 80, unit: 'packet', category: 'Dairy & Eggs' },
  { name: 'Laundry Soap Bar', sku: 'HOM-001', sellingPrice: 50, buyingPrice: 25, stock: 100, unit: 'bar', category: 'Household' },
]

const settings: WorkspaceSettings = {
  ...RETAIL_SETTINGS,
  inventory: { ...RETAIL_SETTINGS.inventory, enableExpiryTracking: true, lowStockThreshold: 15 },
  notifications: { ...RETAIL_SETTINGS.notifications, expiryAlerts: true, expiryAlertDays: 7 },
}

const gettingStartedTasks: GettingStartedTask[] = [
  { id: 'products', title: 'Add your produce and stock', description: 'Build your product catalog', action: '/dashboard/products' },
  { id: 'pricing', title: 'Set buying and selling prices', description: 'Configure margins for each product', action: '/dashboard/products' },
  { id: 'expiry', title: 'Enable expiry tracking', description: 'Track perishable items automatically', action: '/dashboard/settings' },
  { id: 'staff', title: 'Invite your staff', description: 'Add cashiers to your workspace', action: '/dashboard/settings' },
]

export const groceryTemplate: WorkspaceTemplate = {
  id: 'retail.grocery',
  version: 1,
  name: 'Grocery Store',
  businessType: 'retail',
  navigation,
  dashboardWidgets,
  quickActions,
  enabledModules: ['inventory', 'sales', 'products', 'customers', 'reports', 'analytics'],
  enabledFeatures: ['barcode-scanning', 'expiry-tracking', 'low-stock-alerts'],
  settings,
  permissions: RETAIL_PERMISSIONS,
  reports: RETAIL_REPORTS,
  starterCategories,
  starterProducts,
  gettingStartedTasks,
}
