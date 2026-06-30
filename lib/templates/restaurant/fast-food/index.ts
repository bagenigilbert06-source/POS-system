import type { WorkspaceTemplate, NavigationConfig, DashboardWidget, QuickAction, GettingStartedTask, StarterCategory, StarterProduct } from '../../types'
import { RESTAURANT_PERMISSIONS, RESTAURANT_REPORTS, RESTAURANT_SETTINGS } from '../../_shared/defaults'

const navigation: NavigationConfig = {
  primaryNav: [
    { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', route: '/dashboard/restaurant' },
    { id: 'orders', label: 'Orders', icon: 'ClipboardList', route: '/dashboard/orders' },
    { id: 'kitchen', label: 'Kitchen', icon: 'ChefHat', route: '/dashboard/kitchen' },
    { id: 'menu', label: 'Menu', icon: 'BookOpen', route: '/dashboard/products' },
    { id: 'analytics', label: 'Analytics', icon: 'BarChart3', route: '/dashboard/analytics' },
    { id: 'reports', label: 'Reports', icon: 'FileBarChart', route: '/dashboard/reports' },
  ],
  secondaryNav: [
    { id: 'settings', label: 'Settings', icon: 'Settings', route: '/dashboard/settings' },
  ],
}

const dashboardWidgets: DashboardWidget[] = [
  { id: 'pending-orders', type: 'stat', title: 'Pending Orders', dataSource: 'pendingOrderCount', span: 1 },
  { id: 'daily-revenue', type: 'stat', title: 'Daily Revenue', dataSource: 'todaysSales', span: 1 },
  { id: 'avg-order', type: 'stat', title: 'Avg Order Value', dataSource: 'averageOrderValue', span: 1 },
  { id: 'transactions', type: 'stat', title: 'Transactions', dataSource: 'todaysTransactions', span: 1 },
  { id: 'kitchen-queue', type: 'order-queue', title: 'Kitchen Queue', dataSource: 'kitchenQueue', span: 4 },
]

const quickActions: QuickAction[] = [
  { id: 'new-order', label: 'New Order', href: '/dashboard/orders', icon: 'ClipboardList', primary: true },
  { id: 'kitchen', label: 'Kitchen Display', href: '/dashboard/kitchen', icon: 'ChefHat' },
  { id: 'menu', label: 'Update Menu', href: '/dashboard/products', icon: 'BookOpen' },
]

const starterCategories: StarterCategory[] = [
  { name: 'Burgers & Sandwiches', description: 'Burgers, wraps, and sandwiches', icon: 'Sandwich' },
  { name: 'Sides', description: 'Fries, onion rings, coleslaw', icon: 'Salad' },
  { name: 'Beverages', description: 'Sodas, juices, shakes', icon: 'GlassWater' },
  { name: 'Chicken', description: 'Fried and grilled chicken', icon: 'Drumstick' },
  { name: 'Combos', description: 'Meal deals and combo sets', icon: 'Package' },
]

const starterProducts: StarterProduct[] = [
  { name: 'Beef Burger', sku: 'BRG-001', sellingPrice: 550, buyingPrice: 200, stock: 100, unit: 'piece', category: 'Burgers & Sandwiches' },
  { name: 'Chicken Wrap', sku: 'WRP-001', sellingPrice: 450, buyingPrice: 180, stock: 100, unit: 'piece', category: 'Burgers & Sandwiches' },
  { name: 'Fries (Regular)', sku: 'SID-001', sellingPrice: 200, buyingPrice: 60, stock: 200, unit: 'portion', category: 'Sides' },
  { name: 'Soda (Canned)', sku: 'BEV-001', sellingPrice: 80, buyingPrice: 45, stock: 300, unit: 'can', category: 'Beverages' },
  { name: 'Fried Chicken (2 pcs)', sku: 'CHK-001', sellingPrice: 500, buyingPrice: 200, stock: 100, unit: 'portion', category: 'Chicken' },
]

const gettingStartedTasks: GettingStartedTask[] = [
  { id: 'menu', title: 'Build your menu', description: 'Add your fast food items and combos', action: '/dashboard/products' },
  { id: 'kitchen', title: 'Set up kitchen display', description: 'Configure the kitchen order screen', action: '/dashboard/settings' },
  { id: 'combos', title: 'Create combo deals', description: 'Bundle items into meal deals', action: '/dashboard/products' },
  { id: 'staff', title: 'Invite your team', description: 'Add cashiers and kitchen staff', action: '/dashboard/settings' },
]

export const fastFoodTemplate: WorkspaceTemplate = {
  id: 'restaurant.fast-food',
  version: 1,
  name: 'Fast Food',
  businessType: 'restaurant',
  navigation,
  dashboardWidgets,
  quickActions,
  enabledModules: ['kitchen', 'orders', 'inventory', 'sales', 'reports', 'analytics'],
  enabledFeatures: ['kitchen-queue', 'quick-checkout', 'order-tracking'],
  settings: RESTAURANT_SETTINGS,
  permissions: RESTAURANT_PERMISSIONS,
  reports: RESTAURANT_REPORTS,
  starterCategories,
  starterProducts,
  gettingStartedTasks,
}
