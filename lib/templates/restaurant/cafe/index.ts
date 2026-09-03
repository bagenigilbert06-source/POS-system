import type { WorkspaceTemplate, NavigationConfig, DashboardWidget, QuickAction, GettingStartedTask, StarterCategory, StarterProduct } from '../../types'
import { RESTAURANT_PERMISSIONS, RESTAURANT_REPORTS, RESTAURANT_SETTINGS } from '../../_shared/defaults'

export const navigation: NavigationConfig = {
  primaryNav: [
    { id: 'dashboard', label: 'Café overview', icon: 'LayoutDashboard', route: '/dashboard' },
    { id: 'pos', label: 'Counter POS', icon: 'ShoppingCart', route: '/dashboard/pos' },
    { id: 'sales', label: 'Orders', icon: 'ReceiptText', route: '/dashboard/sales' },
    { id: 'menu', label: 'Menu', icon: 'BookOpen', route: '/dashboard/products' },
    { id: 'inventory', label: 'Ingredients', icon: 'Boxes', route: '/dashboard/inventory' },
    { id: 'stock-intake', label: 'Stock intake', icon: 'PackagePlus', route: '/dashboard/stock-intake' },
    { id: 'customers', label: 'Guests', icon: 'Users', route: '/dashboard/customers' },
    { id: 'expenses', label: 'Expenses', icon: 'WalletCards', route: '/dashboard/expenses' },
    { id: 'operations', label: 'Operations', icon: 'ClipboardCheck', route: '/dashboard/operations' },
    { id: 'analytics', label: 'Analytics', icon: 'BarChart3', route: '/dashboard/analytics' },
    { id: 'reports', label: 'Reports', icon: 'FileBarChart', route: '/dashboard/reports' },
  ],
  secondaryNav: [
    { id: 'settings', label: 'Settings', icon: 'Settings', route: '/dashboard/settings' },
  ],
}

const dashboardWidgets: DashboardWidget[] = [
  { id: 'daily-revenue', type: 'stat', title: 'Sales today', dataSource: 'todaysSales', span: 1 },
  { id: 'completed-orders', type: 'stat', title: 'Completed orders', dataSource: 'todaysTransactions', span: 1 },
  { id: 'avg-order', type: 'stat', title: 'Average order', dataSource: 'averageOrderValue', span: 1 },
  { id: 'menu-availability', type: 'stat', title: 'Menu availability', dataSource: 'stockHealth', span: 1 },
  { id: 'recent-orders', type: 'product-table', title: 'Recent orders', dataSource: 'recentSales', span: 2 },
  { id: 'ingredient-alerts', type: 'alert-list', title: 'Ingredient attention', dataSource: 'lowStockProducts', span: 2 },
]

const quickActions: QuickAction[] = [
  { id: 'new-order', label: 'New order', href: '/dashboard/pos', icon: 'ShoppingCart', primary: true },
  { id: 'menu', label: 'Manage menu', href: '/dashboard/products', icon: 'BookOpen' },
  { id: 'ingredients', label: 'Check ingredients', href: '/dashboard/inventory', icon: 'Boxes' },
]

const starterCategories: StarterCategory[] = [
  { name: 'Coffee', description: 'Espresso, lattes, cappuccinos', icon: 'Coffee' },
  { name: 'Tea', description: 'Hot and iced teas', icon: 'Leaf' },
  { name: 'Cold Beverages', description: 'Juices, smoothies, sodas', icon: 'GlassWater' },
  { name: 'Pastries & Snacks', description: 'Croissants, muffins, sandwiches', icon: 'Cookie' },
  { name: 'Meals', description: 'Full meals and salads', icon: 'UtensilsCrossed' },
]

const starterProducts: StarterProduct[] = [
  { name: 'Cappuccino', sku: 'COF-001', sellingPrice: 250, buyingPrice: 80, stock: 100, unit: 'cup', category: 'Coffee' },
  { name: 'Latte', sku: 'COF-002', sellingPrice: 280, buyingPrice: 90, stock: 100, unit: 'cup', category: 'Coffee' },
  { name: 'Masala Chai', sku: 'TEA-001', sellingPrice: 200, buyingPrice: 60, stock: 100, unit: 'cup', category: 'Tea' },
  { name: 'Fresh Orange Juice', sku: 'BEV-001', sellingPrice: 280, buyingPrice: 100, stock: 80, unit: 'glass', category: 'Cold Beverages' },
  { name: 'Croissant', sku: 'PAS-001', sellingPrice: 200, buyingPrice: 80, stock: 60, unit: 'piece', category: 'Pastries & Snacks' },
  { name: 'Club Sandwich', sku: 'MEA-001', sellingPrice: 550, buyingPrice: 220, stock: 50, unit: 'piece', category: 'Meals' },
]

const gettingStartedTasks: GettingStartedTask[] = [
  { id: 'menu', title: 'Build your menu', description: 'Add your beverages and food items', action: '/dashboard/products' },
  { id: 'stock', title: 'Record opening stock', description: 'Add ingredients, packaged drinks and ready-to-sell items', action: '/dashboard/stock-intake' },
  { id: 'pos', title: 'Open the counter', description: 'Create your first café order in the counter POS', action: '/dashboard/pos' },
  { id: 'staff', title: 'Invite baristas and staff', description: 'Add your team to the workspace', action: '/dashboard/settings' },
  { id: 'receipt', title: 'Customize café receipts', description: 'Add Wi-Fi details or a return message to the receipt footer', action: '/dashboard/settings' },
]

export const cafeTemplate: WorkspaceTemplate = {
  id: 'restaurant.cafe',
  version: 1,
  name: 'Café',
  businessType: 'restaurant',
  navigation,
  dashboardWidgets,
  quickActions,
  enabledModules: ['pos', 'sales', 'products', 'inventory', 'purchases', 'customers', 'expenses', 'operations', 'reports', 'analytics'],
  enabledFeatures: ['counter-service', 'menu-management', 'stock-control', 'customer-profiles'],
  settings: RESTAURANT_SETTINGS,
  permissions: RESTAURANT_PERMISSIONS,
  reports: RESTAURANT_REPORTS,
  starterCategories,
  starterProducts,
  gettingStartedTasks,
}
