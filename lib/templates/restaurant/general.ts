import type { WorkspaceTemplate } from '../types'

export const generalRestaurantTemplate: WorkspaceTemplate = {
  id: 'restaurant.general',
  name: 'Restaurant & Café',
  businessType: 'restaurant',
  enabledFeatures: ['table-management', 'kitchen-queue'],
  defaultSettings: {},
  starterCategories: [
    { name: 'Food', description: 'All food items' },
    { name: 'Beverages', description: 'Drinks and beverages' },
  ],
  starterProducts: [],
  dashboardWidgets: [
    { id: 'active-tables', type: 'stat', title: 'Active Tables', dataSource: 'activeTableCount', span: 1 },
    { id: 'pending-orders', type: 'stat', title: 'Pending Orders', dataSource: 'pendingOrderCount', span: 1 },
    { id: 'daily-revenue', type: 'stat', title: 'Daily Revenue', dataSource: 'todaysSales', span: 1 },
    { id: 'avg-order', type: 'stat', title: 'Avg Order Value', dataSource: 'averageOrderValue', span: 1 },
    { id: 'kitchen-queue', type: 'order-queue', title: 'Kitchen Queue', dataSource: 'kitchenQueue', span: 2 },
    { id: 'table-status', type: 'table-grid', title: 'Table Status', dataSource: 'tableStatus', span: 2 },
  ],
  quickActions: [
    { label: 'New Order', href: '/dashboard/orders', icon: 'ClipboardList', primary: true },
    { label: 'Kitchen Queue', href: '/dashboard/kitchen', icon: 'ChefHat' },
    { label: 'Manage Tables', href: '/dashboard/tables', icon: 'UtensilsCrossed' },
  ],
  gettingStartedTasks: [
    { id: 'menu', title: 'Build your menu', description: 'Add your dishes and drinks', action: '/dashboard/products' },
    { id: 'tables', title: 'Set up tables', description: 'Configure your floor plan', action: '/dashboard/tables' },
    { id: 'staff', title: 'Invite staff', description: 'Add your team members', action: '/dashboard/settings' },
    { id: 'kitchen', title: 'Configure kitchen display', description: 'Set up the kitchen queue', action: '/dashboard/settings' },
  ],
}
