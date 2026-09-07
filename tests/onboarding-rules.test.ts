import assert from 'node:assert/strict'
import {
  DEFAULT_ONBOARDING_DATA,
  isBusinessCategoryAvailable,
  isBusinessFamilyAvailable,
  KENYAN_COUNTIES,
  onboardingProgressPercent,
  operationsProfileFor,
  type OnboardingDraft,
} from '../lib/onboarding/config'
import { normalizeKenyanPhone, onboardingStepSchemas, validateCompleteDraft } from '../lib/onboarding/schemas'
import { resolveOnboardingTemplateId } from '../lib/templates'
import { getBusinessExperience } from '../lib/workspace/business-experience'
import { fiscalYearStart } from '../lib/finance/fiscal-year'

function validDraft(overrides: Partial<OnboardingDraft> = {}): OnboardingDraft {
  return {
    ...DEFAULT_ONBOARDING_DATA,
    businessName: 'Test Business', region: 'Nairobi', city: 'Nairobi', phone: '+254700000000',
    businessSize: 'small', businessDescription: 'Everyday retail goods',
    businessFamily: 'retail', businessCategory: 'hardware', sellsProducts: true, tracksInventory: true, hasEmployees: true, issuesReceipts: true,
    keepsCustomers: true, usesSuppliers: true, branchName: 'Main location', branchPhone: '+254700000000',
    branchAddress: 'Test Street', branchRegion: 'Nairobi', branchCity: 'Nairobi',
    enabledModules: ['pos', 'sales', 'products', 'inventory', 'customers', 'reports', 'analytics'],
    receiptBusinessName: 'Test Business', receiptPhone: '+254700000000',
    ...overrides,
  }
}

const validate = (draft: OnboardingDraft) => validateCompleteDraft(draft as unknown as Record<string, unknown>)

for (const profile of [
  { businessFamily: 'retail', businessCategory: 'hardware', customBusinessCategory: '' },
  { businessFamily: 'retail', businessCategory: 'liquor_shop', customBusinessCategory: '' },
  { businessFamily: 'retail', businessCategory: 'retail_pharmacy', customBusinessCategory: '' },
  { businessFamily: 'food_hospitality', businessCategory: 'cafe', customBusinessCategory: '' },
  { businessFamily: 'health_wellness', businessCategory: 'health_pharmacy', customBusinessCategory: '' },
] as const) {
  assert.equal(onboardingStepSchemas['business-type'].safeParse(profile).success, true, `${profile.businessCategory} should be available`)
}

assert.equal(onboardingStepSchemas['business-type'].safeParse({ businessFamily: 'retail', businessCategory: 'clinic', customBusinessCategory: '' }).success, false, 'cross-family categories must be rejected')
assert.equal(onboardingStepSchemas['business-type'].safeParse({ businessFamily: 'other', businessCategory: 'custom', customBusinessCategory: '' }).success, false, 'Other must keep a real description')
assert.equal(onboardingStepSchemas['business-type'].safeParse({ businessFamily: 'retail', businessCategory: 'supermarket', customBusinessCategory: '' }).success, false, 'coming-soon retail categories must be rejected')
assert.equal(onboardingStepSchemas['business-type'].safeParse({ businessFamily: 'professional_services', businessCategory: 'consulting', customBusinessCategory: '' }).success, false, 'coming-soon business families must be rejected')
assert.equal(isBusinessCategoryAvailable('hardware'), true, 'hardware must be available')
assert.equal(isBusinessCategoryAvailable('supermarket'), false, 'supermarket must remain coming soon')
assert.equal(isBusinessFamilyAvailable('retail'), true, 'retail must remain selectable')
assert.equal(isBusinessFamilyAvailable('professional_services'), false, 'unsupported families must remain disabled')
assert.equal(KENYAN_COUNTIES.length, 47, 'the Kenya county selector must include all 47 counties')
assert.equal(onboardingStepSchemas['business-details'].safeParse({ ...DEFAULT_ONBOARDING_DATA, businessName: 'Test Business', branchName: 'Main Branch', region: 'Nairobi', city: 'Nairobi', phone: '0712345678' }).success, true, 'a Kenyan county and local phone must validate')
assert.equal(onboardingStepSchemas['business-details'].safeParse({ ...DEFAULT_ONBOARDING_DATA, businessName: 'Test Business', branchName: 'Main Branch', region: 'Not a county', city: 'Nairobi', phone: '0712345678' }).success, false, 'unknown counties must be rejected')
assert.equal(onboardingStepSchemas['main-branch'].safeParse({ ...DEFAULT_ONBOARDING_DATA, branchName: 'Main Branch', branchPhone: '0712345678', branchAddress: 'Test Street', branchRegion: 'Nairobi', branchCity: 'Nairobi' }).success, true, 'primary branch county must accept a Kenyan county')
assert.equal(onboardingStepSchemas['main-branch'].safeParse({ ...DEFAULT_ONBOARDING_DATA, branchName: 'Main Branch', branchPhone: '0712345678', branchAddress: 'Test Street', branchRegion: 'Unknown', branchCity: 'Nairobi' }).success, false, 'primary branch county must validate server-side')
assert.equal(onboardingStepSchemas.receipt.safeParse({ ...validDraft(), receiptBusinessName: '' }).success, true, 'receipt onboarding must not require duplicate merchant identity')
assert.equal(normalizeKenyanPhone('0712345678'), '+254712345678', 'local Kenyan phone numbers must normalize')
assert.equal(normalizeKenyanPhone('712345678'), '+254712345678', 'Kenyan subscriber numbers must normalize')
assert.equal(normalizeKenyanPhone('+254712345678'), '+254712345678', 'international Kenyan phone numbers must remain normalized')
assert.equal(onboardingProgressPercent(1), 22, 'Step 2 of 9 must report the same current-step progress')
const liquorOperations = operationsProfileFor('retail', 'liquor_shop')
assert.deepEqual(liquorOperations.required, ['sellsProducts', 'tracksInventory', 'hasEmployees', 'issuesReceipts'], 'liquor POS core capabilities must be template-owned')
assert.equal(liquorOperations.defaults.acceptsCash, true, 'liquor POS must default cash on')
assert.equal(liquorOperations.defaults.acceptsMpesa, true, 'liquor POS must default M-Pesa on without configuring a provider')
assert.equal(liquorOperations.defaults.acceptsCard, false, 'card payment intent remains optional')
assert.equal(liquorOperations.defaults.multipleLocations, false, 'the primary branch remains valid by default')
assert.equal(liquorOperations.defaults.usesSuppliers, undefined, 'supplier purchasing must remain an explicit business choice')
assert.equal(operationsProfileFor('food_hospitality', 'cafe').required.length, 0, 'template operational defaults must remain isolated')

