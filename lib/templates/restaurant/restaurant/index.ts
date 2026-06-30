import type { WorkspaceTemplate, NavigationConfig, DashboardWidget, QuickAction, GettingStartedTask, StarterCategory, StarterProduct } from '../../types'
import { RESTAURANT_PERMISSIONS, RESTAURANT_REPORTS, RESTAURANT_SETTINGS } from '../../_shared/defaults'

const navigation: NavigationConfig = {
  primaryNav: [
    { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', route: '/dashboard/restaurant' },
    { id: 'orders', label: 'Orders', icon: 'ClipboardList', route: '/dashboard/orders' },
    { id: 'kitchen', label: 'Kitchen', icon: 'ChefHat', route: '/dashboard/kitchen' },
    { id: 'tables', label: 'Tables', icon: 'UtensilsCrossed', route: '/dashboard/tables' },
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
  { id: 'kitchen-queue', type: 'order-queue', title: 'Kitchen Queue', dataSource: 'kitchenQueue', span: 2 },
  { id: 'table-status', type: 'table-grid', title: 'Table Status', dataSource: 'tableStatus', span: 2 },
]

const quickActions: QuickAction[] = [
  { id: 'new-order', label: 'New Order', href: '/dashboard/orders', icon: 'ClipboardList', primary: true },
  { id: 'kitchen', label: 'Kitchen Queue', href: '/dashboard/kitchen', icon: 'ChefHat' },
  { id: 'tables', label: 'Manage Tables', href: '/dashboard/tables', icon: 'UtensilsCrossed' },
]

const starterCategories: StarterCategory[] = [
  { name: 'Appetizers', description: 'Starters and small plates', icon: 'Salad' },
  { name: 'Main Courses', description: 'Entrées and full meals', icon: 'UtensilsCrossed' },
  { name: 'Desserts', description: 'Sweet endings and pastries', icon: 'Cake' },
  { name: 'Beverages', description: 'Drinks, juices, sodas', icon: 'GlassWater' },
  { name: 'Specials', description: "Chef's specials and daily dishes", icon: 'Star' },
]

const starterProducts: StarterProduct[] = [
  { name: 'Spring Rolls (4 pcs)', sku: 'APP-001', sellingPrice: 350, buyingPrice: 120, stock: 100, unit: 'plate', category: 'Appetizers' },
  { name: 'Grilled Chicken', sku: 'MAIN-001', sellingPrice: 850, buyingPrice: 350, stock: 100, unit: 'plate', category: 'Main Courses' },
  { name: 'Beef Stew & Ugali', sku: 'MAIN-002', sellingPrice: 700, buyingPrice: 280, stock: 100, unit: 'plate', category: 'Main Courses' },
  { name: 'Chocolate Cake Slice', sku: 'DES-001', sellingPrice: 300, buyingPrice: 100, stock: 50, unit: 'slice', category: 'Desserts' },
  { name: 'Fresh Juice (Glass)', sku: 'BEV-001', sellingPrice: 180, buyingPrice: 60, stock: 100, unit: 'glass', category: 'Beverages' },
  { name: 'Mineral Water 500ml', sku: 'BEV-002', sellingPrice: 70, buyingPrice: 35, stock: 200, unit: 'bottle', category: 'Beverages' },
]

const gettingStartedTasks: GettingStartedTask[] = [
  { id: 'menu', title: 'Build your menu', description: 'Add dishes to the pre-loaded categories', action: '/dashboard/products' },
  { id: 'tables', title: 'Set up tables', description: 'Configure your restaurant floor plan', action: '/dashboard/tables' },
  { id: 'staff', title: 'Invite staff', description: 'Add waiters and kitchen staff', action: '/dashboard/settings' },
  { id: 'kitchen', title: 'Configure kitchen display', description: 'Set up the kitchen order queue', action: '/dashboard/settings' },
]

export const restaurantTemplate: WorkspaceTemplate = {
  id: 'restaurant.restaurant',
  version: 1,
  name: 'Restaurant',
  businessType: 'restaurant',
  navigation,
  dashboardWidgets,
  quickActions,
  enabledModules: ['kitchen', 'tables', 'orders', 'inventory', 'sales', 'customers', 'reports', 'analytics'],
  enabledFeatures: ['table-management', 'kitchen-queue', 'reservations', 'staff-management'],
  settings: { ...RESTAURANT_SETTINGS, receipt: { ...RESTAURANT_SETTINGS.receipt, footerMessage: 'Thank you for dining with us!' } },
  permissions: RESTAURANT_PERMISSIONS,
  reports: RESTAURANT_REPORTS,
  starterCategories,
  starterProducts,
  gettingStartedTasks,
}
