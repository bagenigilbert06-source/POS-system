/**
 * Business Type Configuration
 * Defines navigation, features, widgets, and permissions per business type
 * Configuration-driven system for scalable multi-tenant architecture
 */

import { BusinessTypeEnum } from '../types';

export interface NavigationItem {
  id: string;
  label: string;
  href: string;
  icon: string;
  badge?: number;
  children?: NavigationItem[];
  requiredPermission?: string;
  isActive?: (pathname: string) => boolean;
}

export interface DashboardWidget {
  id: string;
  type: 'stat' | 'chart' | 'table' | 'alert' | 'feed' | 'custom';
  title: string;
  span: number; // 1-4 for grid layout
  height: string; // e.g., 'h-64'
  dataSource: string;
  requiredPermission?: string;
  refreshInterval?: number;
}

export interface BusinessTypeConfig {
  id: BusinessTypeEnum;
  name: string;
  dashboardRoute: string;
  defaultRoute: string;
  navigation: NavigationItem[];
  dashboardLayout: DashboardWidget[];
  modules: string[];
  features: string[];
  requiredModules: string[];
  defaultCurrency: string;
  theme?: {
    primaryColor?: string;
    accentColor?: string;
  };
}

// Shared Navigation Items
const SHARED_DASHBOARD = {
  id: 'dashboard',
  label: 'Dashboard',
  href: '/dashboard',
  icon: 'LayoutDashboard',
} as const;

const SHARED_PRODUCTS = {
  id: 'products',
  label: 'Products',
  href: '/products',
  icon: 'Package',
  requiredPermission: 'product:view',
} as const;

const SHARED_CUSTOMERS = {
  id: 'customers',
  label: 'Customers',
  href: '/customers',
  icon: 'Users',
  requiredPermission: 'customer:view',
} as const;

const SHARED_REPORTS = {
  id: 'reports',
  label: 'Reports',
  href: '/reports',
  icon: 'BarChart3',
  requiredPermission: 'report:view',
} as const;

const SHARED_SETTINGS = {
  id: 'settings',
  label: 'Settings',
  href: '/settings',
  icon: 'Settings',
  requiredPermission: 'settings:view',
} as const;

// Retail Configuration
export const RETAIL_CONFIG: BusinessTypeConfig = {
  id: BusinessTypeEnum.RETAIL,
  name: 'Retail Store',
  dashboardRoute: '/dashboard/retail',
  defaultRoute: '/dashboard/retail',
  navigation: [
    SHARED_DASHBOARD,
    {
      id: 'sales',
      label: 'Today Sales',
      href: '/sales',
      icon: 'ShoppingCart',
      requiredPermission: 'sale:view',
    },
    SHARED_PRODUCTS,
    {
      id: 'inventory',
      label: 'Inventory',
      href: '/inventory',
      icon: 'Package2',
      requiredPermission: 'inventory:view',
    },
    SHARED_CUSTOMERS,
    {
      id: 'inventory-transfers',
      label: 'Transfers',
      href: '/inventory-transfers',
      icon: 'Shuffle',
      requiredPermission: 'inventory:transfer',
    },
    SHARED_REPORTS,
    SHARED_SETTINGS,
  ],
  dashboardLayout: [
    { id: 'revenue-card', type: 'stat', title: 'Today Revenue', span: 1, height: 'h-32', dataSource: 'todaysRevenue' },
    { id: 'transactions-card', type: 'stat', title: 'Transactions', span: 1, height: 'h-32', dataSource: 'todaysTransactions' },
    { id: 'profit-card', type: 'stat', title: 'Profit', span: 1, height: 'h-32', dataSource: 'todaysProfit' },
    { id: 'avg-order-card', type: 'stat', title: 'Avg Order Value', span: 1, height: 'h-32', dataSource: 'averageOrderValue' },
    { id: 'revenue-chart', type: 'chart', title: 'Revenue Trend', span: 2, height: 'h-80', dataSource: 'revenueTrend' },
    { id: 'top-products', type: 'table', title: 'Top Products', span: 2, height: 'h-80', dataSource: 'topProducts' },
    { id: 'low-stock', type: 'alert', title: 'Low Stock Alerts', span: 2, height: 'h-64', dataSource: 'lowStockAlerts' },
    { id: 'recent-sales', type: 'table', title: 'Recent Sales', span: 2, height: 'h-80', dataSource: 'recentSales' },
  ],
  modules: ['inventory', 'sales', 'products', 'customers', 'reports', 'analytics'],
  requiredModules: ['inventory', 'sales', 'products'],
  features: ['low-stock-alerts', 'barcode-scanning', 'loyalty-points', 'inventory-transfer'],
  defaultCurrency: 'KES',
};

