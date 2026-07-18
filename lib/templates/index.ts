/**
 * lib/templates/index.ts — Template Registry
 *
 * Design rules enforced here:
 *  1. Primary key is the dot-namespaced templateId ("retail.supermarket"), not businessCategory.
 *  2. Categories belong strictly to one businessType — cross-type lookups return a fallback.
 *  3. Adding a new category = create one folder, add one REGISTRY entry, add one CATEGORY_MAP entry.
 *  4. No dashboard modifications, no new routes, no new components — ever.
 */

export type {
  WorkspaceTemplate,
  StarterCategory,
  StarterProduct,
  QuickAction,
  DashboardWidget,
  GettingStartedTask,
  NavigationConfig,
  NavItem,
  WorkspaceSettings,
  PermissionsConfig,
  RolePermissions,
  ReportDefinition,
  FeatureFlag,
} from './types'

// ── Retail ───────────────────────────────────────────────────────────────────
import { supermarketTemplate }    from './retail/supermarket'
import { groceryTemplate }        from './retail/grocery'
import { electronicsTemplate }    from './retail/electronics'
import { clothingTemplate }       from './retail/clothing'
import { cosmeticsTemplate }      from './retail/cosmetics'
import { hardwareTemplate }       from './retail/hardware'
import { petShopTemplate }        from './retail/pet-shop'
import { furnitureTemplate }      from './retail/furniture'
import { generalRetailTemplate }  from './retail/general'

// ── Restaurant ───────────────────────────────────────────────────────────────
import { restaurantTemplate }         from './restaurant/restaurant'
import { cafeTemplate }               from './restaurant/cafe'
import { fastFoodTemplate }           from './restaurant/fast-food'
import { bakeryTemplate }             from './restaurant/bakery'
import { coffeeShopTemplate }         from './restaurant/coffee-shop'
import { generalRestaurantTemplate }  from './restaurant/general'

// ── Pharmacy ─────────────────────────────────────────────────────────────────
import { communityPharmacyTemplate }  from './pharmacy/community'
import { hospitalPharmacyTemplate }   from './pharmacy/hospital'
import { wholesalePharmacyTemplate }  from './pharmacy/wholesale'
import { generalPharmacyTemplate }    from './pharmacy/general'

import type { WorkspaceTemplate } from './types'

// ---------------------------------------------------------------------------
// 1. Primary registry — keyed by stable templateId
// ---------------------------------------------------------------------------

const REGISTRY: Record<string, WorkspaceTemplate> = {
  // Retail
  'retail.supermarket':   supermarketTemplate,
  'retail.grocery':       groceryTemplate,
  'retail.electronics':   electronicsTemplate,
  'retail.clothing':      clothingTemplate,
  'retail.cosmetics':     cosmeticsTemplate,
  'retail.hardware':      hardwareTemplate,
  'retail.pet-shop':      petShopTemplate,
  'retail.furniture':     furnitureTemplate,
  'retail.general':       generalRetailTemplate,

  // Restaurant
  'restaurant.restaurant':  restaurantTemplate,
  'restaurant.cafe':        cafeTemplate,
  'restaurant.fast-food':   fastFoodTemplate,
  'restaurant.bakery':      bakeryTemplate,
  'restaurant.coffee-shop': coffeeShopTemplate,
  'restaurant.general':     generalRestaurantTemplate,

  // Pharmacy
  'pharmacy.community':   communityPharmacyTemplate,
  'pharmacy.hospital':    hospitalPharmacyTemplate,
  'pharmacy.wholesale':   wholesalePharmacyTemplate,
  'pharmacy.general':     generalPharmacyTemplate,
}

// ---------------------------------------------------------------------------
// 2. Category map — businessCategory value → templateId
//    Categories are strictly scoped to their parent businessType.
//    A category from one type can never match a template from another.
// ---------------------------------------------------------------------------

type BusinessType = 'retail' | 'restaurant' | 'pharmacy'

/**
 * CategoryMapEntry binds a businessCategory string to a templateId AND
 * declares which businessType it belongs to.  The type field enables the
 * registry to reject cross-type lookups at runtime.
 */
interface CategoryMapEntry {
  templateId: string
  businessType: BusinessType
}

const CATEGORY_MAP: Record<string, CategoryMapEntry> = {
  // ── Retail ──────────────────────────────────────────────────────────────
  supermarket:        { templateId: 'retail.supermarket',   businessType: 'retail' },
  grocery_store:      { templateId: 'retail.grocery',       businessType: 'retail' },
  electronics_store:  { templateId: 'retail.electronics',   businessType: 'retail' },
  clothing_store:     { templateId: 'retail.clothing',      businessType: 'retail' },
  boutique:           { templateId: 'retail.clothing',      businessType: 'retail' },
  cosmetics_store:    { templateId: 'retail.cosmetics',     businessType: 'retail' },
  hardware_store:     { templateId: 'retail.hardware',      businessType: 'retail' },
  pet_shop:           { templateId: 'retail.pet-shop',      businessType: 'retail' },
  furniture_store:    { templateId: 'retail.furniture',     businessType: 'retail' },
  gift_shop:          { templateId: 'retail.general',       businessType: 'retail' },
  convenience_store:  { templateId: 'retail.grocery',       businessType: 'retail' },
  other_retail:       { templateId: 'retail.general',       businessType: 'retail' },

  // ── Restaurant ───────────────────────────────────────────────────────────
  restaurant:         { templateId: 'restaurant.restaurant',   businessType: 'restaurant' },
  cafe:               { templateId: 'restaurant.cafe',         businessType: 'restaurant' },
  fast_food:          { templateId: 'restaurant.fast-food',    businessType: 'restaurant' },
  bakery:             { templateId: 'restaurant.bakery',       businessType: 'restaurant' },
  coffee_shop:        { templateId: 'restaurant.coffee-shop',  businessType: 'restaurant' },
  bar_lounge:         { templateId: 'restaurant.restaurant',   businessType: 'restaurant' },
  other_restaurant:   { templateId: 'restaurant.general',      businessType: 'restaurant' },

  // ── Pharmacy ─────────────────────────────────────────────────────────────
  community_pharmacy: { templateId: 'pharmacy.community',   businessType: 'pharmacy' },
  hospital_pharmacy:  { templateId: 'pharmacy.hospital',    businessType: 'pharmacy' },
  chemist:            { templateId: 'pharmacy.community',   businessType: 'pharmacy' },
  wholesale_pharmacy: { templateId: 'pharmacy.wholesale',   businessType: 'pharmacy' },
  other_pharmacy:     { templateId: 'pharmacy.general',     businessType: 'pharmacy' },
}

