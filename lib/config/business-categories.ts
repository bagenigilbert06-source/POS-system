/**
 * Business Categories Configuration
 * Maps business categories to their types and provides category selection data
 * Configuration-driven for easy extensibility
 */

import { BusinessTypeEnum, BusinessCategoryEnum, BUSINESS_CATEGORY_CONFIG } from '@/lib/types';

export interface CategoryGroup {
  type: BusinessTypeEnum;
  typeName: string;
  typeDescription: string;
  categories: Array<{
    id: BusinessCategoryEnum;
    name: string;
  }>;
}

/**
 * Get categories grouped by business type
 */
export function getCategoryGroupsByType(): Record<BusinessTypeEnum, CategoryGroup> {
  const groups: Record<BusinessTypeEnum, CategoryGroup> = {
    [BusinessTypeEnum.RETAIL]: {
      type: BusinessTypeEnum.RETAIL,
      typeName: 'Retail Store',
      typeDescription: 'Sell physical products with inventory, barcode scanning, suppliers, customers, reporting and fast checkout.',
      categories: [
        { id: BusinessCategoryEnum.SUPERMARKET, name: 'Supermarket' },
        { id: BusinessCategoryEnum.GROCERY_STORE, name: 'Grocery Store' },
        { id: BusinessCategoryEnum.ELECTRONICS_STORE, name: 'Electronics Store' },
        { id: BusinessCategoryEnum.CLOTHING_STORE, name: 'Clothing Store' },
        { id: BusinessCategoryEnum.BOUTIQUE, name: 'Boutique' },
        { id: BusinessCategoryEnum.GIFT_SHOP, name: 'Gift Shop' },
        { id: BusinessCategoryEnum.COSMETICS_STORE, name: 'Cosmetics Store' },
        { id: BusinessCategoryEnum.CONVENIENCE_STORE, name: 'Convenience Store' },
        { id: BusinessCategoryEnum.OTHER_RETAIL, name: 'Other Retail' },
      ],
    },
    [BusinessTypeEnum.RESTAURANT]: {
      type: BusinessTypeEnum.RESTAURANT,
      typeName: 'Restaurant & Café',
      typeDescription: 'Manage tables, kitchen orders, menus, waiters, food inventory and restaurant operations.',
      categories: [
        { id: BusinessCategoryEnum.RESTAURANT, name: 'Restaurant' },
        { id: BusinessCategoryEnum.CAFE, name: 'Café' },
        { id: BusinessCategoryEnum.FAST_FOOD, name: 'Fast Food' },
        { id: BusinessCategoryEnum.BAKERY, name: 'Bakery' },
        { id: BusinessCategoryEnum.BAR_LOUNGE, name: 'Bar / Lounge' },
        { id: BusinessCategoryEnum.COFFEE_SHOP, name: 'Coffee Shop' },
        { id: BusinessCategoryEnum.OTHER_RESTAURANT, name: 'Other Restaurant' },
      ],
    },
    [BusinessTypeEnum.PHARMACY]: {
      type: BusinessTypeEnum.PHARMACY,
      typeName: 'Pharmacy',
      typeDescription: 'Manage medicines, prescriptions, batches, expiry dates and pharmacy inventory.',
      categories: [
        { id: BusinessCategoryEnum.COMMUNITY_PHARMACY, name: 'Community Pharmacy' },
        { id: BusinessCategoryEnum.HOSPITAL_PHARMACY, name: 'Hospital Pharmacy' },
        { id: BusinessCategoryEnum.CHEMIST, name: 'Chemist' },
        { id: BusinessCategoryEnum.OTHER_PHARMACY, name: 'Other Pharmacy' },
      ],
    },
  };

  return groups;
}

/**
 * Get categories for a specific business type
 */
export function getCategoriesForType(businessType: BusinessTypeEnum): CategoryGroup['categories'] {
  const groups = getCategoryGroupsByType();
  return groups[businessType]?.categories || [];
}

/**
 * Get category name by ID
 */
export function getCategoryName(categoryId: BusinessCategoryEnum): string {
  const config = BUSINESS_CATEGORY_CONFIG[categoryId];
  return config?.name || 'Unknown';
}

/**
 * Get the business type for a category
 */
export function getBusinessTypeForCategory(categoryId: BusinessCategoryEnum): BusinessTypeEnum | null {
  const config = BUSINESS_CATEGORY_CONFIG[categoryId];
  return config?.type || null;
}

/**
 * Validate that a category belongs to a business type
 */
export function isCategoryValidForType(
  businessType: BusinessTypeEnum,
  categoryId: BusinessCategoryEnum
): boolean {
  const categoryType = getBusinessTypeForCategory(categoryId);
  return categoryType === businessType;
}
