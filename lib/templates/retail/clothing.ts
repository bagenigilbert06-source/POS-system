import type { WorkspaceTemplate } from '../types'

export const clothingTemplate: WorkspaceTemplate = {
  id: 'retail.clothing',
  name: 'Clothing Store',
  businessType: 'retail',
  enabledFeatures: ['product-variants', 'size-attributes', 'color-attributes', 'low-stock-alerts'],
  defaultSettings: { enableVariants: true },
  starterCategories: [
    { name: "Men's Wear", description: 'Shirts, trousers, suits, jackets' },
    { name: "Women's Wear", description: 'Dresses, blouses, skirts, tops' },
    { name: "Kids' Wear", description: 'Boys, girls, unisex, school uniforms' },
    { name: 'Shoes & Footwear', description: 'Sneakers, heels, sandals, boots' },
    { name: 'Accessories', description: 'Bags, belts, hats, scarves' },
  ],
  starterProducts: [
    { name: "Men's T-Shirt (M)", sku: 'MEN-001', sellingPrice: 900, buyingPrice: 400, stock: 30, unit: 'pcs', category: "Men's Wear" },
    { name: "Women's Blouse (M)", sku: 'WOM-001', sellingPrice: 1200, buyingPrice: 550, stock: 25, unit: 'pcs', category: "Women's Wear" },
    { name: "Kids' Polo Shirt (8yr)", sku: 'KID-001', sellingPrice: 650, buyingPrice: 280, stock: 20, unit: 'pcs', category: "Kids' Wear" },
    { name: 'Sneakers (Size 42)', sku: 'SHO-001', sellingPrice: 3500, buyingPrice: 1800, stock: 15, unit: 'pair', category: 'Shoes & Footwear' },
    { name: 'Leather Belt', sku: 'ACC-001', sellingPrice: 700, buyingPrice: 300, stock: 40, unit: 'pcs', category: 'Accessories' },
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
    { id: 'first-product', title: 'Add your first product', description: 'Register a clothing item with sizes', action: '/dashboard/products' },
    { id: 'variants', title: 'Enable size & color variants', description: 'Track stock per size and color', action: '/dashboard/settings' },
    { id: 'categories', title: 'Review starter categories', description: 'Customize categories for your store', action: '/dashboard/inventory' },
    { id: 'employees', title: 'Invite employees', description: 'Add sales assistants to your workspace', action: '/dashboard/settings' },
  ],
}
