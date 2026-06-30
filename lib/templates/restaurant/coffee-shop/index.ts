import type { WorkspaceTemplate, DashboardWidget, QuickAction, GettingStartedTask, StarterCategory, StarterProduct } from '../../types'
import { RESTAURANT_PERMISSIONS, RESTAURANT_REPORTS, RESTAURANT_SETTINGS } from '../../_shared/defaults'
import { navigation } from '../cafe/index'
// Re-use the café navigation — coffee shops share the same nav structure

const dashboardWidgets: DashboardWidget[] = [
  { id: 'pending-orders', type: 'stat', title: 'Pending Orders', dataSource: 'pendingOrderCount', span: 1 },
  { id: 'daily-revenue', type: 'stat', title: 'Daily Revenue', dataSource: 'todaysSales', span: 1 },
  { id: 'avg-order', type: 'stat', title: 'Avg Order Value', dataSource: 'averageOrderValue', span: 1 },
  { id: 'transactions', type: 'stat', title: 'Transactions', dataSource: 'todaysTransactions', span: 1 },
  { id: 'order-queue', type: 'order-queue', title: 'Order Queue', dataSource: 'kitchenQueue', span: 2 },
  { id: 'top-products', type: 'product-table', title: 'Top Drinks', dataSource: 'topProducts', span: 2 },
]

const quickActions: QuickAction[] = [
  { id: 'new-order', label: 'New Order', href: '/dashboard/orders', icon: 'Coffee', primary: true },
  { id: 'tables', label: 'View Tables', href: '/dashboard/tables', icon: 'UtensilsCrossed' },
  { id: 'menu', label: 'Update Menu', href: '/dashboard/products', icon: 'BookOpen' },
]

const starterCategories: StarterCategory[] = [
  { name: 'Espresso Drinks', description: 'Espresso, americano, cortado', icon: 'Coffee' },
  { name: 'Milk Drinks', description: 'Lattes, cappuccinos, flat whites', icon: 'Milk' },
  { name: 'Cold Drinks', description: 'Cold brew, iced lattes, frappes', icon: 'GlassWater' },
  { name: 'Tea', description: 'Green, black, herbal, chai', icon: 'Leaf' },
  { name: 'Food', description: 'Sandwiches, pastries, snacks', icon: 'Cookie' },
]

const starterProducts: StarterProduct[] = [
  { name: 'Espresso (Single)', sku: 'ESP-001', sellingPrice: 150, buyingPrice: 40, stock: 200, unit: 'cup', category: 'Espresso Drinks' },
  { name: 'Americano', sku: 'ESP-002', sellingPrice: 200, buyingPrice: 50, stock: 200, unit: 'cup', category: 'Espresso Drinks' },
  { name: 'Latte', sku: 'MIL-001', sellingPrice: 280, buyingPrice: 90, stock: 200, unit: 'cup', category: 'Milk Drinks' },
  { name: 'Iced Latte', sku: 'COL-001', sellingPrice: 320, buyingPrice: 100, stock: 150, unit: 'cup', category: 'Cold Drinks' },
  { name: 'Masala Chai', sku: 'TEA-001', sellingPrice: 200, buyingPrice: 60, stock: 150, unit: 'cup', category: 'Tea' },
  { name: 'Butter Croissant', sku: 'FOD-001', sellingPrice: 200, buyingPrice: 80, stock: 60, unit: 'piece', category: 'Food' },
]

const gettingStartedTasks: GettingStartedTask[] = [
  { id: 'menu', title: 'Build your drinks menu', description: 'Add your coffee drinks and food items', action: '/dashboard/products' },
  { id: 'loyalty', title: 'Enable loyalty points', description: 'Reward regular customers with a loyalty programme', action: '/dashboard/settings' },
  { id: 'wifi', title: 'Add Wi-Fi to receipt', description: 'Include your Wi-Fi password on receipts', action: '/dashboard/settings' },
  { id: 'staff', title: 'Invite baristas', description: 'Add your baristas and counter staff', action: '/dashboard/settings' },
]

export const coffeeShopTemplate: WorkspaceTemplate = {
  id: 'restaurant.coffee-shop',
  version: 1,
  name: 'Coffee Shop',
  businessType: 'restaurant',
  navigation: navigation,
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
