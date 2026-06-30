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
  { id: 'add-product', label: 'Add Product', href: '/dashboard/products', icon: 'Package' },
  { id: 'inventory', label: 'Inventory', href: '/dashboard/inventory', icon: 'PackageSearch' },
  { id: 'purchase-order', label: 'Purchase Order', href: '/dashboard/purchase-orders', icon: 'ClipboardList' },
]

const starterCategories: StarterCategory[] = [
  { name: 'Hand Tools', description: 'Hammers, spanners, screwdrivers', icon: 'Wrench' },
  { name: 'Power Tools', description: 'Drills, grinders, saws', icon: 'Zap' },
  { name: 'Electrical', description: 'Cables, sockets, switches', icon: 'Plug' },
  { name: 'Plumbing', description: 'Pipes, fittings, valves', icon: 'Droplets' },
  { name: 'Paints & Finishes', description: 'Paints, varnishes, primers', icon: 'PaintBucket' },
]

const starterProducts: StarterProduct[] = [
  { name: 'Claw Hammer', sku: 'HND-001', sellingPrice: 650, buyingPrice: 320, stock: 30, unit: 'piece', category: 'Hand Tools' },
  { name: 'Electric Drill 13mm', sku: 'PWR-001', sellingPrice: 8500, buyingPrice: 5000, stock: 10, unit: 'piece', category: 'Power Tools' },
  { name: 'Extension Cable 10m', sku: 'ELC-001', sellingPrice: 1200, buyingPrice: 600, stock: 25, unit: 'piece', category: 'Electrical' },
  { name: 'PVC Pipe 1/2"', sku: 'PLM-001', sellingPrice: 350, buyingPrice: 180, stock: 100, unit: 'meter', category: 'Plumbing' },
  { name: 'White Wall Paint 4L', sku: 'PNT-001', sellingPrice: 1800, buyingPrice: 1100, stock: 40, unit: 'tin', category: 'Paints & Finishes' },
]

const gettingStartedTasks: GettingStartedTask[] = [
  { id: 'products', title: 'Add your product catalog', description: 'List your hardware stock with SKUs', action: '/dashboard/products' },
  { id: 'suppliers', title: 'Add suppliers', description: 'Set up your hardware suppliers', action: '/dashboard/settings' },
  { id: 'reorder', title: 'Configure reorder levels', description: 'Set minimum stock alerts', action: '/dashboard/settings' },
  { id: 'staff', title: 'Invite your team', description: 'Add sales staff and managers', action: '/dashboard/settings' },
]

export const hardwareTemplate: WorkspaceTemplate = {
  id: 'retail.hardware',
  version: 1,
  name: 'Hardware Store',
  businessType: 'retail',
  navigation,
  dashboardWidgets,
  quickActions,
  enabledModules: ['inventory', 'sales', 'products', 'customers', 'reports', 'analytics'],
  enabledFeatures: ['barcode-scanning', 'purchase-orders', 'low-stock-alerts', 'bulk-import'],
  settings: RETAIL_SETTINGS,
  permissions: RETAIL_PERMISSIONS,
  reports: RETAIL_REPORTS,
  starterCategories,
  starterProducts,
  gettingStartedTasks,
}
