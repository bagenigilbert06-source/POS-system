import type { WorkspaceTemplate } from '../types'

export const cafeTemplate: WorkspaceTemplate = {
  id: 'restaurant.cafe',
  name: 'Café',
  businessType: 'restaurant',
  enabledFeatures: ['table-management', 'quick-service', 'loyalty-points'],
  defaultSettings: { enableLoyalty: true },
  starterCategories: [
    { name: 'Coffee', description: 'Espresso, cappuccino, latte, Americano' },
    { name: 'Tea & Infusions', description: 'Black tea, herbal teas, chai' },
    { name: 'Pastries', description: 'Croissants, muffins, cookies, scones' },
    { name: 'Light Meals', description: 'Sandwiches, wraps, salads' },
    { name: 'Cold Drinks', description: 'Fresh juices, smoothies, iced drinks' },
  ],
  starterProducts: [
    { name: 'Espresso', sku: 'COF-001', sellingPrice: 150, buyingPrice: 40, stock: 200, unit: 'cup', category: 'Coffee' },
    { name: 'Cappuccino', sku: 'COF-002', sellingPrice: 250, buyingPrice: 70, stock: 200, unit: 'cup', category: 'Coffee' },
    { name: 'Masala Chai', sku: 'TEA-001', sellingPrice: 180, buyingPrice: 50, stock: 200, unit: 'cup', category: 'Tea & Infusions' },
    { name: 'Croissant', sku: 'PAS-001', sellingPrice: 200, buyingPrice: 80, stock: 50, unit: 'pcs', category: 'Pastries' },
    { name: 'Club Sandwich', sku: 'LGT-001', sellingPrice: 500, buyingPrice: 200, stock: 50, unit: 'pcs', category: 'Light Meals' },
  ],
  dashboardWidgets: [
    { id: 'active-tables', type: 'stat', title: 'Active Tables', dataSource: 'activeTableCount', span: 1 },
    { id: 'pending-orders', type: 'stat', title: 'Pending Orders', dataSource: 'pendingOrderCount', span: 1 },
    { id: 'daily-revenue', type: 'stat', title: 'Daily Revenue', dataSource: 'todaysSales', span: 1 },
    { id: 'avg-order', type: 'stat', title: 'Avg Order Value', dataSource: 'averageOrderValue', span: 1 },
    { id: 'kitchen-queue', type: 'order-queue', title: 'Order Queue', dataSource: 'kitchenQueue', span: 2 },
    { id: 'table-status', type: 'table-grid', title: 'Table Status', dataSource: 'tableStatus', span: 2 },
  ],
  quickActions: [
    { label: 'New Order', href: '/dashboard/orders', icon: 'ClipboardList', primary: true },
    { label: 'Order Queue', href: '/dashboard/kitchen', icon: 'ChefHat' },
    { label: 'Manage Tables', href: '/dashboard/tables', icon: 'UtensilsCrossed' },
  ],
  gettingStartedTasks: [
    { id: 'menu', title: 'Build your menu', description: 'Add drinks and food to the pre-loaded categories', action: '/dashboard/products' },
    { id: 'tables', title: 'Set up seating', description: 'Configure your café floor plan', action: '/dashboard/tables' },
    { id: 'staff', title: 'Invite staff', description: 'Add baristas and servers', action: '/dashboard/settings' },
    { id: 'loyalty', title: 'Enable loyalty programme', description: 'Reward your regular customers', action: '/dashboard/settings' },
  ],
}