// Restaurant Configuration
export const RESTAURANT_CONFIG: BusinessTypeConfig = {
  id: BusinessTypeEnum.RESTAURANT,
  name: 'Restaurant & Café',
  dashboardRoute: '/dashboard/restaurant',
  defaultRoute: '/dashboard/restaurant',
  navigation: [
    SHARED_DASHBOARD,
    {
      id: 'tables',
      label: 'Tables',
      href: '/tables',
      icon: 'UtensilsCrossed',
      requiredPermission: 'table:view',
    },
    {
      id: 'kitchen',
      label: 'Kitchen Queue',
      href: '/kitchen',
      icon: 'ChefHat',
      requiredPermission: 'kitchen:queue-view',
      badge: 0,
    },
    {
      id: 'orders',
      label: 'Orders',
      href: '/orders',
      icon: 'ClipboardList',
      requiredPermission: 'order:view',
    },
    SHARED_PRODUCTS,
    {
      id: 'inventory',
      label: 'Inventory',
      href: '/inventory',
      icon: 'Package2',
      requiredPermission: 'inventory:view',
    },
    SHARED_CUSTOMERS,
    SHARED_REPORTS,
    SHARED_SETTINGS,
  ],
  dashboardLayout: [
    { id: 'active-tables', type: 'stat', title: 'Active Tables', span: 1, height: 'h-32', dataSource: 'activeTableCount' },
    { id: 'pending-orders', type: 'stat', title: 'Pending Orders', span: 1, height: 'h-32', dataSource: 'pendingOrderCount' },
    { id: 'daily-revenue', type: 'stat', title: 'Daily Revenue', span: 1, height: 'h-32', dataSource: 'dailyRevenue' },
    { id: 'avg-order-value', type: 'stat', title: 'Avg Order Value', span: 1, height: 'h-32', dataSource: 'averageOrderValue' },
    { id: 'kitchen-queue', type: 'table', title: 'Kitchen Queue', span: 2, height: 'h-80', dataSource: 'kitchenQueue' },
    { id: 'active-tables-grid', type: 'custom', title: 'Table Status', span: 2, height: 'h-80', dataSource: 'tableStatus' },
    { id: 'revenue-chart', type: 'chart', title: 'Revenue by Hour', span: 2, height: 'h-80', dataSource: 'revenueByHour' },
    { id: 'recent-orders', type: 'table', title: 'Recent Orders', span: 2, height: 'h-80', dataSource: 'recentOrders' },
  ],
  modules: ['kitchen', 'tables', 'orders', 'inventory', 'sales', 'customers', 'reports', 'analytics'],
  requiredModules: ['kitchen', 'tables', 'orders'],
  features: ['table-management', 'kitchen-queue', 'menu-categories', 'order-modifications', 'staff-management'],
  defaultCurrency: 'KES',
};

