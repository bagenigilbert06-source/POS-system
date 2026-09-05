import type { WorkspaceTemplate, DashboardWidget, QuickAction, GettingStartedTask, StarterCategory, StarterProduct } from '../../types'
import { RETAIL_PERMISSIONS, RETAIL_REPORTS, RETAIL_SETTINGS } from '../../_shared/defaults'
import type { NavigationConfig } from '../../types'

const navigation: NavigationConfig = {
  primaryNav: [
    { id: 'dashboard', label: 'Hardware overview', icon: 'LayoutDashboard', route: '/dashboard' },
    { id: 'pos', label: 'Hardware POS', icon: 'ShoppingCart', route: '/dashboard/pos' },
    { id: 'sales', label: 'Store sales', icon: 'ReceiptText', route: '/dashboard/sales' },
    { id: 'products', label: 'Hardware catalogue', icon: 'Package', route: '/dashboard/products' },
    { id: 'inventory', label: 'Stock yard', icon: 'PackageSearch', route: '/dashboard/inventory' },
    { id: 'customers', label: 'Customers & contractors', icon: 'Users', route: '/dashboard/customers' },
    { id: 'reports', label: 'Reports', icon: 'FileBarChart', route: '/dashboard/reports' },
  ],
  secondaryNav: [{ id: 'settings', label: 'Settings', icon: 'Settings', route: '/dashboard/settings' }],
}

const dashboardWidgets: DashboardWidget[] = [
  { id: 'today-revenue', type: 'stat', title: "Today's Revenue", dataSource: 'todaysSales', span: 1 },
  { id: 'transactions', type: 'stat', title: 'Transactions', dataSource: 'todaysTransactions', span: 1 },
  { id: 'avg-order', type: 'stat', title: 'Avg Order Value', dataSource: 'averageOrderValue', span: 1 },
  { id: 'profit', type: 'stat', title: "Today's Profit", dataSource: 'todaysProfit', span: 1 },
  { id: 'low-stock', type: 'alert-list', title: 'Low Stock Alerts', dataSource: 'lowStockAlerts', span: 2 },
  { id: 'top-products', type: 'product-table', title: 'Top Products', dataSource: 'topProducts', span: 2 },
]

const quickActions: QuickAction[] = [
  { id: 'new-sale', label: 'New hardware sale', href: '/dashboard/pos', icon: 'ShoppingCart', primary: true },
  { id: 'add-product', label: 'Add stock item', href: '/dashboard/products/new', icon: 'Package' },
  { id: 'inventory', label: 'Check stock yard', href: '/dashboard/inventory', icon: 'PackageSearch' },
  { id: 'stock-intake', label: 'Receive delivery', href: '/dashboard/stock-intake', icon: 'ClipboardList' },
]

const starterCategories: StarterCategory[] = [
  { name: 'Building Materials', description: 'Cement, sand, ballast and blocks', icon: 'Boxes' },
  { name: 'Roofing & Steel', description: 'Iron sheets, mesh, bars and wire', icon: 'Package2' },
  { name: 'Hand Tools', description: 'Hammers, spanners, screwdrivers and pliers', icon: 'Wrench' },
  { name: 'Power Tools', description: 'Drills, grinders, saws and accessories', icon: 'Zap' },
  { name: 'Electrical', description: 'Cables, sockets, switches and fittings', icon: 'Plug' },
  { name: 'Plumbing', description: 'Pipes, fittings, taps and valves', icon: 'Droplets' },
  { name: 'Paints & Finishes', description: 'Paints, varnishes, primers and brushes', icon: 'PaintBucket' },
]

const starterProducts: StarterProduct[] = [
  { name: 'Cement 50kg', sku: 'BLD-CEM-50', sellingPrice: 850, buyingPrice: 720, stock: 0, unit: 'bag', category: 'Building Materials' },
  { name: 'Binding Wire 25kg', sku: 'STL-BND-25', sellingPrice: 4200, buyingPrice: 3450, stock: 0, unit: 'roll', category: 'Roofing & Steel' },
  { name: 'Claw Hammer 16oz', sku: 'HND-HMR-16', sellingPrice: 650, buyingPrice: 320, stock: 0, unit: 'piece', category: 'Hand Tools' },
  { name: 'Electric Drill 13mm', sku: 'PWR-DRL-13', sellingPrice: 8500, buyingPrice: 5000, stock: 0, unit: 'piece', category: 'Power Tools' },
  { name: 'Twin Cable 2.5mm', sku: 'ELC-TWN-25', sellingPrice: 185, buyingPrice: 125, stock: 0, unit: 'meter', category: 'Electrical' },
  { name: 'PVC Pipe 1/2 inch', sku: 'PLM-PVC-12', sellingPrice: 350, buyingPrice: 180, stock: 0, unit: 'meter', category: 'Plumbing' },
  { name: 'White Wall Paint 4L', sku: 'PNT-WHT-4L', sellingPrice: 1800, buyingPrice: 1100, stock: 0, unit: 'tin', category: 'Paints & Finishes' },
]

const gettingStartedTasks: GettingStartedTask[] = [
  { id: 'products', title: 'Build your hardware catalogue', description: 'Add product codes, units and selling prices.', action: '/dashboard/products' },
  { id: 'delivery', title: 'Receive your first delivery', description: 'Record supplier stock and unit costs accurately.', action: '/dashboard/stock-intake' },
  { id: 'reorder', title: 'Set reorder levels', description: 'Protect fast-moving building supplies from stock-outs.', action: '/dashboard/inventory' },
  { id: 'staff', title: 'Invite your counter team', description: 'Give cashiers and managers the right access.', action: '/dashboard/settings' },
]

export const hardwareTemplate: WorkspaceTemplate = {
  id: 'retail.hardware',
  version: 2,
  name: 'Hardware Store',
  businessType: 'retail',
  navigation,
  dashboardWidgets,
  quickActions,
  enabledModules: ['pos', 'inventory', 'sales', 'products', 'customers', 'expenses', 'reports', 'analytics'],
  enabledFeatures: ['barcode-scanning', 'stock-intake', 'low-stock-alerts', 'bulk-import'],
  settings: RETAIL_SETTINGS,
  permissions: RETAIL_PERMISSIONS,
  reports: RETAIL_REPORTS,
  starterCategories,
  starterProducts,
  gettingStartedTasks,
}