// ---------------------------------------------------------------------------
// 3. Fallbacks per business type — used when no category match is found
// ---------------------------------------------------------------------------

const TYPE_FALLBACK: Record<BusinessType, WorkspaceTemplate> = {
  retail:     generalRetailTemplate,
  restaurant: generalRestaurantTemplate,
  pharmacy:   generalPharmacyTemplate,
}

// ---------------------------------------------------------------------------
// 4. Public API
// ---------------------------------------------------------------------------

/**
 * Primary lookup — resolve a template by its stable dot-namespaced templateId.
 * e.g. getWorkspaceTemplate('retail.supermarket')
 */
export function getWorkspaceTemplate(templateId: string): WorkspaceTemplate {
  return REGISTRY[templateId] ?? generalRetailTemplate
}

/**
 * Resolve a templateId from businessType + businessCategory.
 *
 * - Enforces strict type-to-category ownership: if the category exists but
 *   belongs to a different businessType, the type's fallback is returned.
 * - Falls back gracefully if the category is unknown.
 */
export function resolveTemplateId(
  businessType: string,
  businessCategory: string
): string {
  const normalType = businessType.toLowerCase() as BusinessType
  const normalCategory = businessCategory.toLowerCase()

  const entry = CATEGORY_MAP[normalCategory]

  // Unknown category → use type fallback
  if (!entry) {
    return TYPE_FALLBACK[normalType]?.id ?? 'retail.general'
  }

  // Category belongs to a different type → use type fallback (security guard)
  if (entry.businessType !== normalType) {
    return TYPE_FALLBACK[normalType]?.id ?? 'retail.general'
  }

  return entry.templateId
}

/**
 * Convenience: resolve template directly from businessType + businessCategory.
 */
export function resolveTemplate(
  businessType: string,
  businessCategory: string
): WorkspaceTemplate {
  const templateId = resolveTemplateId(businessType, businessCategory)
  return getWorkspaceTemplate(templateId)
}

/** Maps the current onboarding taxonomy to a supported template. */
export function resolveOnboardingTemplateId(businessFamily: string, businessCategory: string): string {
  const category = businessCategory.toLowerCase()
  if (businessFamily === 'retail') {
    if (category === 'supermarket') return 'retail.supermarket'
    if (['general_shop', 'mini_mart', 'liquor_shop'].includes(category)) return 'retail.grocery'
    if (category === 'hardware') return 'retail.hardware'
    if (category === 'electronics') return 'retail.electronics'
    if (category === 'clothing') return 'retail.clothing'
    if (category === 'cosmetics') return 'retail.cosmetics'
    return 'retail.general'
  }
  if (businessFamily === 'food_hospitality') {
    if (category === 'cafe') return 'restaurant.cafe'
    if (category === 'bakery') return 'restaurant.bakery'
    if (category === 'fast_food') return 'restaurant.fast-food'
    return 'restaurant.general'
  }
  if (businessFamily === 'health_wellness' && ['retail_pharmacy', 'health_pharmacy'].includes(category)) return 'pharmacy.community'
  return 'retail.general'
}

/**
 * Get all categories that belong to a given businessType, ordered as they
 * should appear in the onboarding UI.  "Other" always appears last.
 */
export function getCategoriesForBusinessType(businessType: string): Array<{ id: string; templateId: string }> {
  const normalType = businessType.toLowerCase()
  return Object.entries(CATEGORY_MAP)
    .filter(([, entry]) => entry.businessType === normalType)
    .map(([categoryId, entry]) => ({ id: categoryId, templateId: entry.templateId }))
}

/**
 * Validate that a businessCategory belongs to a given businessType.
 * Prevents a user-submitted category from being applied to the wrong type.
 */
export function isCategoryValidForType(businessType: string, businessCategory: string): boolean {
  const entry = CATEGORY_MAP[businessCategory.toLowerCase()]
  if (!entry) return false
  return entry.businessType === businessType.toLowerCase()
}

/**
 * All templates for a given businessType — useful for admin/reporting tools.
 */
export function getTemplatesForBusinessType(businessType: string): WorkspaceTemplate[] {
  const normalType = businessType.toLowerCase()
  return Object.values(REGISTRY).filter((t) => t.businessType === normalType)
}

/**
 * The dashboard route for each business type.
 * This is the only place that should define this mapping.
 */
export const DASHBOARD_ROUTES: Record<string, string> = {
  retail: '/dashboard',
  restaurant: '/dashboard',
  pharmacy: '/dashboard',
}

export function getDashboardRoute(businessType: string): string {
  return DASHBOARD_ROUTES[businessType.toLowerCase()] ?? '/dashboard'
}
