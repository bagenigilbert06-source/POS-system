/**
 * Business Type Definitions
 * Define all supported business types and their metadata
 * Supports scalable category system for future expansion
 */

export enum BusinessTypeEnum {
  RETAIL = 'retail',
  RESTAURANT = 'restaurant',
  PHARMACY = 'pharmacy',
}

export enum BusinessCategoryEnum {
  // Retail
  SUPERMARKET = 'supermarket',
  GROCERY_STORE = 'grocery_store',
  ELECTRONICS_STORE = 'electronics_store',
  CLOTHING_STORE = 'clothing_store',
  BOUTIQUE = 'boutique',
  GIFT_SHOP = 'gift_shop',
  COSMETICS_STORE = 'cosmetics_store',
  CONVENIENCE_STORE = 'convenience_store',
  OTHER_RETAIL = 'other_retail',

  // Restaurant
  RESTAURANT = 'restaurant',
  CAFE = 'cafe',
  FAST_FOOD = 'fast_food',
  BAKERY = 'bakery',
  BAR_LOUNGE = 'bar_lounge',
  COFFEE_SHOP = 'coffee_shop',
  OTHER_RESTAURANT = 'other_restaurant',

  // Pharmacy
  COMMUNITY_PHARMACY = 'community_pharmacy',
  HOSPITAL_PHARMACY = 'hospital_pharmacy',
  CHEMIST = 'chemist',
  OTHER_PHARMACY = 'other_pharmacy',
}

export type BusinessType = keyof typeof BusinessTypeEnum;
export type BusinessCategory = keyof typeof BusinessCategoryEnum;

export interface BusinessTypeMetadata {
  id: BusinessTypeEnum;
  name: string;
  description: string;
  icon: string;
  color: string;
  modules: string[];
  features: string[];
}

export interface BusinessCategoryConfig {
  id: BusinessCategoryEnum;
  name: string;
  type: BusinessTypeEnum;
  defaultFeatures: string[];
  defaultSettings: Record<string, any>;
}

export const BUSINESS_TYPE_METADATA: Record<BusinessTypeEnum, BusinessTypeMetadata> = {
  [BusinessTypeEnum.RETAIL]: {
    id: BusinessTypeEnum.RETAIL,
    name: 'Retail Store',
    description: 'Sell physical products with inventory, barcode scanning, suppliers, customers, reporting and fast checkout.',
    icon: 'ShoppingCart',
    color: '#3B82F6',
    modules: ['inventory', 'sales', 'products', 'customers', 'reports', 'analytics'],
    features: ['low-stock-alerts', 'barcode-scanning', 'loyalty-points', 'inventory-transfer'],
  },
  [BusinessTypeEnum.RESTAURANT]: {
    id: BusinessTypeEnum.RESTAURANT,
    name: 'Restaurant & Café',
    description: 'Manage tables, kitchen orders, menus, waiters, food inventory and restaurant operations.',
    icon: 'UtensilsCrossed',
    color: '#F59E0B',
    modules: ['kitchen', 'tables', 'orders', 'inventory', 'sales', 'customers', 'reports', 'analytics'],
    features: ['table-management', 'kitchen-queue', 'menu-categories', 'order-modifications', 'staff-management'],
  },
  [BusinessTypeEnum.PHARMACY]: {
    id: BusinessTypeEnum.PHARMACY,
    name: 'Pharmacy',
    description: 'Manage medicines, prescriptions, batches, expiry dates and pharmacy inventory.',
    icon: 'Pill',
    color: '#10B981',
    modules: ['prescriptions', 'inventory', 'batch-tracking', 'sales', 'products', 'customers', 'reports', 'analytics'],
    features: ['expiry-tracking', 'batch-numbers', 'prescription-management', 'drug-interactions', 'low-stock-alerts'],
  },
};

/**
 * Business Category Configurations
 * Each category inherits from its business type but can have specific defaults
 */
