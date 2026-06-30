import type { WorkspaceTemplate, DashboardWidget, QuickAction, GettingStartedTask, StarterCategory, StarterProduct, WorkspaceSettings } from '../../types'
import { RETAIL_PERMISSIONS, RETAIL_REPORTS, RETAIL_SETTINGS } from '../../_shared/defaults'
import { navigation } from '../supermarket/navigation'

const dashboardWidgets: DashboardWidget[] = [
  { id: 'today-revenue', type: 'stat', title: "Today's Revenue", dataSource: 'todaysSales', span: 1 },
  { id: 'transactions', type: 'stat', title: 'Transactions', dataSource: 'todaysTransactions', span: 1 },
  { id: 'avg-order', type: 'stat', title: 'Avg Order Value', dataSource: 'averageOrderValue', span: 1 },
  { id: 'profit', type: 'stat', title: "Today's Profit", dataSource: 'todaysProfit', span: 1 },
  { id: 'expiry-alerts', type: 'alert-list', title: 'Expiry Alerts', dataSource: 'expiryAlerts', span: 2 },
  { id: 'top-products', type: 'product-table', title: 'Top Products', dataSource: 'topProducts', span: 2 },
]

const quickActions: QuickAction[] = [
  { id: 'new-sale', label: 'New Sale', href: '/dashboard/sales', icon: 'ShoppingCart', primary: true },
  { id: 'add-product', label: 'Add Product', href: '/dashboard/products', icon: 'Package' },
  { id: 'inventory', label: 'Inventory', href: '/dashboard/inventory', icon: 'PackageSearch' },
]

const starterCategories: StarterCategory[] = [
  { name: 'Skincare', description: 'Creams, serums, sunscreen', icon: 'Sparkles' },
  { name: 'Makeup', description: 'Foundation, lipstick, mascara', icon: 'Palette' },
  { name: 'Hair Care', description: 'Shampoo, conditioner, treatments', icon: 'Wind' },
  { name: 'Fragrances', description: 'Perfumes and body sprays', icon: 'Flower' },
  { name: 'Nail Care', description: 'Nail polish, treatments, tools', icon: 'Brush' },
]

const starterProducts: StarterProduct[] = [
  { name: 'Moisturising Cream 50ml', sku: 'SKN-001', sellingPrice: 850, buyingPrice: 400, stock: 60, unit: 'tube', category: 'Skincare' },
  { name: 'Matte Lipstick', sku: 'MKP-001', sellingPrice: 650, buyingPrice: 250, stock: 80, unit: 'piece', category: 'Makeup' },
  { name: 'Shampoo 400ml', sku: 'HAI-001', sellingPrice: 700, buyingPrice: 350, stock: 50, unit: 'bottle', category: 'Hair Care' },
  { name: 'Body Spray 150ml', sku: 'FRG-001', sellingPrice: 550, buyingPrice: 200, stock: 70, unit: 'bottle', category: 'Fragrances' },
  { name: 'Nail Polish', sku: 'NAI-001', sellingPrice: 350, buyingPrice: 120, stock: 100, unit: 'bottle', category: 'Nail Care' },
]

const settings: WorkspaceSettings = {
  ...RETAIL_SETTINGS,
  inventory: { ...RETAIL_SETTINGS.inventory, enableExpiryTracking: true, lowStockThreshold: 10 },
  notifications: { ...RETAIL_SETTINGS.notifications, expiryAlerts: true, expiryAlertDays: 30 },
}

const gettingStartedTasks: GettingStartedTask[] = [
  { id: 'products', title: 'Add your product catalog', description: 'List your beauty products with descriptions', action: '/dashboard/products' },
  { id: 'expiry', title: 'Set up expiry tracking', description: 'Monitor product shelf life automatically', action: '/dashboard/settings' },
  { id: 'brands', title: 'Organise by brand', description: 'Group products by manufacturer', action: '/dashboard/products' },
  { id: 'staff', title: 'Invite your team', description: 'Add beauty consultants and cashiers', action: '/dashboard/settings' },
]

export const cosmeticsTemplate: WorkspaceTemplate = {
  id: 'retail.cosmetics',
  version: 1,
  name: 'Cosmetics Store',
  businessType: 'retail',
  navigation,
  dashboardWidgets,
  quickActions,
  enabledModules: ['inventory', 'sales', 'products', 'customers', 'reports', 'analytics'],
  enabledFeatures: ['expiry-tracking', 'loyalty-points', 'low-stock-alerts'],
  settings,
  permissions: RETAIL_PERMISSIONS,
  reports: RETAIL_REPORTS,
  starterCategories,
  starterProducts,
  gettingStartedTasks,
}
