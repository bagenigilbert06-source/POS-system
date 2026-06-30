import type { WorkspaceTemplate } from '../types'

export const supermarketTemplate: WorkspaceTemplate = {
  id: 'retail.supermarket',
  name: 'Supermarket',
  businessType: 'retail',
  enabledFeatures: ['barcode-scanning', 'expiry-tracking', 'loyalty-points', 'low-stock-alerts'],
  defaultSettings: { enableExpiryTracking: true, enableLoyalty: true },
  starterCategories: [
    { name: 'Beverages', description: 'Water, juices, sodas, energy drinks' },
    { name: 'Dairy & Eggs', description: 'Milk, cheese, yoghurt, eggs' },
    { name: 'Bakery', description: 'Bread, cakes, pastries' },
    { name: 'Snacks & Confectionery', description: 'Biscuits, crisps, sweets' },
    { name: 'Cleaning Supplies', description: 'Detergents, dishwashing, mops' },
  ],
  starterProducts: [
    { name: 'Mineral Water 500ml', sku: 'BEV-001', sellingPrice: 60, buyingPrice: 30, stock: 200, unit: 'bottle', category: 'Beverages' },
    { name: 'Fresh Milk 1L', sku: 'DAI-001', sellingPrice: 130, buyingPrice: 90, stock: 80, unit: 'packet', category: 'Dairy & Eggs' },
    { name: 'White Bread Loaf', sku: 'BAK-001', sellingPrice: 65, buyingPrice: 40, stock: 60, unit: 'loaf', category: 'Bakery' },
    { name: 'Crisps 100g', sku: 'SNK-001', sellingPrice: 80, buyingPrice: 45, stock: 120, unit: 'packet', category: 'Snacks & Confectionery' },
    { name: 'Dishwashing Liquid 500ml', sku: 'CLN-001', sellingPrice: 180, buyingPrice: 100, stock: 50, unit: 'bottle', category: 'Cleaning Supplies' },
  ],
  dashboardWidgets: [
    { id: 'today-revenue', type: 'stat', title: "Today's Revenue", dataSource: 'todaysSales', span: 1 },
    { id: 'transactions', type: 'stat', title: 'Transactions', dataSource: 'todaysTransactions', span: 1 },
    { id: 'avg-order', type: 'stat', title: 'Avg Order Value', dataSource: 'averageOrderValue', span: 1 },
    { id: 'profit', type: 'stat', title: "Today's Profit", dataSource: 'todaysProfit', span: 1 },
    { id: 'low-stock', type: 'alert-list', title: 'Low Stock Alerts', dataSource: 'lowStockAlerts', span: 2 },
    { id: 'top-products', type: 'product-table', title: 'Top Products', dataSource: 'topProducts', span: 2 },
  ],
  quickActions: [
    { label: 'New Sale', href: '/dashboard/sales', icon: 'ShoppingCart', primary: true },
    { label: 'Add Product', href: '/dashboard/products', icon: 'Package' },
    { label: 'View Inventory', href: '/dashboard/inventory', icon: 'PackageSearch' },
  ],
  gettingStartedTasks: [
    { id: 'first-product', title: 'Add your first product', description: 'Create a product in your inventory', action: '/dashboard/products' },
    { id: 'categories', title: 'Review starter categories', description: 'Customize the pre-loaded product categories', action: '/dashboard/inventory' },
    { id: 'barcode', title: 'Connect a barcode scanner', description: 'Set up barcode scanning for faster checkout', action: '/dashboard/settings' },
    { id: 'employees', title: 'Invite employees', description: 'Add cashiers and managers to your workspace', action: '/dashboard/settings' },
  ],
}
