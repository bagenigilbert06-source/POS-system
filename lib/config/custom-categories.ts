/**
 * Custom Business Categories
 * Predefined suggestions for "Other" category selections
 * Configuration-driven for easy expansion
 */

import { BusinessTypeEnum } from '@/lib/types';

export interface CustomCategoryGroup {
  type: BusinessTypeEnum;
  suggestions: string[];
  description: string;
}

export const CUSTOM_CATEGORY_SUGGESTIONS: Record<BusinessTypeEnum, CustomCategoryGroup> = {
  [BusinessTypeEnum.RETAIL]: {
    type: BusinessTypeEnum.RETAIL,
    description: 'Other retail business',
    suggestions: [
      'Pet Store',
      'Hardware Store',
      'Furniture Store',
      'Book Store',
      'Toy Store',
      'Sports Equipment',
      'Shoe Store',
      'Jewelry Store',
      'Antique Store',
      'Office Supplies',
      'Art Supply Store',
      'Musical Instruments',
      'Garden Center',
      'Pharmacy/Drugstore',
      'Car Accessories',
      'Mobile Phone Store',
      'Computer Store',
    ],
  },
  [BusinessTypeEnum.RESTAURANT]: {
    type: BusinessTypeEnum.RESTAURANT,
    description: 'Other food service business',
    suggestions: [
      'Juice Bar',
      'Smoothie Shop',
      'Ice Cream Parlor',
      'Pizza Delivery',
      'Taco Stand',
      'Ramen House',
      'Sushi Restaurant',
      'Tapas Bar',
      'Food Truck',
      'Catering Service',
      'Cloud Kitchen',
      'Dessert Shop',
      'Bistro',
      'Diner',
      'BBQ Restaurant',
    ],
  },
  [BusinessTypeEnum.PHARMACY]: {
    type: BusinessTypeEnum.PHARMACY,
    description: 'Other pharmacy or healthcare retail',
    suggestions: [
      'Medical Clinic Pharmacy',
      'Wellness Store',
      'Supplement Shop',
      'Veterinary Pharmacy',
      'Laboratory Pharmacy',
      'Medical Supply Store',
    ],
  },
};

/**
 * Get custom category suggestions for a business type
 */
export function getCustomCategorySuggestions(businessType: BusinessTypeEnum): string[] {
  return CUSTOM_CATEGORY_SUGGESTIONS[businessType]?.suggestions || [];
}

/**
 * Get description for custom categories
 */
export function getCustomCategoryDescription(businessType: BusinessTypeEnum): string {
  return CUSTOM_CATEGORY_SUGGESTIONS[businessType]?.description || '';
}
