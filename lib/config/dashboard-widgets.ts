export interface DashboardWidget {
  id: string
  name: string
  type: 'metric' | 'chart' | 'table' | 'list' | 'card'
  title: string
  description?: string
  module: string
  cols?: number
  rows?: number
  order: number
}

export interface DashboardLayout {
  id: string
  name: string
  modules: string[]
  widgets: DashboardWidget[]
}

export const DASHBOARD_LAYOUTS: Record<string, DashboardLayout> = {
  retail_store: {
    id: 'retail_store',
    name: 'Retail Store Dashboard',
    modules: ['inventory', 'sales', 'pos', 'customers', 'analytics'],
    widgets: [
      {
        id: 'sales_today',
        name: 'Sales Today',
        type: 'metric',
        title: 'Today Sales',
        module: 'sales',
        cols: 1,
        order: 1,
      },
      {
        id: 'orders_pending',
        name: 'Pending Orders',
        type: 'metric',
        title: 'Pending Orders',
        module: 'sales',
        cols: 1,
        order: 2,
      },
      {
        id: 'inventory_low',
        name: 'Low Stock Items',
        type: 'metric',
        title: 'Low Stock',
        module: 'inventory',
        cols: 1,
        order: 3,
      },
      {
        id: 'new_customers',
        name: 'New Customers',
        type: 'metric',
        title: 'New Customers',
        module: 'customers',
        cols: 1,
        order: 4,
      },
      {
        id: 'sales_chart',
        name: 'Sales Trend',
        type: 'chart',
        title: 'Sales Trend (Last 7 Days)',
        module: 'analytics',
        cols: 2,
        order: 5,
      },
      {
        id: 'top_products',
        name: 'Top Products',
        type: 'table',
        title: 'Top 5 Products',
        module: 'inventory',
        cols: 2,
        order: 6,
      },
    ],
  },
  restaurant: {
    id: 'restaurant',
    name: 'Restaurant Dashboard',
    modules: ['menu', 'orders', 'tables', 'kitchen', 'customers', 'analytics'],
    widgets: [
      {
        id: 'orders_today',
        name: 'Orders Today',
        type: 'metric',
        title: 'Orders Today',
        module: 'orders',
        cols: 1,
        order: 1,
      },
      {
        id: 'tables_occupied',
        name: 'Tables Occupied',
        type: 'metric',
        title: 'Tables Occupied',
        module: 'tables',
        cols: 1,
        order: 2,
      },
      {
        id: 'revenue_today',
        name: 'Revenue Today',
        type: 'metric',
        title: 'Revenue Today',
        module: 'orders',
        cols: 1,
        order: 3,
      },
      {
        id: 'avg_table_time',
        name: 'Avg Table Time',
        type: 'metric',
        title: 'Avg Table Time',
        module: 'tables',
        cols: 1,
        order: 4,
      },
      {
        id: 'kitchen_queue',
        name: 'Kitchen Queue',
        type: 'list',
        title: 'Orders in Kitchen',
        module: 'kitchen',
        cols: 2,
        order: 5,
      },
      {
        id: 'popular_items',
        name: 'Popular Items',
        type: 'table',
        title: 'Popular Menu Items',
        module: 'menu',
        cols: 2,
        order: 6,
      },
    ],
  },
  pharmacy: {
    id: 'pharmacy',
    name: 'Pharmacy Dashboard',
    modules: ['inventory', 'prescriptions', 'sales', 'pos', 'customers', 'compliance', 'analytics'],
    widgets: [
      {
        id: 'sales_today',
        name: 'Sales Today',
        type: 'metric',
        title: 'Today Sales',
        module: 'sales',
        cols: 1,
        order: 1,
      },
      {
        id: 'prescriptions_pending',
        name: 'Pending Prescriptions',
        type: 'metric',
        title: 'Pending Rx',
        module: 'prescriptions',
        cols: 1,
        order: 2,
      },
      {
        id: 'expiring_stock',
        name: 'Expiring Soon',
        type: 'metric',
        title: 'Expiring Soon',
        module: 'inventory',
        cols: 1,
        order: 3,
      },
      {
        id: 'compliance_alerts',
        name: 'Compliance Alerts',
        type: 'metric',
        title: 'Alerts',
        module: 'compliance',
        cols: 1,
        order: 4,
      },
      {
        id: 'prescription_chart',
        name: 'Prescription Trends',
        type: 'chart',
        title: 'Prescription Volume',
        module: 'analytics',
        cols: 2,
        order: 5,
      },
      {
        id: 'low_stock',
        name: 'Low Stock Medications',
        type: 'table',
        title: 'Low Stock Items',
        module: 'inventory',
        cols: 2,
        order: 6,
      },
    ],
  },
  pet_shop: {
    id: 'pet_shop',
    name: 'Pet Shop Dashboard',
    modules: ['inventory', 'services', 'sales', 'pos', 'customers', 'appointments', 'analytics'],
    widgets: [
      {
        id: 'sales_today',
        name: 'Sales Today',
        type: 'metric',
        title: 'Today Sales',
        module: 'sales',
        cols: 1,
        order: 1,
      },
      {
        id: 'appointments_today',
        name: 'Appointments Today',
        type: 'metric',
        title: 'Appointments',
        module: 'appointments',
        cols: 1,
        order: 2,
      },
      {
        id: 'inventory_status',
        name: 'Inventory Status',
        type: 'metric',
        title: 'Low Stock',
        module: 'inventory',
        cols: 1,
        order: 3,
      },
      {
        id: 'customer_count',
        name: 'Total Customers',
        type: 'metric',
        title: 'Customers',
        module: 'customers',
        cols: 1,
        order: 4,
      },
      {
        id: 'services_chart',
        name: 'Popular Services',
        type: 'chart',
        title: 'Service Bookings',
        module: 'analytics',
        cols: 2,
        order: 5,
      },
      {
        id: 'upcoming_appointments',
        name: 'Upcoming Appointments',
        type: 'table',
        title: 'Next Appointments',
        module: 'appointments',
        cols: 2,
        order: 6,
      },
    ],
  },
}

export function getDashboardLayout(templateId: string): DashboardLayout | null {
  return DASHBOARD_LAYOUTS[templateId] || null
}
