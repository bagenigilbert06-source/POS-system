# Two-Step Business Selection Onboarding System

## Overview

The IMARA POS onboarding system now implements a scalable, configuration-driven two-step business selection process:

1. **Step 1: Business Type** - Users select between Retail, Restaurant, or Pharmacy
2. **Step 2: Business Category** - Users select a specific category within their chosen type

This architecture enables easy addition of new business types and categories without code changes.

## Architecture

### Key Files

- `lib/types/business.ts` - Business type and category enums, metadata, and configuration
- `lib/config/business-categories.ts` - Category grouping and selection configuration
- `lib/services/category-defaults.ts` - Default configurations per category
- `components/onboarding/step-business-type.tsx` - Step 1: Business type selector (3 cards)
- `components/onboarding/step-business-category.tsx` - Step 2: Category selector (dynamic list)
- `components/onboarding/onboarding-container.tsx` - Main orchestrator
- `lib/db/schema.ts` - Database schema with `businessCategory` field

### Data Flow

```
User Signs Up
    ↓
Step 1: Select Business Type (retail, restaurant, pharmacy)
    ↓
Step 2: Select Business Category (dynamically populated based on type)
    ↓
Step 3-7: Business details, location, size, setup, welcome
    ↓
Store: businessType + businessCategory in organization record
    ↓
Apply default configurations based on category
    ↓
Redirect to business-type-specific dashboard
```

## Business Types & Categories

### Retail Store

Categories:
- Supermarket
- Grocery Store
- Electronics Store
- Clothing Store
- Boutique
- Gift Shop
- Cosmetics Store
- Convenience Store
- Other Retail

**Dashboard Route:** `/dashboard/retail`

### Restaurant & Café

Categories:
- Restaurant
- Café
- Fast Food
- Bakery
- Bar / Lounge
- Coffee Shop
- Other Restaurant

**Dashboard Route:** `/dashboard/restaurant`

### Pharmacy

Categories:
- Community Pharmacy
- Hospital Pharmacy
- Chemist
- Other Pharmacy

**Dashboard Route:** `/dashboard/pharmacy`

## Configuration System

### Adding a New Business Type

1. Add to `BusinessTypeEnum` in `lib/types/business.ts`:
   ```typescript
   export enum BusinessTypeEnum {
     // ... existing
     HARDWARE = 'hardware',
   }
   ```

2. Add metadata to `BUSINESS_TYPE_METADATA`:
   ```typescript
   [BusinessTypeEnum.HARDWARE]: {
     id: BusinessTypeEnum.HARDWARE,
     name: 'Hardware Store',
     description: '...',
     icon: 'Wrench',
     color: '#EF4444',
     modules: ['inventory', 'sales', 'products', 'customers', 'reports'],
     features: ['serial-numbers', 'warranty-tracking'],
   }
   ```

3. Add categories to `BusinessCategoryEnum` and `BUSINESS_CATEGORY_CONFIG`:
   ```typescript
   export enum BusinessCategoryEnum {
     // ... existing
     HARDWARE_STORE = 'hardware_store',
     AUTO_PARTS = 'auto_parts',
   }
   
   [BusinessCategoryEnum.HARDWARE_STORE]: {
     id: BusinessCategoryEnum.HARDWARE_STORE,
     name: 'Hardware Store',
     type: BusinessTypeEnum.HARDWARE,
     defaultFeatures: ['serial-numbers'],
     defaultSettings: { productCategories: ['tools', 'materials'] },
   }
   ```

4. Update `getCategoryGroupsByType()` in `lib/config/business-categories.ts` to include the new categories.

### Adding a New Category to Existing Type

1. Add enum value to `BusinessCategoryEnum` in `lib/types/business.ts`

2. Add configuration to `BUSINESS_CATEGORY_CONFIG` in `lib/types/business.ts`

3. Update `getCategoryGroupsByType()` in `lib/config/business-categories.ts`

That's it! The UI will automatically display the new category.

## Default Configurations

Each category can define default features and settings that are applied after onboarding:

```typescript
[BusinessCategoryEnum.SUPERMARKET]: {
  id: BusinessCategoryEnum.SUPERMARKET,
  name: 'Supermarket',
  type: BusinessTypeEnum.RETAIL,
  defaultFeatures: ['barcode-scanning', 'expiry-tracking', 'loyalty-points'],
  defaultSettings: { 
    productCategories: ['groceries', 'household', 'personal-care'],
    enableExpiryTracking: true 
  },
}
```

### Applying Defaults

After onboarding completes, call `applyDefaultConfigurations()`:

```typescript
import { applyDefaultConfigurations } from '@/lib/services/category-defaults';

// In onboarding completion handler
await applyDefaultConfigurations(organizationId, selectedCategory);
```

This function:
1. Enables default features for the business
2. Creates default product/menu categories
3. Applies workspace settings
4. Creates default workflows (if needed)

