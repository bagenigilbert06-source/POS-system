import type { WorkspaceTemplate, NavigationConfig, DashboardWidget, QuickAction, GettingStartedTask, StarterCategory, StarterProduct } from '../../types'
import { RESTAURANT_PERMISSIONS, RESTAURANT_REPORTS, RESTAURANT_SETTINGS } from '../../_shared/defaults'

const navigation: NavigationConfig = {
  primaryNav: [
    { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', route: '/dashboard/restaurant' },
    { id: 'orders', label: 'Orders', icon: 'ClipboardList', route: '/dashboard/orders' },
    { id: 'products', label: 'Products', icon: 'Package', route: '/dashboard/products' },
    { id: 'inventory', label: 'Inventory', icon: 'PackageSearch', route: '/dashboard/inventory' },
    { id: 'customers', label: 'Customers', icon: 'Users', route: '/dashboard/customers' },
    { id: 'analytics', label: 'Analytics', icon: 'BarChart3', route: '/dashboard/analytics' },
    { id: 'reports', label: 'Reports', icon: 'FileBarChart', route: '/dashboard/reports' },
  ],
  secondaryNav: [
    { id: 'settings', label: 'Settings', icon: 'Settings', route: '/dashboard/settings' },
  ],
}

const dashboardWidgets: DashboardWidget[] = [
  { id: 'daily-revenue', type: 'stat', title: 'Daily Revenue', dataSource: 'todaysSales', span: 1 },
  { id: 'transactions', type: 'stat', title: 'Transactions', dataSource: 'todaysTransactions', span: 1 },
  { id: 'avg-order', type: 'stat', title: 'Avg Order Value', dataSource: 'averageOrderValue', span: 1 },
  { id: 'profit', type: 'stat', title: "Today's Profit", dataSource: 'todaysProfit', span: 1 },
  { id: 'expiry-alerts', type: 'alert-list', title: 'Expiry Alerts', dataSource: 'expiryAlerts', span: 2 },
  { id: 'top-products', type: 'product-table', title: 'Top Products', dataSource: 'topProducts', span: 2 },
]

const quickActions: QuickAction[] = [
  { id: 'new-sale', label: 'New Sale', href: '/dashboard/sales', icon: 'ShoppingCart', primary: true },
  { id: 'add-product', label: 'Add Item', href: '/dashboard/products', icon: 'Package' },
  { id: 'inventory', label: 'Inventory', href: '/dashboard/inventory', icon: 'PackageSearch' },
]

const starterCategories: StarterCategory[] = [
  { name: 'Breads', description: 'White, brown, wholemeal loaves', icon: 'Wheat' },
  { name: 'Pastries', description: 'Croissants, danishes, puffs', icon: 'Cookie' },
  { name: 'Cakes', description: 'Birthday, wedding, and occasion cakes', icon: 'Cake' },
  { name: 'Beverages', description: 'Coffee, tea, juices', icon: 'Coffee' },
  { name: 'Custom Orders', description: 'Special order and custom cakes', icon: 'Star' },
]

const starterProducts: StarterProduct[] = [
  { name: 'White Bread Loaf', sku: 'BRD-001', sellingPrice: 65, buyingPrice: 30, stock: 80, unit: 'loaf', category: 'Breads' },
  { name: 'Croissant', sku: 'PAS-001', sellingPrice: 150, buyingPrice: 60, stock: 60, unit: 'piece', category: 'Pastries' },
  { name: 'Doughnut', sku: 'PAS-002', sellingPrice: 80, buyingPrice: 30, stock: 100, unit: 'piece', category: 'Pastries' },
  { name: 'Slice Cake (per slice)', sku: 'CAK-001', sellingPrice: 200, buyingPrice: 80, stock: 40, unit: 'slice', category: 'Cakes' },
  { name: 'Cappuccino', sku: 'BEV-001', sellingPrice: 250, buyingPrice: 80, stock: 100, unit: 'cup', category: 'Beverages' },
]

const gettingStartedTasks: GettingStartedTask[] = [
  { id: 'products', title: 'Add your baked goods', description: 'List your breads, cakes, and pastries', action: '/dashboard/products' },
  { id: 'expiry', title: 'Enable expiry tracking', description: 'Track freshness and reduce waste', action: '/dashboard/settings' },
  { id: 'custom-orders', title: 'Set up custom orders', description: 'Accept special order requests from customers', action: '/dashboard/settings' },
  { id: 'staff', title: 'Invite your team', description: 'Add bakers and counter staff', action: '/dashboard/settings' },
]

export const bakeryTemplate: WorkspaceTemplate = {
  id: 'restaurant.bakery',
  version: 1,
  name: 'Bakery',
  businessType: 'restaurant',
  navigation,
  dashboardWidgets,
  quickActions,
  enabledModules: ['orders', 'inventory', 'sales', 'products', 'customers', 'reports', 'analytics'],
  enabledFeatures: ['expiry-tracking', 'batch-production', 'custom-orders'],
  settings: { ...RESTAURANT_SETTINGS, inventory: { ...RESTAURANT_SETTINGS.inventory, enableExpiryTracking: true, enableBatchTracking: true } },
  permissions: RESTAURANT_PERMISSIONS,
  reports: RESTAURANT_REPORTS,
  starterCategories,
  starterProducts,
  gettingStartedTasks,
}
