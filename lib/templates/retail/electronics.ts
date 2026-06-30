import type { WorkspaceTemplate } from '../types'

export const electronicsTemplate: WorkspaceTemplate = {
  id: 'retail.electronics',
  name: 'Electronics Store',
  businessType: 'retail',
  enabledFeatures: ['barcode-scanning', 'serial-numbers', 'warranty-tracking', 'low-stock-alerts'],
  defaultSettings: { enableSerialNumbers: true, enableWarrantyTracking: true },
  starterCategories: [
    { name: 'Phones & Tablets', description: 'Smartphones, feature phones, tablets' },
    { name: 'Laptops & Computers', description: 'Laptops, desktops, monitors' },
    { name: 'Accessories', description: 'Cables, chargers, cases, headphones' },
    { name: 'TVs & Displays', description: 'Smart TVs, monitors, projectors' },
    { name: 'Gaming', description: 'Consoles, controllers, games' },
  ],
  starterProducts: [
    { name: 'USB-C Cable 1m', sku: 'ACC-001', sellingPrice: 350, buyingPrice: 150, stock: 80, unit: 'pcs', category: 'Accessories' },
    { name: 'Phone Tempered Glass', sku: 'ACC-002', sellingPrice: 250, buyingPrice: 80, stock: 100, unit: 'pcs', category: 'Accessories' },
    { name: 'Wireless Earbuds', sku: 'ACC-003', sellingPrice: 2500, buyingPrice: 1200, stock: 20, unit: 'pcs', category: 'Accessories' },
    { name: 'Power Bank 10000mAh', sku: 'ACC-004', sellingPrice: 1800, buyingPrice: 900, stock: 30, unit: 'pcs', category: 'Accessories' },
    { name: 'HDMI Cable 2m', sku: 'ACC-005', sellingPrice: 600, buyingPrice: 250, stock: 40, unit: 'pcs', category: 'Accessories' },
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
    { id: 'first-product', title: 'Add your first product', description: 'Register a device in your inventory', action: '/dashboard/products' },
    { id: 'serial-numbers', title: 'Enable serial number tracking', description: 'Track IMEI and serial numbers per unit', action: '/dashboard/settings' },
    { id: 'warranty', title: 'Set up warranty tracking', description: 'Configure warranty periods for your products', action: '/dashboard/settings' },
    { id: 'employees', title: 'Invite employees', description: 'Add sales staff to your workspace', action: '/dashboard/settings' },
  ],
}
