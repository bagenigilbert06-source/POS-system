import type { WorkspaceTemplate } from '../types'

export const fastFoodTemplate: WorkspaceTemplate = {
  id: 'restaurant.fast_food',
  name: 'Fast Food',
  businessType: 'restaurant',
  enabledFeatures: ['kitchen-queue', 'quick-checkout', 'order-tracking'],
  defaultSettings: { enableQuickService: true },
  starterCategories: [
    { name: 'Burgers & Wraps', description: 'Beef, chicken, veggie burgers and wraps' },
    { name: 'Sides', description: 'Fries, onion rings, coleslaw' },
    { name: 'Beverages', description: 'Sodas, juices, shakes, water' },
    { name: 'Combos', description: 'Value meal combinations' },
    { name: 'Snacks', description: 'Hotdogs, nuggets, samosas' },
  ],
  starterProducts: [
    { name: 'Beef Burger', sku: 'BRG-001', sellingPrice: 550, buyingPrice: 200, stock: 100, unit: 'pcs', category: 'Burgers & Wraps' },
    { name: 'Chicken Wrap', sku: 'WRP-001', sellingPrice: 480, buyingPrice: 180, stock: 100, unit: 'pcs', category: 'Burgers & Wraps' },
    { name: 'French Fries (Regular)', sku: 'SID-001', sellingPrice: 220, buyingPrice: 70, stock: 200, unit: 'pcs', category: 'Sides' },
    { name: 'Soda 330ml', sku: 'BEV-001', sellingPrice: 120, buyingPrice: 60, stock: 300, unit: 'can', category: 'Beverages' },
    { name: 'Chicken Nuggets (6)', sku: 'SNK-001', sellingPrice: 380, buyingPrice: 140, stock: 100, unit: 'pcs', category: 'Snacks' },
  ],
  dashboardWidgets: [
    { id: 'active-tables', type: 'stat', title: 'Active Orders', dataSource: 'pendingOrderCount', span: 1 },
    { id: 'pending-orders', type: 'stat', title: 'Orders Today', dataSource: 'todaysTransactions', span: 1 },
    { id: 'daily-revenue', type: 'stat', title: 'Daily Revenue', dataSource: 'todaysSales', span: 1 },
    { id: 'avg-order', type: 'stat', title: 'Avg Order Value', dataSource: 'averageOrderValue', span: 1 },
    { id: 'kitchen-queue', type: 'order-queue', title: 'Kitchen Queue', dataSource: 'kitchenQueue', span: 2 },
    { id: 'top-products', type: 'product-table', title: 'Top Items', dataSource: 'topProducts', span: 2 },
  ],
  quickActions: [
    { label: 'New Order', href: '/dashboard/orders', icon: 'ClipboardList', primary: true },
    { label: 'Kitchen Queue', href: '/dashboard/kitchen', icon: 'ChefHat' },
    { label: 'View Menu', href: '/dashboard/products', icon: 'UtensilsCrossed' },
  ],
  gettingStartedTasks: [
    { id: 'menu', title: 'Build your menu', description: 'Add items to the pre-loaded categories', action: '/dashboard/products' },
    { id: 'kitchen', title: 'Configure kitchen display', description: 'Set up the order-to-kitchen flow', action: '/dashboard/settings' },
    { id: 'combos', title: 'Create value combos', description: 'Bundle items into meal deals', action: '/dashboard/products' },
    { id: 'staff', title: 'Invite staff', description: 'Add cashiers and kitchen staff', action: '/dashboard/settings' },
  ],
}
