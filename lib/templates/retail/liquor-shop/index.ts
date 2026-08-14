import type {
  DashboardWidget,
  GettingStartedTask,
  QuickAction,
  StarterCategory,
  StarterProduct,
  WorkspaceSettings,
  WorkspaceTemplate,
} from '../../types';
import {
  RETAIL_PERMISSIONS,
  RETAIL_REPORTS,
  RETAIL_SETTINGS,
} from '../../_shared/defaults';
import { navigation } from '../supermarket/navigation';

const dashboardWidgets: DashboardWidget[] = [
  {
    id: 'today-revenue',
    type: 'stat',
    title: "Today's Sales",
    dataSource: 'todaysSales',
    span: 1,
  },
  {
    id: 'transactions',
    type: 'stat',
    title: 'Bottles Sold',
    dataSource: 'todaysTransactions',
    span: 1,
  },
  {
    id: 'avg-sale',
    type: 'stat',
    title: 'Average Sale',
    dataSource: 'averageOrderValue',
    span: 1,
  },
  {
    id: 'stock-alerts',
    type: 'stat',
    title: 'Stock Alerts',
    dataSource: 'lowStockAlerts',
    span: 1,
  },
  {
    id: 'low-stock',
    type: 'alert-list',
    title: 'Reorder List',
    dataSource: 'lowStockAlerts',
    span: 2,
  },
  {
    id: 'top-products',
    type: 'product-table',
    title: 'Best-selling Drinks',
    dataSource: 'topProducts',
    span: 2,
  },
];

const quickActions: QuickAction[] = [
  {
    id: 'new-sale',
    label: 'Open Checkout',
    href: '/dashboard/pos',
    icon: 'ShoppingCart',
    primary: true,
  },
  {
    id: 'add-drink',
    label: 'Add Drink',
    href: '/dashboard/products',
    icon: 'Wine',
  },
  {
    id: 'receive-stock',
    label: 'Receive Stock',
    href: '/dashboard/inventory',
    icon: 'PackagePlus',
  },
];

const starterCategories: StarterCategory[] = [
  { name: 'Beer', description: 'Local, imported and craft beer', icon: 'Beer' },
  {
    name: 'Wine',
    description: 'Red, white, rosé and sparkling wine',
    icon: 'Wine',
  },
  {
    name: 'Spirits',
    description: 'Whisky, vodka, gin, rum and brandy',
    icon: 'Martini',
  },
  {
    name: 'Ciders & RTDs',
    description: 'Ciders and ready-to-drink beverages',
    icon: 'Bottle',
  },
  {
    name: 'Mixers & Soft Drinks',
    description: 'Soda, tonic, water and juice',
    icon: 'GlassWater',
  },
  {
    name: 'Accessories',
    description: 'Openers, gift bags and bar accessories',
    icon: 'Package',
  },
];

const starterProducts: StarterProduct[] = [
  {
    name: 'Sample Lager 500ml',
    sku: 'BEER-001',
    sellingPrice: 250,
    buyingPrice: 190,
    stock: 0,
    unit: 'bottle',
    category: 'Beer',
  },
  {
    name: 'Sample Red Wine 750ml',
    sku: 'WINE-001',
    sellingPrice: 1200,
    buyingPrice: 850,
    stock: 0,
    unit: 'bottle',
    category: 'Wine',
  },
  {
    name: 'Sample Whisky 750ml',
    sku: 'SPIRIT-001',
    sellingPrice: 2200,
    buyingPrice: 1700,
    stock: 0,
    unit: 'bottle',
    category: 'Spirits',
  },
];

const settings: WorkspaceSettings = {
  ...RETAIL_SETTINGS,
  receipt: {
    ...RETAIL_SETTINGS.receipt,
    footerMessage: 'Thank you. Please enjoy responsibly.',
  },
  inventory: {
    ...RETAIL_SETTINGS.inventory,
    enableBarcodeScanning: true,
    enableBatchTracking: true,
    enableExpiryTracking: true,
    lowStockThreshold: 12,
  },
  notifications: {
    ...RETAIL_SETTINGS.notifications,
    expiryAlerts: true,
    expiryAlertDays: 30,
  },
};

const gettingStartedTasks: GettingStartedTask[] = [
  {
    id: 'catalogue',
    title: 'Build your drinks catalogue',
    description: 'Add bottle sizes, barcodes, buying prices and selling prices',
    action: '/dashboard/products',
  },
  {
    id: 'stock',
    title: 'Receive opening stock',
    description: 'Record and verify opening quantities',
    action: '/dashboard/inventory',
  },
  {
    id: 'reorder',
    title: 'Set reorder levels',
    description: 'Get alerted before popular drinks run out',
    action: '/dashboard/inventory',
  },
  {
    id: 'staff',
    title: 'Add cashiers and attendants',
    description: 'Give each team member the right access',
    action: '/dashboard/settings',
  },
];

export const liquorShopTemplate: WorkspaceTemplate = {
  id: 'retail.liquor-shop',
  version: 1,
  name: 'Liquor Shop',
  businessType: 'retail',
  navigation,
  dashboardWidgets,
  quickActions,
  enabledModules: [
    'pos',
    'sales',
    'products',
    'inventory',
    'customers',
    'expenses',
    'reports',
    'analytics',
  ],
  enabledFeatures: [
    'barcode-scanning',
    'batch-tracking',
    'expiry-tracking',
    'low-stock-alerts',
    'supplier-management',
  ],
  settings,
  permissions: RETAIL_PERMISSIONS,
  reports: RETAIL_REPORTS,
  starterCategories,
  starterProducts,
  gettingStartedTasks,
};
