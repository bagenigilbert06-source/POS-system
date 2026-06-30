import type { WorkspaceTemplate } from '../types'

export const groceryTemplate: WorkspaceTemplate = {
  id: 'retail.grocery',
  name: 'Grocery Store',
  businessType: 'retail',
  enabledFeatures: ['barcode-scanning', 'expiry-tracking', 'low-stock-alerts'],
  defaultSettings: { enableExpiryTracking: true },
  starterCategories: [
    { name: 'Fresh Produce', description: 'Vegetables, fruits, herbs' },
    { name: 'Grains & Cereals', description: 'Rice, maize, wheat, oats' },
    { name: 'Beverages', description: 'Water, juice, soda, tea, coffee' },
    { name: 'Dairy', description: 'Milk, yoghurt, butter, cheese' },
    { name: 'Household', description: 'Cleaning, toiletries, kitchen items' },
  ],
  starterProducts: [
    { name: 'Tomatoes 1kg', sku: 'PRD-001', sellingPrice: 120, buyingPrice: 70, stock: 50, unit: 'kg', category: 'Fresh Produce' },
    { name: 'Rice 2kg', sku: 'GRN-001', sellingPrice: 280, buyingPrice: 180, stock: 40, unit: 'bag', category: 'Grains & Cereals' },
    { name: 'Mineral Water 500ml', sku: 'BEV-001', sellingPrice: 60, buyingPrice: 30, stock: 150, unit: 'bottle', category: 'Beverages' },
    { name: 'Fresh Milk 500ml', sku: 'DAI-001', sellingPrice: 70, buyingPrice: 45, stock: 60, unit: 'packet', category: 'Dairy' },
    { name: 'Laundry Detergent 1kg', sku: 'HOU-001', sellingPrice: 350, buyingPrice: 200, stock: 30, unit: 'pack', category: 'Household' },
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
    { id: 'expiry', title: 'Enable expiry tracking', description: 'Track best-before dates on perishables', action: '/dashboard/settings' },
    { id: 'barcode', title: 'Connect a barcode scanner', description: 'Scan products at checkout faster', action: '/dashboard/settings' },
    { id: 'employees', title: 'Invite employees', description: 'Add staff to your workspace', action: '/dashboard/settings' },
  ],
}
