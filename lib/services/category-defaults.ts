/**
 * Business Category Defaults Service
 * Applies default configurations based on selected business category
 * This service configures workspaces, features, and settings automatically
 */

import {
  BusinessCategoryEnum,
  BUSINESS_CATEGORY_CONFIG,
} from '@/lib/types';

export interface CategoryDefaults {
  features: string[];
  settings: Record<string, any>;
  defaultCategories: string[];
}

/**
 * Get default configuration for a business category
 */
export function getDefaultsForCategory(
  categoryId: BusinessCategoryEnum
): CategoryDefaults {
  const config = BUSINESS_CATEGORY_CONFIG[categoryId];

  if (!config) {
    return {
      features: [],
      settings: {},
      defaultCategories: [],
    };
  }

  return {
    features: config.defaultFeatures,
    settings: config.defaultSettings,
    defaultCategories: getDefaultCategoriesForSettings(config.defaultSettings),
  };
}

/**
 * Extract default categories from settings
 */
function getDefaultCategoriesForSettings(
  settings: Record<string, any>
): string[] {
  const categories: string[] = [];

  if (settings.productCategories) {
    categories.push(...settings.productCategories);
  }

  if (settings.menuCategories) {
    categories.push(...settings.menuCategories);
  }

  if (settings.medicineCategories) {
    categories.push(...settings.medicineCategories);
  }

  return categories;
}

/**
 * Apply default configurations to an organization
 * This would typically be called after onboarding completes
 */
export async function applyDefaultConfigurations(
  organizationId: string,
  categoryId: BusinessCategoryEnum
): Promise<void> {
  const defaults = getDefaultsForCategory(categoryId);

  // This would call an API endpoint to:
  // 1. Enable default features for the organization
  // 2. Create default product/menu/medicine categories
  // 3. Apply workspace settings
  // 4. Create default workflows (e.g., kitchen queues for restaurants)

  console.log('[CategoryDefaults] Applying defaults for category:', categoryId);
  console.log('[CategoryDefaults] Features to enable:', defaults.features);
  console.log('[CategoryDefaults] Default categories:', defaults.defaultCategories);
  console.log('[CategoryDefaults] Settings:', defaults.settings);

  // TODO: Implement API call to apply defaults
  // await fetch(`/api/organizations/${organizationId}/apply-defaults`, {
  //   method: 'POST',
  //   body: JSON.stringify({ categoryId, defaults }),
  // });
}

/**
 * Get feature recommendations for a category
 */
export function getFeatureRecommendations(
  categoryId: BusinessCategoryEnum
): Record<string, { recommended: boolean; description: string }> {
  const config = BUSINESS_CATEGORY_CONFIG[categoryId];

  if (!config) return {};

  return {
    'low-stock-alerts': {
      recommended: config.defaultFeatures.includes('low-stock-alerts'),
      description: 'Get notified when stock levels are low',
    },
    'barcode-scanning': {
      recommended: config.defaultFeatures.includes('barcode-scanning'),
      description: 'Scan product barcodes for quick checkout',
    },
    'expiry-tracking': {
      recommended: config.defaultFeatures.includes('expiry-tracking'),
      description: 'Track product expiry dates',
    },
    'batch-tracking': {
      recommended: config.defaultFeatures.includes('batch-tracking'),
      description: 'Track batch numbers for inventory',
    },
    'prescription-management': {
      recommended: config.defaultFeatures.includes('prescription-management'),
      description: 'Manage customer prescriptions',
    },
    'table-management': {
      recommended: config.defaultFeatures.includes('table-management'),
      description: 'Manage restaurant tables and seating',
    },
    'kitchen-queue': {
      recommended: config.defaultFeatures.includes('kitchen-queue'),
      description: 'Manage kitchen order queue',
    },
  };
}
