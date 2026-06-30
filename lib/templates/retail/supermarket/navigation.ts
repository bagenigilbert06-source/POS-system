import type { NavigationConfig } from '../../types'

export const navigation: NavigationConfig = {
  primaryNav: [
    { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', route: '/dashboard/retail' },
    { id: 'sales', label: 'Sales', icon: 'ShoppingCart', route: '/dashboard/sales' },
    { id: 'products', label: 'Products', icon: 'Package', route: '/dashboard/products' },
    { id: 'inventory', label: 'Inventory', icon: 'PackageSearch', route: '/dashboard/inventory' },
    { id: 'customers', label: 'Customers', icon: 'Users', route: '/dashboard/customers' },
    { id: 'analytics', label: 'Analytics', icon: 'BarChart3', route: '/dashboard/analytics' },
    { id: 'reports', label: 'Reports', icon: 'FileBarChart', route: '/dashboard/reports' },
  ],
  secondaryNav: [
    { id: 'settings', label: 'Settings', icon: 'Settings', route: '/dashboard/settings' },
  ],
}
