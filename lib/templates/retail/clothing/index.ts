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
  { id: 'add-product', label: 'Add Item', href: '/dashboard/products', icon: 'Package' },
  { id: 'inventory', label: 'Inventory', href: '/dashboard/inventory', icon: 'PackageSearch' },
]

const starterCategories: StarterCategory[] = [
  { name: "Men's Wear", description: "Men's clothing and accessories", icon: 'Shirt' },
  { name: "Women's Wear", description: "Women's clothing and accessories", icon: 'ShoppingBag' },
  { name: "Kids' Wear", description: "Children's clothing", icon: 'Baby' },
  { name: 'Footwear', description: 'Shoes, sandals, boots', icon: 'Footprints' },
  { name: 'Accessories', description: 'Belts, bags, jewellery', icon: 'Watch' },
]

const starterProducts: StarterProduct[] = [
  { name: "Men's T-Shirt (M)", sku: 'MEN-001', sellingPrice: 800, buyingPrice: 400, stock: 50, unit: 'piece', category: "Men's Wear" },
  { name: "Women's Dress (M)", sku: 'WOM-001', sellingPrice: 2500, buyingPrice: 1200, stock: 30, unit: 'piece', category: "Women's Wear" },
  { name: "Kids' Shorts (6yrs)", sku: 'KID-001', sellingPrice: 600, buyingPrice: 300, stock: 40, unit: 'piece', category: "Kids' Wear" },
  { name: 'Sneakers (Size 42)', sku: 'FOO-001', sellingPrice: 3500, buyingPrice: 1800, stock: 20, unit: 'pair', category: 'Footwear' },
  { name: 'Leather Belt', sku: 'ACC-001', sellingPrice: 700, buyingPrice: 350, stock: 40, unit: 'piece', category: 'Accessories' },
]

const gettingStartedTasks: GettingStartedTask[] = [
  { id: 'products', title: 'Add your clothing catalog', description: 'List your items with sizes and colors', action: '/dashboard/products' },
  { id: 'variants', title: 'Enable product variants', description: 'Set up size and color variations', action: '/dashboard/settings' },
  { id: 'pricing', title: 'Configure pricing tiers', description: 'Set wholesale and retail prices', action: '/dashboard/products' },
  { id: 'staff', title: 'Invite your team', description: 'Add sales staff to your workspace', action: '/dashboard/settings' },
]

export const clothingTemplate: WorkspaceTemplate = {
  id: 'retail.clothing',
  version: 1,
  name: 'Clothing Store',
  businessType: 'retail',
  navigation,
  dashboardWidgets,
  quickActions,
  enabledModules: ['inventory', 'sales', 'products', 'customers', 'reports', 'analytics'],
  enabledFeatures: ['product-variants', 'size-attributes', 'color-attributes', 'low-stock-alerts'],
  settings: RETAIL_SETTINGS,
  permissions: RETAIL_PERMISSIONS,
  reports: RETAIL_REPORTS,
  starterCategories,
  starterProducts,
  gettingStartedTasks,
}