// Pharmacy Configuration
export const PHARMACY_CONFIG: BusinessTypeConfig = {
  id: BusinessTypeEnum.PHARMACY,
  name: 'Pharmacy',
  dashboardRoute: '/dashboard/pharmacy',
  defaultRoute: '/dashboard/pharmacy',
  navigation: [
    SHARED_DASHBOARD,
    {
      id: 'prescriptions',
      label: 'Prescriptions',
      href: '/prescriptions',
      icon: 'Pill',
      requiredPermission: 'prescription:view',
    },
    SHARED_PRODUCTS,
    {
      id: 'inventory',
      label: 'Inventory',
      href: '/inventory',
      icon: 'Package2',
      requiredPermission: 'inventory:view',
    },
    {
      id: 'batch-tracking',
      label: 'Batch Tracking',
      href: '/batch-tracking',
      icon: 'BarChart3',
      requiredPermission: 'batch:tracking-view',
    },
    {
      id: 'expiry-alerts',
      label: 'Expiry Alerts',
      href: '/expiry-alerts',
      icon: 'AlertTriangle',
    },
    SHARED_CUSTOMERS,
    SHARED_REPORTS,
    SHARED_SETTINGS,
  ],
  dashboardLayout: [
    { id: 'low-stock', type: 'stat', title: 'Low Stock Items', span: 1, height: 'h-32', dataSource: 'lowStockCount' },
    { id: 'expiring-soon', type: 'stat', title: 'Expiring Soon', span: 1, height: 'h-32', dataSource: 'expiringCount' },
    { id: 'daily-sales', type: 'stat', title: 'Daily Sales', span: 1, height: 'h-32', dataSource: 'dailySales' },
    { id: 'pending-prescriptions', type: 'stat', title: 'Pending Prescriptions', span: 1, height: 'h-32', dataSource: 'pendingPrescriptions' },
    { id: 'expiry-alert', type: 'alert', title: 'Expiring Soon', span: 2, height: 'h-80', dataSource: 'expiryAlerts' },
    { id: 'pending-prescriptions-list', type: 'table', title: 'Pending Prescriptions', span: 2, height: 'h-80', dataSource: 'pendingPrescriptionsList' },
    { id: 'low-stock-alert', type: 'alert', title: 'Low Stock Medicines', span: 2, height: 'h-80', dataSource: 'lowStockAlerts' },
    { id: 'sales-trend', type: 'chart', title: 'Sales Trend', span: 2, height: 'h-80', dataSource: 'salesTrend' },
  ],
  modules: ['prescriptions', 'inventory', 'batch-tracking', 'sales', 'products', 'customers', 'reports', 'analytics'],
  requiredModules: ['prescriptions', 'inventory', 'batch-tracking'],
  features: ['expiry-tracking', 'batch-numbers', 'prescription-management', 'drug-interactions', 'low-stock-alerts'],
  defaultCurrency: 'KES',
};

// Business Type Registry
export const BUSINESS_TYPE_CONFIGS: Record<BusinessTypeEnum, BusinessTypeConfig> = {
  [BusinessTypeEnum.RETAIL]: RETAIL_CONFIG,
  [BusinessTypeEnum.RESTAURANT]: RESTAURANT_CONFIG,
  [BusinessTypeEnum.PHARMACY]: PHARMACY_CONFIG,
};

/**
 * Get business configuration by type
 */
export function getBusinessConfig(businessType: BusinessTypeEnum): BusinessTypeConfig {
  return BUSINESS_TYPE_CONFIGS[businessType] || RETAIL_CONFIG;
}

/**
 * Get all available business types
 */
export function getAllBusinessConfigs(): BusinessTypeConfig[] {
  return Object.values(BUSINESS_TYPE_CONFIGS);
}

/**
 * Check if business type supports a module
 */
export function supportsModule(businessType: BusinessTypeEnum, moduleName: string): boolean {
  const config = getBusinessConfig(businessType);
  return config.modules.includes(moduleName);
}

/**
 * Check if business type has a feature
 */
export function hasFeature(businessType: BusinessTypeEnum, featureName: string): boolean {
  const config = getBusinessConfig(businessType);
  return config.features.includes(featureName);
}

/**
 * Get navigation for business type
 */
export function getNavigation(businessType: BusinessTypeEnum): NavigationItem[] {
  const config = getBusinessConfig(businessType);
  return config.navigation;
}

/**
 * Get dashboard layout for business type
 */
export function getDashboardLayout(businessType: BusinessTypeEnum): DashboardWidget[] {
  const config = getBusinessConfig(businessType);
  return config.dashboardLayout;
}
