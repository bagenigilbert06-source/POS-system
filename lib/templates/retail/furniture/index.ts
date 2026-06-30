import type { WorkspaceTemplate, DashboardWidget, QuickAction, GettingStartedTask, StarterCategory, StarterProduct } from '../../types'
import { RETAIL_PERMISSIONS, RETAIL_REPORTS, RETAIL_SETTINGS } from '../../_shared/defaults'
import { navigation } from '../supermarket/navigation'

const dashboardWidgets: DashboardWidget[] = [
  { id: 'today-revenue', type: 'stat', title: "Today's Revenue", dataSource: 'todaysSales', span: 1 },
  { id: 'transactions', type: 'stat', title: 'Transactions', dataSource: 'todaysTransactions', span: 1 },
  { id: 'avg-order', type: 'stat', title: 'Avg Order Value', dataSource: 'averageOrderValue', span: 1 },
  { id: 'profit', type: 'stat', title: "Today's Profit", dataSource: 'todaysProfit', span: 1 },
  { id: 'low-stock', type: 'alert-list', title: 'Low Stock Alerts', dataSource: 'lowStockAlerts', span: 2 },
  { id: 'top-products', type: 'product-table', title: 'Top Products', dataSource: 'topProducts', span: 2 },
]

const quickActions: QuickAction[] = [
  { id: 'new-sale', label: 'New Sale', href: '/dashboard/sales', icon: 'ShoppingCart', primary: true },
  { id: 'add-product', label: 'Add Furniture', href: '/dashboard/products', icon: 'Package' },
  { id: 'inventory', label: 'Inventory', href: '/dashboard/inventory', icon: 'PackageSearch' },
]

const starterCategories: StarterCategory[] = [
  { name: 'Living Room', description: 'Sofas, coffee tables, TV stands', icon: 'Sofa' },
  { name: 'Bedroom', description: 'Beds, wardrobes, dressers', icon: 'BedDouble' },
  { name: 'Dining Room', description: 'Dining tables and chairs', icon: 'UtensilsCrossed' },
  { name: 'Office Furniture', description: 'Desks, chairs, shelving', icon: 'Monitor' },
  { name: 'Outdoor', description: 'Garden and patio furniture', icon: 'TreePine' },
]

const starterProducts: StarterProduct[] = [
  { name: '3-Seater Sofa', sku: 'LIV-001', sellingPrice: 45000, buyingPrice: 28000, stock: 5, unit: 'piece', category: 'Living Room' },
  { name: 'Queen Bed Frame', sku: 'BED-001', sellingPrice: 35000, buyingPrice: 20000, stock: 4, unit: 'piece', category: 'Bedroom' },
  { name: '6-Seater Dining Set', sku: 'DIN-001', sellingPrice: 55000, buyingPrice: 32000, stock: 3, unit: 'set', category: 'Dining Room' },
  { name: 'Office Chair', sku: 'OFF-001', sellingPrice: 12000, buyingPrice: 7000, stock: 10, unit: 'piece', category: 'Office Furniture' },
  { name: 'Bookshelf 5-Tier', sku: 'OFF-002', sellingPrice: 8500, buyingPrice: 5000, stock: 8, unit: 'piece', category: 'Office Furniture' },
]

const gettingStartedTasks: GettingStartedTask[] = [
  { id: 'products', title: 'Add your furniture catalog', description: 'List your furniture with photos and dimensions', action: '/dashboard/products' },
  { id: 'delivery', title: 'Set up delivery zones', description: 'Configure delivery fees for different areas', action: '/dashboard/settings' },
  { id: 'invoices', title: 'Configure invoice numbering', description: 'Set up your invoice prefix and starting number', action: '/dashboard/settings' },
  { id: 'staff', title: 'Invite your team', description: 'Add sales consultants and managers', action: '/dashboard/settings' },
]

export const furnitureTemplate: WorkspaceTemplate = {
  id: 'retail.furniture',
  version: 1,
  name: 'Furniture Store',
  businessType: 'retail',
  navigation,
  dashboardWidgets,
  quickActions,
  enabledModules: ['inventory', 'sales', 'products', 'customers', 'reports', 'analytics'],
  enabledFeatures: ['low-stock-alerts', 'invoicing', 'product-images'],
  settings: { ...RETAIL_SETTINGS, inventory: { ...RETAIL_SETTINGS.inventory, lowStockThreshold: 3 } },
  permissions: RETAIL_PERMISSIONS,
  reports: RETAIL_REPORTS,
  starterCategories,
  starterProducts,
  gettingStartedTasks,
}
