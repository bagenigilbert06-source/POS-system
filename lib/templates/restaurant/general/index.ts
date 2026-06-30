import type { WorkspaceTemplate, NavigationConfig, DashboardWidget, QuickAction, GettingStartedTask } from '../../types'
import { RESTAURANT_PERMISSIONS, RESTAURANT_REPORTS, RESTAURANT_SETTINGS } from '../../_shared/defaults'

const navigation: NavigationConfig = {
  primaryNav: [
    { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', route: '/dashboard/restaurant' },
    { id: 'orders', label: 'Orders', icon: 'ClipboardList', route: '/dashboard/orders' },
    { id: 'kitchen', label: 'Kitchen', icon: 'ChefHat', route: '/dashboard/kitchen' },
    { id: 'tables', label: 'Tables', icon: 'UtensilsCrossed', route: '/dashboard/tables' },
    { id: 'menu', label: 'Menu', icon: 'BookOpen', route: '/dashboard/products' },
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
  { id: 'transactions', type: 'stat', title: 'Transactions', dataSource: 'todaysTransactions', span: 1 },
  { id: 'kitchen-queue', type: 'order-queue', title: 'Kitchen Queue', dataSource: 'kitchenQueue', span: 2 },
  { id: 'table-status', type: 'table-grid', title: 'Table Status', dataSource: 'tableStatus', span: 2 },
]

const quickActions: QuickAction[] = [
  { id: 'new-order', label: 'New Order', href: '/dashboard/orders', icon: 'ClipboardList', primary: true },
  { id: 'kitchen', label: 'Kitchen', href: '/dashboard/kitchen', icon: 'ChefHat' },
  { id: 'tables', label: 'Tables', href: '/dashboard/tables', icon: 'UtensilsCrossed' },
]

const gettingStartedTasks: GettingStartedTask[] = [
  { id: 'menu', title: 'Build your menu', description: 'Add your dishes and drinks', action: '/dashboard/products' },
  { id: 'tables', title: 'Set up your tables', description: 'Configure your floor plan', action: '/dashboard/tables' },
  { id: 'staff', title: 'Invite your team', description: 'Add waiters and kitchen staff', action: '/dashboard/settings' },
]

export const generalRestaurantTemplate: WorkspaceTemplate = {
  id: 'restaurant.general',
  version: 1,
  name: 'Restaurant & Café',
  businessType: 'restaurant',
  navigation,
  dashboardWidgets,
  quickActions,
  enabledModules: ['kitchen', 'tables', 'orders', 'inventory', 'sales', 'customers', 'reports', 'analytics'],
  enabledFeatures: ['table-management', 'kitchen-queue'],
  settings: RESTAURANT_SETTINGS,
  permissions: RESTAURANT_PERMISSIONS,
  reports: RESTAURANT_REPORTS,
  starterCategories: [],
  starterProducts: [],
  gettingStartedTasks,
}
