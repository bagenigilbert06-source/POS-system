/**
 * Template Registry
 *
 * Maps every businessCategory value (stored on the organization row) to a
 * WorkspaceTemplate.  This is the ONLY place that knows about the mapping;
 * all consumers call getWorkspaceTemplate(templateId) and render from config.
 *
 * Adding a new category = create a template file + add one entry here.
 */

export type { WorkspaceTemplate, StarterCategory, StarterProduct, QuickAction, DashboardWidget, GettingStartedTask } from './types'

// ── Retail ──────────────────────────────────────────────────────────────────
import { supermarketTemplate } from './retail/supermarket'
import { groceryTemplate } from './retail/grocery'
import { electronicsTemplate } from './retail/electronics'
import { clothingTemplate } from './retail/clothing'
import { cosmeticsTemplate } from './retail/cosmetics'
import { generalRetailTemplate } from './retail/general'

// ── Restaurant ───────────────────────────────────────────────────────────────
import { restaurantTemplate } from './restaurant/restaurant'
import { cafeTemplate } from './restaurant/cafe'
import { fastFoodTemplate } from './restaurant/fast-food'
import { bakeryTemplate } from './restaurant/bakery'
import { generalRestaurantTemplate } from './restaurant/general'

// ── Pharmacy ─────────────────────────────────────────────────────────────────
import { communityPharmacyTemplate } from './pharmacy/community'
import { hospitalPharmacyTemplate } from './pharmacy/hospital'
import { generalPharmacyTemplate } from './pharmacy/general'

import type { WorkspaceTemplate } from './types'

/**
 * Registry keyed by the value stored in organization.businessCategory
 * (which matches BusinessCategoryEnum values from lib/types/business.ts).
 *
 * Each entry is: businessCategory → templateId → WorkspaceTemplate
 */
const TEMPLATE_REGISTRY: Record<string, WorkspaceTemplate> = {
  // ── Retail ──────────────────────────────────────────────────────────────
  supermarket: supermarketTemplate,
  grocery_store: groceryTemplate,
  electronics_store: electronicsTemplate,
  clothing_store: clothingTemplate,
  boutique: clothingTemplate,          // Boutique shares clothing defaults
  gift_shop: generalRetailTemplate,
  cosmetics_store: cosmeticsTemplate,
  convenience_store: groceryTemplate,  // Convenience store shares grocery defaults
  other_retail: generalRetailTemplate,

  // ── Restaurant ───────────────────────────────────────────────────────────
  restaurant: restaurantTemplate,
  cafe: cafeTemplate,
  fast_food: fastFoodTemplate,
  bakery: bakeryTemplate,
  bar_lounge: restaurantTemplate,      // Bar/Lounge shares restaurant defaults
  coffee_shop: cafeTemplate,           // Coffee shop shares café defaults
  other_restaurant: generalRestaurantTemplate,

  // ── Pharmacy ─────────────────────────────────────────────────────────────
  community_pharmacy: communityPharmacyTemplate,
  hospital_pharmacy: hospitalPharmacyTemplate,
  chemist: communityPharmacyTemplate,  // Chemist shares community pharmacy defaults
  other_pharmacy: generalPharmacyTemplate,
}

/**
 * Look up a template by the businessCategory value.
 * Falls back to the appropriate general template by businessType if not found.
 */
export function getWorkspaceTemplate(
  businessCategory: string,
  businessType?: string
): WorkspaceTemplate {
  const found = TEMPLATE_REGISTRY[businessCategory]
  if (found) return found

  // Fallback by businessType
  if (businessType === 'restaurant') return generalRestaurantTemplate
  if (businessType === 'pharmacy') return generalPharmacyTemplate
  return generalRetailTemplate
}

/**
 * Look up a template by its dot-namespaced templateId,
 * e.g. "retail.supermarket".  Used when loading workspace config.
 */
export function getWorkspaceTemplateById(templateId: string): WorkspaceTemplate | null {
  return Object.values(TEMPLATE_REGISTRY).find((t) => t.id === templateId) ?? null
}

/**
 * Get all templates for a given businessType.
 */
export function getTemplatesForBusinessType(businessType: string): WorkspaceTemplate[] {
  return Object.values(TEMPLATE_REGISTRY).filter((t) => t.businessType === businessType)
}

/**
 * The dashboard route for each business type.
 * This is the ONLY place that should define this mapping.
 */
export const DASHBOARD_ROUTES: Record<string, string> = {
  retail: '/dashboard/retail',
  restaurant: '/dashboard/restaurant',
  pharmacy: '/dashboard/pharmacy',
}

export function getDashboardRoute(businessType: string): string {
  return DASHBOARD_ROUTES[businessType] ?? '/dashboard/retail'
}
