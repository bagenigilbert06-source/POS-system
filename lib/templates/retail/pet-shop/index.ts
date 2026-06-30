import type { WorkspaceTemplate, DashboardWidget, QuickAction, GettingStartedTask, StarterCategory, StarterProduct } from '../../types'
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

const starterCategories: StarterCategory[] = [
  { name: 'Pet Food', description: 'Dog, cat, bird, and fish food', icon: 'Bone' },
  { name: 'Pet Accessories', description: 'Collars, leashes, beds', icon: 'Heart' },
  { name: 'Grooming', description: 'Shampoos, brushes, trimmers', icon: 'Scissors' },
  { name: 'Toys', description: 'Interactive and chew toys', icon: 'Star' },
  { name: 'Health & Wellness', description: 'Vitamins, dewormers, flea treatments', icon: 'Stethoscope' },
]

const starterProducts: StarterProduct[] = [
  { name: 'Dog Food 2kg (Adult)', sku: 'FOD-001', sellingPrice: 1200, buyingPrice: 750, stock: 50, unit: 'bag', category: 'Pet Food' },
  { name: 'Cat Food 1kg', sku: 'FOD-002', sellingPrice: 900, buyingPrice: 550, stock: 40, unit: 'bag', category: 'Pet Food' },
  { name: 'Dog Collar (M)', sku: 'ACC-001', sellingPrice: 500, buyingPrice: 250, stock: 30, unit: 'piece', category: 'Pet Accessories' },
  { name: 'Pet Shampoo 250ml', sku: 'GRM-001', sellingPrice: 650, buyingPrice: 300, stock: 40, unit: 'bottle', category: 'Grooming' },
  { name: 'Chew Toy', sku: 'TOY-001', sellingPrice: 350, buyingPrice: 150, stock: 60, unit: 'piece', category: 'Toys' },
]

const gettingStartedTasks: GettingStartedTask[] = [
  { id: 'products', title: 'Add your product catalog', description: 'List your pet products and supplies', action: '/dashboard/products' },
  { id: 'categories', title: 'Review starter categories', description: 'Customize categories for your animal types', action: '/dashboard/inventory' },
  { id: 'expiry', title: 'Enable expiry tracking', description: 'Monitor food and medicine shelf life', action: '/dashboard/settings' },
  { id: 'staff', title: 'Invite your team', description: 'Add staff to your workspace', action: '/dashboard/settings' },
]

export const petShopTemplate: WorkspaceTemplate = {
  id: 'retail.pet-shop',
  version: 1,
  name: 'Pet Shop',
  businessType: 'retail',
  navigation,
  dashboardWidgets,
  quickActions,
  enabledModules: ['inventory', 'sales', 'products', 'customers', 'reports', 'analytics'],
  enabledFeatures: ['expiry-tracking', 'low-stock-alerts', 'barcode-scanning'],
  settings: RETAIL_SETTINGS,
  permissions: RETAIL_PERMISSIONS,
  reports: RETAIL_REPORTS,
  starterCategories,
  starterProducts,
  gettingStartedTasks,
}