## Mobile Responsiveness

Both step components are fully mobile-responsive:

- **Step 1 (Business Type):** 3 cards on desktop, 1 on mobile
- **Step 2 (Category):** 2-column grid on desktop, single column on mobile
- Touch-friendly selection UI with radio buttons
- Proper spacing and sizing for all screen sizes

## Type Safety

Everything is strongly typed with TypeScript:

```typescript
// Business type is validated
const businessType: BusinessTypeEnum = 'retail'; // ✓
const invalid: BusinessTypeEnum = 'unknown'; // ✗ TypeScript error

// Category must match business type
const isValid = isCategoryValidForType(BusinessTypeEnum.RETAIL, BusinessCategoryEnum.SUPERMARKET); // ✓
const invalid = isCategoryValidForType(BusinessTypeEnum.RETAIL, BusinessCategoryEnum.RESTAURANT); // ✗ false
```

## Database Persistence

Two fields are stored in the `organization` table:

- `businessType` (required) - The business type (retail, restaurant, pharmacy)
- `businessCategory` (optional) - The specific category within that type

```sql
CREATE TABLE organization (
  id TEXT PRIMARY KEY,
  businessType TEXT NOT NULL DEFAULT 'retail',
  businessCategory TEXT DEFAULT 'other_retail',
  -- ... other fields
);
```

## Future Enhancements

### Phase 1 (Complete)
✓ Two-step business selection
✓ Configuration-driven categories
✓ Type-safe enums
✓ Database schema

### Phase 2 (Ready to Build)
- Apply default configurations after onboarding
- Create category-specific onboarding flows
- Add category-specific dashboard customizations
- Create category-specific feature toggles

### Phase 3 (Future)
- Add more business types (Hardware, Wholesale, Hotel, Salon, Manufacturing, Clinic, School)
- Advanced category management UI
- Import pre-configured templates per category
- Category-specific reporting

## Testing the System

### Test Case 1: Select Retail → Supermarket
```
1. Start onboarding
2. Step 1: Select "Retail Store"
3. Step 2: Should show 9 retail categories
4. Select "Supermarket"
5. Verify businessCategory stored correctly
6. Verify default features enabled (barcode-scanning, expiry-tracking, loyalty-points)
```

### Test Case 2: Change Business Type
```
1. Start onboarding
2. Step 1: Select "Restaurant & Café"
3. Go back to Step 1
4. Select "Pharmacy"
5. Step 2: Should now show pharmacy categories
6. Verify previous selection (restaurant) was replaced
```

### Test Case 3: Mobile Responsiveness
```
1. Open onboarding on mobile device (320px width)
2. Step 1: Should show 3 cards in single column
3. Step 2: Should show categories in single column
4. Touch targets > 44px
5. No horizontal scrolling
```

## API Integration

When implementing the backend API:

```typescript
// POST /api/onboarding/complete
{
  organizationId: "org_123",
  onboardingData: {
    businessType: "retail",
    businessCategory: "supermarket",
    businessName: "My Store",
    businessEmail: "store@example.com",
    phone: "+254...",
    country: "KE",
    timezone: "Africa/Nairobi",
    businessSize: "small",
    workspaceCompleted: [...]
  }
}
```

The API should:
1. Validate businessType and businessCategory match
2. Store both values in the organization record
3. Call `applyDefaultConfigurations()`
4. Return redirect URL to dashboard

## Utilities

### Helper Functions

```typescript
// Get categories for a business type
import { getCategoriesForType } from '@/lib/config/business-categories';
const categories = getCategoriesForType(BusinessTypeEnum.RETAIL);

// Validate category belongs to type
import { isCategoryValidForType } from '@/lib/config/business-categories';
const isValid = isCategoryValidForType(BusinessTypeEnum.RETAIL, BusinessCategoryEnum.SUPERMARKET);

// Get category name
import { getCategoryName } from '@/lib/config/business-categories';
const name = getCategoryName(BusinessCategoryEnum.SUPERMARKET); // "Supermarket"

// Get default features for category
import { getDefaultsForCategory } from '@/lib/services/category-defaults';
const defaults = getDefaultsForCategory(BusinessCategoryEnum.SUPERMARKET);
// { features: ['barcode-scanning', ...], settings: {...}, defaultCategories: [...] }
```

## Summary

This two-step business selection system is:
- ✓ **Configuration-driven** - Add new types/categories without code changes
- ✓ **Type-safe** - Strong TypeScript enums prevent invalid combinations
- ✓ **Scalable** - Designed to support dozens of business types
- ✓ **Mobile-responsive** - Works perfectly on all screen sizes
- ✓ **User-friendly** - Clear, intuitive selection flow with helpful descriptions
- ✓ **Extensible** - Easy to add category-specific customizations later
