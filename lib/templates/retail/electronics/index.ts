import type { WorkspaceTemplate, DashboardWidget, QuickAction, GettingStartedTask, StarterCategory, StarterProduct, WorkspaceSettings } from '../../types'
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
  { name: 'Smartphones', description: 'Mobile phones and accessories', icon: 'Smartphone' },
  { name: 'Laptops & Computers', description: 'Laptops, desktops, tablets', icon: 'Laptop' },
  { name: 'Audio & TV', description: 'Speakers, headphones, televisions', icon: 'Tv' },
  { name: 'Accessories', description: 'Cables, chargers, cases', icon: 'Cable' },
  { name: 'Home Appliances', description: 'Microwaves, blenders, irons', icon: 'Plug' },
]

const starterProducts: StarterProduct[] = [
  { name: 'USB-C Charging Cable 1m', sku: 'ACC-001', sellingPrice: 500, buyingPrice: 200, stock: 100, unit: 'piece', category: 'Accessories' },
  { name: 'Bluetooth Earbuds', sku: 'AUD-001', sellingPrice: 3500, buyingPrice: 1800, stock: 30, unit: 'pair', category: 'Audio & TV' },
  { name: 'Phone Screen Protector', sku: 'ACC-002', sellingPrice: 300, buyingPrice: 100, stock: 80, unit: 'piece', category: 'Accessories' },
  { name: 'Laptop Sleeve 15"', sku: 'LAP-001', sellingPrice: 1200, buyingPrice: 600, stock: 25, unit: 'piece', category: 'Laptops & Computers' },
  { name: 'Power Bank 10000mAh', sku: 'ACC-003', sellingPrice: 2500, buyingPrice: 1200, stock: 40, unit: 'piece', category: 'Accessories' },
]

const settings: WorkspaceSettings = {
  ...RETAIL_SETTINGS,
  inventory: { ...RETAIL_SETTINGS.inventory, enableSerialNumbers: true },
}

const gettingStartedTasks: GettingStartedTask[] = [
  { id: 'products', title: 'Add your product catalog', description: 'List your electronics with prices', action: '/dashboard/products' },
  { id: 'serials', title: 'Enable serial number tracking', description: 'Track individual device serial numbers', action: '/dashboard/settings' },
  { id: 'warranty', title: 'Configure warranty settings', description: 'Set default warranty periods', action: '/dashboard/settings' },
  { id: 'staff', title: 'Invite your team', description: 'Add sales staff to your workspace', action: '/dashboard/settings' },
]

export const electronicsTemplate: WorkspaceTemplate = {
  id: 'retail.electronics',
  version: 1,
  name: 'Electronics Store',
  businessType: 'retail',
  navigation,
  dashboardWidgets,
  quickActions,
  enabledModules: ['inventory', 'sales', 'products', 'customers', 'reports', 'analytics'],
  enabledFeatures: ['barcode-scanning', 'serial-numbers', 'warranty-tracking', 'low-stock-alerts'],
  settings,
  permissions: RETAIL_PERMISSIONS,
  reports: RETAIL_REPORTS,
  starterCategories,
  starterProducts,
  gettingStartedTasks,
}