export const BUSINESS_CATEGORY_CONFIG: Record<BusinessCategoryEnum, BusinessCategoryConfig> = {
  // Retail Categories
  [BusinessCategoryEnum.SUPERMARKET]: {
    id: BusinessCategoryEnum.SUPERMARKET,
    name: 'Supermarket',
    type: BusinessTypeEnum.RETAIL,
    defaultFeatures: ['barcode-scanning', 'expiry-tracking', 'loyalty-points'],
    defaultSettings: { productCategories: ['groceries', 'household', 'personal-care'], enableExpiryTracking: true },
  },
  [BusinessCategoryEnum.GROCERY_STORE]: {
    id: BusinessCategoryEnum.GROCERY_STORE,
    name: 'Grocery Store',
    type: BusinessTypeEnum.RETAIL,
    defaultFeatures: ['barcode-scanning', 'expiry-tracking'],
    defaultSettings: { productCategories: ['groceries', 'produce'], enableExpiryTracking: true },
  },
  [BusinessCategoryEnum.ELECTRONICS_STORE]: {
    id: BusinessCategoryEnum.ELECTRONICS_STORE,
    name: 'Electronics Store',
    type: BusinessTypeEnum.RETAIL,
    defaultFeatures: ['barcode-scanning', 'serial-numbers', 'warranty-tracking'],
    defaultSettings: { productCategories: ['electronics', 'accessories'], enableSerialNumbers: true },
  },
  [BusinessCategoryEnum.CLOTHING_STORE]: {
    id: BusinessCategoryEnum.CLOTHING_STORE,
    name: 'Clothing Store',
    type: BusinessTypeEnum.RETAIL,
    defaultFeatures: ['product-variants', 'size-attributes', 'color-attributes'],
    defaultSettings: { productCategories: ['mens', 'womens', 'kids'], enableVariants: true },
  },
  [BusinessCategoryEnum.BOUTIQUE]: {
    id: BusinessCategoryEnum.BOUTIQUE,
    name: 'Boutique',
    type: BusinessTypeEnum.RETAIL,
    defaultFeatures: ['product-variants'],
    defaultSettings: { productCategories: ['premium', 'collections'] },
  },
  [BusinessCategoryEnum.GIFT_SHOP]: {
    id: BusinessCategoryEnum.GIFT_SHOP,
    name: 'Gift Shop',
    type: BusinessTypeEnum.RETAIL,
    defaultFeatures: ['gift-wrapping', 'custom-messages'],
    defaultSettings: { productCategories: ['gifts', 'occasions'] },
  },
  [BusinessCategoryEnum.COSMETICS_STORE]: {
    id: BusinessCategoryEnum.COSMETICS_STORE,
    name: 'Cosmetics Store',
    type: BusinessTypeEnum.RETAIL,
    defaultFeatures: ['expiry-tracking'],
    defaultSettings: { productCategories: ['skincare', 'makeup', 'fragrances'], enableExpiryTracking: true },
  },
  [BusinessCategoryEnum.CONVENIENCE_STORE]: {
    id: BusinessCategoryEnum.CONVENIENCE_STORE,
    name: 'Convenience Store',
    type: BusinessTypeEnum.RETAIL,
    defaultFeatures: ['quick-checkout', 'barcode-scanning'],
    defaultSettings: { productCategories: ['beverages', 'snacks', 'daily-essentials'] },
  },
  [BusinessCategoryEnum.OTHER_RETAIL]: {
    id: BusinessCategoryEnum.OTHER_RETAIL,
    name: 'Other Retail',
    type: BusinessTypeEnum.RETAIL,
    defaultFeatures: [],
    defaultSettings: { productCategories: [] },
  },

  // Restaurant Categories
  [BusinessCategoryEnum.RESTAURANT]: {
    id: BusinessCategoryEnum.RESTAURANT,
    name: 'Restaurant',
    type: BusinessTypeEnum.RESTAURANT,
    defaultFeatures: ['table-management', 'kitchen-queue', 'reservations'],
    defaultSettings: { menuCategories: ['appetizers', 'mains', 'desserts', 'beverages'], enableReservations: true },
  },
  [BusinessCategoryEnum.CAFE]: {
    id: BusinessCategoryEnum.CAFE,
    name: 'Café',
    type: BusinessTypeEnum.RESTAURANT,
    defaultFeatures: ['table-management', 'quick-service'],
    defaultSettings: { menuCategories: ['coffee', 'beverages', 'pastries', 'snacks'] },
  },
  [BusinessCategoryEnum.FAST_FOOD]: {
    id: BusinessCategoryEnum.FAST_FOOD,
    name: 'Fast Food',
    type: BusinessTypeEnum.RESTAURANT,
    defaultFeatures: ['quick-checkout', 'kitchen-queue', 'order-tracking'],
    defaultSettings: { menuCategories: ['burgers', 'sandwiches', 'sides', 'beverages'], enableQuickService: true },
  },
  [BusinessCategoryEnum.BAKERY]: {
    id: BusinessCategoryEnum.BAKERY,
    name: 'Bakery',
    type: BusinessTypeEnum.RESTAURANT,
    defaultFeatures: ['expiry-tracking', 'batch-production'],
    defaultSettings: { menuCategories: ['breads', 'pastries', 'cakes', 'specialty-items'], enableBatchTracking: true },
  },
  [BusinessCategoryEnum.BAR_LOUNGE]: {
    id: BusinessCategoryEnum.BAR_LOUNGE,
    name: 'Bar / Lounge',
    type: BusinessTypeEnum.RESTAURANT,
    defaultFeatures: ['inventory-tracking', 'table-management'],
    defaultSettings: { menuCategories: ['spirits', 'wines', 'beers', 'non-alcoholic'], enableInventoryTracking: true },
  },
  [BusinessCategoryEnum.COFFEE_SHOP]: {
    id: BusinessCategoryEnum.COFFEE_SHOP,
    name: 'Coffee Shop',
    type: BusinessTypeEnum.RESTAURANT,
    defaultFeatures: ['quick-service'],
    defaultSettings: { menuCategories: ['coffee', 'tea', 'pastries', 'light-meals'] },
  },
  [BusinessCategoryEnum.OTHER_RESTAURANT]: {
    id: BusinessCategoryEnum.OTHER_RESTAURANT,
    name: 'Other Restaurant',
    type: BusinessTypeEnum.RESTAURANT,
    defaultFeatures: [],
    defaultSettings: { menuCategories: [] },
  },

  // Pharmacy Categories
  [BusinessCategoryEnum.COMMUNITY_PHARMACY]: {
    id: BusinessCategoryEnum.COMMUNITY_PHARMACY,
    name: 'Community Pharmacy',
    type: BusinessTypeEnum.PHARMACY,
    defaultFeatures: ['prescription-management', 'expiry-tracking', 'batch-tracking'],
    defaultSettings: { medicineCategories: ['prescription', 'otc', 'supplements'], enablePrescriptionTracking: true },
  },
  [BusinessCategoryEnum.HOSPITAL_PHARMACY]: {
    id: BusinessCategoryEnum.HOSPITAL_PHARMACY,
    name: 'Hospital Pharmacy',
    type: BusinessTypeEnum.PHARMACY,
    defaultFeatures: ['batch-tracking', 'expiry-tracking', 'ward-distribution'],
    defaultSettings: { medicineCategories: ['inpatient', 'outpatient', 'emergency'], enableWardTracking: true },
  },
  [BusinessCategoryEnum.CHEMIST]: {
    id: BusinessCategoryEnum.CHEMIST,
    name: 'Chemist',
    type: BusinessTypeEnum.PHARMACY,
    defaultFeatures: ['prescription-management', 'expiry-tracking'],
    defaultSettings: { medicineCategories: ['prescription', 'otc'], enablePrescriptionTracking: true },
  },
  [BusinessCategoryEnum.OTHER_PHARMACY]: {
    id: BusinessCategoryEnum.OTHER_PHARMACY,
    name: 'Other Pharmacy',
    type: BusinessTypeEnum.PHARMACY,
    defaultFeatures: [],
    defaultSettings: {},
  },
};

export const BUSINESS_TYPES = Object.values(BUSINESS_TYPE_METADATA);

/**
 * Get categories for a specific business type
 */
export function getCategoriesForType(businessType: BusinessTypeEnum): BusinessCategoryConfig[] {
  return Object.values(BUSINESS_CATEGORY_CONFIG).filter((cat) => cat.type === businessType);
}
