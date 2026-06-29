/**
 * Business Type Definitions
 * Define all supported business types and their metadata
 */

export enum BusinessTypeEnum {
  RETAIL = 'retail',
  RESTAURANT = 'restaurant',
  PHARMACY = 'pharmacy',
}

export type BusinessType = keyof typeof BusinessTypeEnum;

export interface BusinessTypeMetadata {
  id: BusinessTypeEnum;
  name: string;
  description: string;
  icon: string;
  color: string;
  modules: string[];
  features: string[];
}

export const BUSINESS_TYPE_METADATA: Record<BusinessTypeEnum, BusinessTypeMetadata> = {
  [BusinessTypeEnum.RETAIL]: {
    id: BusinessTypeEnum.RETAIL,
    name: 'Retail Store',
    description: 'Product-based retail business with inventory management',
    icon: 'ShoppingCart',
    color: '#3B82F6',
    modules: ['inventory', 'sales', 'products', 'customers', 'reports', 'analytics'],
    features: ['low-stock-alerts', 'barcode-scanning', 'loyalty-points', 'inventory-transfer'],
  },
  [BusinessTypeEnum.RESTAURANT]: {
    id: BusinessTypeEnum.RESTAURANT,
    name: 'Restaurant & Café',
    description: 'Food and beverage service with table management',
    icon: 'UtensilsCrossed',
    color: '#F59E0B',
    modules: ['kitchen', 'tables', 'orders', 'inventory', 'sales', 'customers', 'reports', 'analytics'],
    features: ['table-management', 'kitchen-queue', 'menu-categories', 'order-modifications', 'staff-management'],
  },
  [BusinessTypeEnum.PHARMACY]: {
    id: BusinessTypeEnum.PHARMACY,
    name: 'Pharmacy',
    description: 'Pharmaceutical retail with prescription tracking',
    icon: 'Pill',
    color: '#10B981',
    modules: ['prescriptions', 'inventory', 'batch-tracking', 'sales', 'products', 'customers', 'reports', 'analytics'],
    features: ['expiry-tracking', 'batch-numbers', 'prescription-management', 'drug-interactions', 'low-stock-alerts'],
  },
};

export const BUSINESS_TYPES = Object.values(BUSINESS_TYPE_METADATA);
