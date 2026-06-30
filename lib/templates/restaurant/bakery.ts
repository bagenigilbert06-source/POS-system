import type { WorkspaceTemplate } from '../types'

export const bakeryTemplate: WorkspaceTemplate = {
  id: 'restaurant.bakery',
  name: 'Bakery',
  businessType: 'restaurant',
  enabledFeatures: ['expiry-tracking', 'batch-production', 'quick-checkout'],
  defaultSettings: { enableBatchTracking: true, enableExpiryTracking: true },
  starterCategories: [
    { name: 'Breads', description: 'White, brown, wholegrain, artisan loaves' },
    { name: 'Cakes & Pastries', description: 'Celebration cakes, cupcakes, croissants' },
    { name: 'Biscuits & Cookies', description: 'Shortbread, chocolate chip, digestives' },
    { name: 'Beverages', description: 'Coffee, tea, hot chocolate, juices' },
    { name: 'Specialty Items', description: 'Custom orders, seasonal specials' },
  ],
  starterProducts: [
    { name: 'White Bread Loaf', sku: 'BRD-001', sellingPrice: 100, buyingPrice: 50, stock: 60, unit: 'loaf', category: 'Breads' },
    { name: 'Croissant', sku: 'PAS-001', sellingPrice: 150, buyingPrice: 60, stock: 40, unit: 'pcs', category: 'Cakes & Pastries' },
    { name: 'Chocolate Muffin', sku: 'PAS-002', sellingPrice: 120, buyingPrice: 45, stock: 30, unit: 'pcs', category: 'Cakes & Pastries' },
    { name: 'Shortbread Cookies (6pk)', sku: 'BSC-001', sellingPrice: 250, buyingPrice: 90, stock: 50, unit: 'pack', category: 'Biscuits & Cookies' },
    { name: 'Cappuccino', sku: 'BEV-001', sellingPrice: 250, buyingPrice: 70, stock: 100, unit: 'cup', category: 'Beverages' },
  ],
  dashboardWidgets: [
    { id: 'today-revenue', type: 'stat', title: "Today's Revenue", dataSource: 'todaysSales', span: 1 },
    { id: 'transactions', type: 'stat', title: 'Orders Today', dataSource: 'todaysTransactions', span: 1 },
    { id: 'avg-order', type: 'stat', title: 'Avg Order Value', dataSource: 'averageOrderValue', span: 1 },
    { id: 'profit', type: 'stat', title: "Today's Profit", dataSource: 'todaysProfit', span: 1 },
    { id: 'low-stock', type: 'alert-list', title: 'Low Stock Alerts', dataSource: 'lowStockAlerts', span: 2 },
    { id: 'top-products', type: 'product-table', title: 'Top Items', dataSource: 'topProducts', span: 2 },
  ],
  quickActions: [
    { label: 'New Sale', href: '/dashboard/sales', icon: 'ShoppingCart', primary: true },
    { label: 'Add Item', href: '/dashboard/products', icon: 'Package' },
    { label: 'View Inventory', href: '/dashboard/inventory', icon: 'PackageSearch' },
  ],
  gettingStartedTasks: [
    { id: 'menu', title: 'Add your baked goods', description: 'Create products in the pre-loaded categories', action: '/dashboard/products' },
    { id: 'expiry', title: 'Enable expiry tracking', description: 'Track freshness dates on baked items', action: '/dashboard/settings' },
    { id: 'production', title: 'Set up batch production', description: 'Log daily baking batches', action: '/dashboard/settings' },
    { id: 'staff', title: 'Invite staff', description: 'Add bakers and serving staff', action: '/dashboard/settings' },
  ],
}
