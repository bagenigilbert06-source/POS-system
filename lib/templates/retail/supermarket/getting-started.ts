import type { GettingStartedTask } from '../../types'

export const gettingStartedTasks: GettingStartedTask[] = [
  { id: 'first-product', title: 'Add your first product', description: 'Create a product in your inventory', action: '/dashboard/products' },
  { id: 'categories', title: 'Review starter categories', description: 'Customize the pre-loaded product categories', action: '/dashboard/inventory' },
  { id: 'barcode', title: 'Connect a barcode scanner', description: 'Set up barcode scanning for faster checkout', action: '/dashboard/settings' },
  { id: 'employees', title: 'Invite employees', description: 'Add cashiers and managers to your workspace', action: '/dashboard/settings' },
  { id: 'suppliers', title: 'Add your suppliers', description: 'Set up suppliers for purchase orders', action: '/dashboard/settings' },
]
