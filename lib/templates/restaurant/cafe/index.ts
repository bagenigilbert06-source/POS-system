import type { WorkspaceTemplate, NavigationConfig, DashboardWidget, QuickAction, GettingStartedTask, StarterCategory, StarterProduct } from '../../types'
import { RESTAURANT_PERMISSIONS, RESTAURANT_REPORTS, RESTAURANT_SETTINGS } from '../../_shared/defaults'

export const navigation: NavigationConfig = {
  primaryNav: [
    { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', route: '/dashboard/restaurant' },
    { id: 'orders', label: 'Orders', icon: 'ClipboardList', route: '/dashboard/orders' },
    { id: 'tables', label: 'Tables', icon: 'Coffee', route: '/dashboard/tables' },
    { id: 'menu', label: 'Menu', icon: 'BookOpen', route: '/dashboard/products' },
    { id: 'customers', label: 'Customers', icon: 'Users', route: '/dashboard/customers' },
    { id: 'analytics', label: 'Analytics', icon: 'BarChart3', route: '/dashboard/analytics' },
    { id: 'reports', label: 'Reports', icon: 'FileBarChart', route: '/dashboard/reports' },
  ],
  secondaryNav: [
    { id: 'settings', label: 'Settings', icon: 'Settings', route: '/dashboard/settings' },
  ],
}

const dashboardWidgets: DashboardWidget[] = [
  { id: 'active-tables', type: 'stat', title: 'Active Tables', dataSource: 'activeTableCount', span: 1 },
  { id: 'pending-orders', type: 'stat', title: 'Pending Orders', dataSource: 'pendingOrderCount', span: 1 },
  { id: 'daily-revenue', type: 'stat', title: 'Daily Revenue', dataSource: 'todaysSales', span: 1 },
  { id: 'avg-order', type: 'stat', title: 'Avg Order Value', dataSource: 'averageOrderValue', span: 1 },
  { id: 'order-queue', type: 'order-queue', title: 'Order Queue', dataSource: 'kitchenQueue', span: 2 },
  { id: 'table-status', type: 'table-grid', title: 'Table Status', dataSource: 'tableStatus', span: 2 },
]

const quickActions: QuickAction[] = [
  { id: 'new-order', label: 'New Order', href: '/dashboard/orders', icon: 'ClipboardList', primary: true },
  { id: 'tables', label: 'View Tables', href: '/dashboard/tables', icon: 'Coffee' },
  { id: 'menu', label: 'Update Menu', href: '/dashboard/products', icon: 'BookOpen' },
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
  { id: 'tables', title: 'Set up your seating', description: 'Configure your café seating layout', action: '/dashboard/tables' },
  { id: 'staff', title: 'Invite baristas and staff', description: 'Add your team to the workspace', action: '/dashboard/settings' },
  { id: 'wifi', title: 'Add Wi-Fi details to receipt', description: 'Update the receipt footer with Wi-Fi info', action: '/dashboard/settings' },
]

export const cafeTemplate: WorkspaceTemplate = {
  id: 'restaurant.cafe',
  version: 1,
  name: 'Café',
  businessType: 'restaurant',
  navigation,
  dashboardWidgets,
  quickActions,
  enabledModules: ['tables', 'orders', 'inventory', 'sales', 'customers', 'reports', 'analytics'],
  enabledFeatures: ['table-management', 'quick-service', 'loyalty-points'],
  settings: RESTAURANT_SETTINGS,
  permissions: RESTAURANT_PERMISSIONS,
  reports: RESTAURANT_REPORTS,
  starterCategories,
  starterProducts,
  gettingStartedTasks,
}
