import { BusinessTemplate } from '@/lib/types/workspace'

export const BUSINESS_TEMPLATES: Record<string, BusinessTemplate> = {
  retail_store: {
    id: 'retail_store',
    name: 'Retail Store',
    description: 'General retail business with inventory management',
    enabledModules: ['inventory', 'sales', 'pos', 'customers', 'analytics'],
    defaultCategories: ['Electronics', 'Clothing', 'Home & Garden', 'Sports & Outdoors'],
    defaultProducts: [
      { name: 'Sample Product 1', sku: 'SKU001', price: 29.99, category: 'Electronics' },
      { name: 'Sample Product 2', sku: 'SKU002', price: 49.99, category: 'Clothing' },
    ],
    sidebarConfig: {
      primaryNav: [
        { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
        { id: 'inventory', label: 'Inventory', icon: 'Package' },
        { id: 'sales', label: 'Sales', icon: 'ShoppingCart' },
        { id: 'pos', label: 'POS', icon: 'CreditCard' },
        { id: 'customers', label: 'Customers', icon: 'Users' },
        { id: 'analytics', label: 'Analytics', icon: 'BarChart3' },
      ],
      secondaryNav: [
        { id: 'settings', label: 'Settings', icon: 'Settings' },
      ],
    },
  },
  restaurant: {
    id: 'restaurant',
    name: 'Restaurant & Café',
    description: 'Restaurant with table management and order tracking',
    enabledModules: ['menu', 'orders', 'tables', 'kitchen', 'customers', 'analytics'],
    defaultCategories: ['Appetizers', 'Main Courses', 'Desserts', 'Beverages'],
    defaultProducts: [
      { name: 'Pasta Carbonara', sku: 'FOOD001', price: 12.99, category: 'Main Courses' },
      { name: 'Coffee', sku: 'DRINK001', price: 3.99, category: 'Beverages' },
    ],
    sidebarConfig: {
      primaryNav: [
        { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
        { id: 'menu', label: 'Menu', icon: 'UtensilsCrossed' },
        { id: 'orders', label: 'Orders', icon: 'ClipboardList' },
        { id: 'tables', label: 'Tables', icon: 'Grid' },
        { id: 'kitchen', label: 'Kitchen', icon: 'ChefHat' },
        { id: 'customers', label: 'Customers', icon: 'Users' },
        { id: 'analytics', label: 'Analytics', icon: 'BarChart3' },
      ],
      secondaryNav: [
        { id: 'settings', label: 'Settings', icon: 'Settings' },
      ],
    },
  },
  pharmacy: {
    id: 'pharmacy',
    name: 'Pharmacy',
    description: 'Pharmacy with prescription management',
    enabledModules: ['inventory', 'prescriptions', 'sales', 'pos', 'customers', 'compliance', 'analytics'],
    defaultCategories: ['Over-the-Counter', 'Prescription', 'Health & Wellness', 'Supplements'],
    defaultProducts: [
      { name: 'Multivitamin', sku: 'PHARM001', price: 9.99, category: 'Supplements' },
      { name: 'Pain Relief', sku: 'PHARM002', price: 5.99, category: 'Over-the-Counter' },
    ],
    sidebarConfig: {
      primaryNav: [
        { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
        { id: 'inventory', label: 'Inventory', icon: 'Package' },
        { id: 'prescriptions', label: 'Prescriptions', icon: 'FileText' },
        { id: 'sales', label: 'Sales', icon: 'ShoppingCart' },
        { id: 'pos', label: 'POS', icon: 'CreditCard' },
        { id: 'customers', label: 'Customers', icon: 'Users' },
        { id: 'compliance', label: 'Compliance', icon: 'ShieldCheck' },
        { id: 'analytics', label: 'Analytics', icon: 'BarChart3' },
      ],
      secondaryNav: [
        { id: 'settings', label: 'Settings', icon: 'Settings' },
      ],
    },
  },
  pet_shop: {
    id: 'pet_shop',
    name: 'Pet Shop',
    description: 'Pet store with grooming and supplies',
    enabledModules: ['inventory', 'services', 'sales', 'pos', 'customers', 'appointments', 'analytics'],
    defaultCategories: ['Pet Food', 'Supplies', 'Toys', 'Grooming Supplies'],
    defaultProducts: [
      { name: 'Dog Food', sku: 'PET001', price: 24.99, category: 'Pet Food' },
      { name: 'Toy Ball', sku: 'PET002', price: 5.99, category: 'Toys' },
    ],
    sidebarConfig: {
      primaryNav: [
        { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
        { id: 'inventory', label: 'Inventory', icon: 'Package' },
        { id: 'services', label: 'Services', icon: 'Scissors' },
        { id: 'appointments', label: 'Appointments', icon: 'Calendar' },
        { id: 'sales', label: 'Sales', icon: 'ShoppingCart' },
        { id: 'pos', label: 'POS', icon: 'CreditCard' },
        { id: 'customers', label: 'Customers', icon: 'Users' },
        { id: 'analytics', label: 'Analytics', icon: 'BarChart3' },
      ],
      secondaryNav: [
        { id: 'settings', label: 'Settings', icon: 'Settings' },
      ],
    },
  },
}

export function getBusinessTemplate(businessType: string): BusinessTemplate | null {
  // Map onboarding business type to template
  const templateMap: Record<string, string> = {
    'retail_store': 'retail_store',
    'restaurant': 'restaurant',
    'pharmacy': 'pharmacy',
  }

  const templateId = templateMap[businessType] || 'retail_store'
  return BUSINESS_TEMPLATES[templateId] || null
}

export function getTemplateByCustomCategory(customCategory: string): BusinessTemplate | null {
  // Map common custom categories to templates
  const categoryMap: Record<string, string> = {
    'pet store': 'pet_shop',
    'pet shop': 'pet_shop',
    'furniture store': 'retail_store',
    'electronics store': 'retail_store',
    'clothing store': 'retail_store',
    'bookstore': 'retail_store',
    'cafe': 'restaurant',
    'coffee shop': 'restaurant',
    'bakery': 'restaurant',
  }

  const normalized = customCategory.toLowerCase()
  const templateId = categoryMap[normalized] || 'retail_store'
  return BUSINESS_TEMPLATES[templateId] || null
}
