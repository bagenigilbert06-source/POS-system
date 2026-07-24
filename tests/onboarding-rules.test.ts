import assert from 'node:assert/strict'
import { DEFAULT_ONBOARDING_DATA, type OnboardingDraft } from '../lib/onboarding/config'
import { onboardingStepSchemas, validateCompleteDraft } from '../lib/onboarding/schemas'
import { resolveOnboardingTemplateId } from '../lib/templates'
import { getBusinessExperience } from '../lib/workspace/business-experience'

function validDraft(overrides: Partial<OnboardingDraft> = {}): OnboardingDraft {
  return {
    ...DEFAULT_ONBOARDING_DATA,
    businessName: 'Test Business', region: 'Nairobi', city: 'Nairobi', phone: '+254700000000',
    businessFamily: 'retail', businessCategory: 'general_shop', sellsProducts: true, tracksInventory: true,
    keepsCustomers: true, usesSuppliers: true, branchName: 'Main location', branchPhone: '+254700000000',
    branchAddress: 'Test Street', branchRegion: 'Nairobi', branchCity: 'Nairobi',
    enabledModules: ['pos', 'sales', 'products', 'inventory', 'customers', 'reports', 'analytics'],
    receiptBusinessName: 'Test Business', receiptPhone: '+254700000000',
    ...overrides,
  }
}

const validate = (draft: OnboardingDraft) => validateCompleteDraft(draft as unknown as Record<string, unknown>)

for (const profile of [
  { businessFamily: 'retail', businessCategory: 'supermarket', customBusinessCategory: '' },
  { businessFamily: 'food_hospitality', businessCategory: 'cafe', customBusinessCategory: '' },
  { businessFamily: 'health_wellness', businessCategory: 'clinic', customBusinessCategory: '' },
  { businessFamily: 'professional_services', businessCategory: 'consulting', customBusinessCategory: '' },
  { businessFamily: 'other', businessCategory: 'custom', customBusinessCategory: 'Equipment hire' },
] as const) {
  assert.equal(onboardingStepSchemas['business-type'].safeParse(profile).success, true, `${profile.businessFamily} should accept its own category`)
}

assert.equal(onboardingStepSchemas['business-type'].safeParse({ businessFamily: 'retail', businessCategory: 'clinic', customBusinessCategory: '' }).success, false, 'cross-family categories must be rejected')
assert.equal(onboardingStepSchemas['business-type'].safeParse({ businessFamily: 'other', businessCategory: 'custom', customBusinessCategory: '' }).success, false, 'Other must keep a real description')

assert.equal(resolveOnboardingTemplateId('retail', 'supermarket'), 'retail.supermarket', 'supermarkets must receive the supermarket template')
assert.equal(resolveOnboardingTemplateId('retail', 'mini_mart'), 'retail.grocery', 'mini-marts must receive the grocery template')
assert.equal(resolveOnboardingTemplateId('food_hospitality', 'cafe'), 'restaurant.cafe', 'cafés must receive the café template')
assert.equal(getBusinessExperience('retail', 'supermarket').navigation.pos, 'Checkout', 'supermarkets must use retail navigation')
assert.equal(getBusinessExperience('food_hospitality', 'cafe').navigation.products, 'Menu', 'cafés must use menu navigation')
assert.equal(getBusinessExperience('food_hospitality', 'cafe').actionLabels.primary, 'New order', 'cafés must use order-oriented actions')

assert.equal(validate(validDraft()).success, true, 'product and inventory workflow should validate')
assert.equal(validate(validDraft({ enabledModules: ['pos', 'sales', 'products', 'inventory', 'customers', 'reports'] })).success, false, 'analytics must be enabled for the working dashboard')
assert.equal(validate(validDraft({
  businessFamily: 'professional_services', businessCategory: 'consulting', sellsProducts: false, providesServices: true,
  tracksInventory: false, keepsCustomers: true, usesSuppliers: false, enabledModules: ['sales', 'customers', 'reports', 'analytics'],
})).success, true, 'service workflow should validate without product or inventory modules')
assert.equal(validate(validDraft({ sellsProducts: false, providesServices: true, tracksInventory: false })).success, false, 'disabled product operations must reject product modules')
assert.equal(validate(validDraft({ acceptsCash: false })).success, false, 'operations and payment settings must agree')
assert.equal(validate(validDraft({ needsTax: true, taxEnabled: false })).success, false, 'operations and tax settings must agree')

console.log('Onboarding rules unit test passed')