assert.equal(resolveOnboardingTemplateId('retail', 'supermarket'), 'retail.supermarket', 'supermarkets must receive the supermarket template')
assert.equal(resolveOnboardingTemplateId('retail', 'mini_mart'), 'retail.grocery', 'mini-marts must receive the grocery template')
assert.equal(resolveOnboardingTemplateId('retail', 'liquor_shop'), 'retail.liquor-shop', 'liquor shops must receive their specialized template')
assert.equal(resolveOnboardingTemplateId('retail', 'hardware'), 'retail.hardware', 'hardware stores must receive their specialized template')
assert.equal(resolveOnboardingTemplateId('food_hospitality', 'cafe'), 'restaurant.cafe', 'cafés must receive the café template')
assert.equal(resolveOnboardingTemplateId('food_hospitality', 'restaurant'), 'restaurant.restaurant', 'restaurants must receive the restaurant template')
assert.equal(resolveOnboardingTemplateId('professional_services', 'consulting'), 'adaptive.generic', 'unsupported verticals must use the neutral adaptive template')
assert.equal(getBusinessExperience('retail', 'supermarket').navigation.pos, 'Checkout', 'supermarkets must use retail navigation')
assert.equal(getBusinessExperience('retail', 'liquor_shop').navigation.overview, 'Liquor Overview', 'liquor shops must receive specialized dashboard navigation')
assert.equal(getBusinessExperience('retail', 'liquor_shop').stockTitle, 'Drinks to reorder', 'liquor shops must receive drink-specific inventory language')
assert.equal(getBusinessExperience('retail', 'hardware').navigation.products, 'Hardware catalogue', 'hardware stores must receive specialized catalogue navigation')
assert.equal(getBusinessExperience('retail', 'hardware').actionLabels.primary, 'Start hardware sale', 'hardware stores must receive a hardware sale action')
assert.equal(getBusinessExperience('food_hospitality', 'cafe').navigation.products, 'Menu', 'cafés must use menu navigation')
assert.equal(getBusinessExperience('food_hospitality', 'cafe').actionLabels.primary, 'New order', 'cafés must use order-oriented actions')

assert.equal(validate(validDraft()).success, true, 'product and inventory workflow should validate')
assert.equal(validate(validDraft({ usesSuppliers: true })).success, true, 'supplier records should work with the current operations workflow')
assert.equal(validate(validDraft({ enabledModules: ['pos', 'sales', 'products', 'inventory', 'customers', 'reports'] })).success, false, 'analytics must be enabled for the working dashboard')
assert.equal(validate(validDraft({
  businessFamily: 'professional_services', businessCategory: 'consulting', sellsProducts: false, providesServices: true,
  tracksInventory: false, keepsCustomers: true, usesSuppliers: false, enabledModules: ['sales', 'customers', 'reports', 'analytics'],
})).success, false, 'coming-soon service workspaces must not bypass onboarding validation')
assert.equal(validate(validDraft({ sellsProducts: false, providesServices: true, tracksInventory: false })).success, false, 'disabled product operations must reject product modules')
assert.equal(validate(validDraft({ acceptsCash: false })).success, false, 'operations and payment settings must agree')
assert.equal(validate(validDraft({ needsTax: true, taxEnabled: false })).success, true, 'tax status must be configured independently of operations')
assert.equal(validate(validDraft({ needsTax: true, taxEnabled: true, taxIdentifier: '' })).success, false, 'enabled Kenyan tax must include a KRA PIN')
assert.equal(fiscalYearStart(new Date('2026-06-30T12:00:00Z'), '07-01').toISOString(), '2025-07-01T00:00:00.000Z', 'July financial years must include the preceding July through June period')
assert.equal(fiscalYearStart(new Date('2026-07-01T12:00:00Z'), '07-01').toISOString(), '2026-07-01T00:00:00.000Z', 'a new financial year must begin on its configured date')
assert.equal(fiscalYearStart(new Date('2026-03-15T12:00:00Z'), '01-01').toISOString(), '2026-01-01T00:00:00.000Z', 'January financial years must start in the current year after January')

console.log('Onboarding rules unit test passed')
