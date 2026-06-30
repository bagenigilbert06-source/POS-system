import type { WorkspaceTemplate } from '../types'

export const cosmeticsTemplate: WorkspaceTemplate = {
  id: 'retail.cosmetics',
  name: 'Cosmetics Store',
  businessType: 'retail',
  enabledFeatures: ['expiry-tracking', 'barcode-scanning', 'low-stock-alerts'],
  defaultSettings: { enableExpiryTracking: true },
  starterCategories: [
    { name: 'Skincare', description: 'Moisturisers, serums, cleansers, sunscreen' },
    { name: 'Makeup', description: 'Foundation, lipstick, mascara, eyeshadow' },
    { name: 'Haircare', description: 'Shampoos, conditioners, hair oils, treatments' },
    { name: 'Fragrances', description: 'Perfumes, body sprays, deodorants' },
    { name: 'Body Care', description: 'Lotions, soaps, scrubs, bath products' },
  ],
  starterProducts: [
    { name: 'Moisturising Lotion 200ml', sku: 'SKN-001', sellingPrice: 850, buyingPrice: 400, stock: 40, unit: 'bottle', category: 'Skincare' },
    { name: 'Lipstick (Red)', sku: 'MKP-001', sellingPrice: 600, buyingPrice: 250, stock: 30, unit: 'pcs', category: 'Makeup' },
    { name: 'Shampoo 400ml', sku: 'HAI-001', sellingPrice: 700, buyingPrice: 320, stock: 35, unit: 'bottle', category: 'Haircare' },
    { name: 'Perfume 50ml', sku: 'FRG-001', sellingPrice: 2500, buyingPrice: 1200, stock: 20, unit: 'bottle', category: 'Fragrances' },
    { name: 'Body Lotion 250ml', sku: 'BOD-001', sellingPrice: 550, buyingPrice: 240, stock: 50, unit: 'bottle', category: 'Body Care' },
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
    { id: 'expiry', title: 'Enable expiry tracking', description: 'Track best-before dates on cosmetics', action: '/dashboard/settings' },
    { id: 'categories', title: 'Review starter categories', description: 'Customize product categories', action: '/dashboard/inventory' },
    { id: 'employees', title: 'Invite employees', description: 'Add beauty consultants to your workspace', action: '/dashboard/settings' },
  ],
}
