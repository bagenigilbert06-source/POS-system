import { z } from 'zod'
import {
  BUSINESS_FAMILY_IDS,
  ONBOARDING_STEPS,
  WORKING_MODULES,
  isCategoryValidForFamily,
  type OnboardingDraft,
} from './config'

const optionalText = (max: number) => z.string().trim().max(max).optional().default('')
const phone = z.string().trim().regex(/^\+?[0-9][0-9\s-]{7,18}$/, 'Enter a valid phone number')
const url = z.union([z.literal(''), z.string().trim().url('Enter a complete website address')])
const financialYearStart = z.string().regex(/^\d{2}-\d{2}$/, 'Choose a valid financial year start').refine((value) => {
  const [month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(2024, month - 1, day))
  return date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}, 'Choose a real calendar date')

export const onboardingStepSchemas = {
  welcome: z.object({}),
  'business-details': z.object({
    businessName: z.string().trim().min(2, 'Enter your business name').max(120),
    displayName: optionalText(120),
    country: z.literal('KE'),
    region: z.string().trim().min(2, 'Enter a county or region').max(80),
    city: z.string().trim().min(2, 'Enter a city or town').max(80),
    phone,
    businessEmail: z.union([z.literal(''), z.string().trim().email('Enter a valid business email')]),
    website: url,
    language: z.enum(['en', 'sw']),
    timezone: z.literal('Africa/Nairobi'),
    currency: z.literal('KES'),
    financialYearStart,
  }),
  'business-type': z.object({
    businessFamily: z.enum(BUSINESS_FAMILY_IDS),
    businessCategory: z.string().trim().min(2, 'Choose a business category').max(80),
    customBusinessCategory: optionalText(100),
  }).superRefine((value, context) => {
    if (!isCategoryValidForFamily(value.businessFamily, value.businessCategory)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['businessCategory'], message: 'Choose a category that belongs to this business family' })
    }
    if (value.businessFamily === 'other' && value.customBusinessCategory.trim().length < 2) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['customBusinessCategory'], message: 'Describe your business' })
    }
  }),
  operations: z.object({
    sellsProducts: z.boolean(), providesServices: z.boolean(), tracksInventory: z.boolean(), hasEmployees: z.boolean(),
    multipleLocations: z.boolean(), keepsCustomers: z.boolean(), usesSuppliers: z.boolean(), acceptsCash: z.boolean(),
    acceptsMpesa: z.boolean(), acceptsCard: z.boolean(), needsTax: z.boolean(), issuesReceipts: z.boolean(),
  }).superRefine((value, context) => {
    if (!value.sellsProducts && !value.providesServices) context.addIssue({ code: z.ZodIssueCode.custom, message: 'Select products, services, or both' })
    if (value.tracksInventory && !value.sellsProducts) context.addIssue({ code: z.ZodIssueCode.custom, path: ['tracksInventory'], message: 'Inventory tracking requires product sales' })
    if (!value.acceptsCash && !value.acceptsMpesa && !value.acceptsCard) context.addIssue({ code: z.ZodIssueCode.custom, message: 'Select at least one payment method your business accepts' })
  }),
  modules: z.object({ enabledModules: z.array(z.enum(WORKING_MODULES.map((module) => module.id) as [string, ...string[]])).min(2) })
    .refine((value) => ['sales', 'reports', 'analytics'].every((id) => value.enabledModules.includes(id)), { message: 'Sales, Reports and Analytics are required' })
    .refine((value) => !value.enabledModules.includes('pos') || value.enabledModules.includes('sales'), { message: 'Point of sale requires Sales' })
    .refine((value) => !value.enabledModules.includes('inventory') || value.enabledModules.includes('products'), { message: 'Inventory requires Products' }),
  'main-branch': z.object({
    branchName: z.string().trim().min(2, 'Enter the location name').max(100),
    branchPhone: phone,
    branchAddress: z.string().trim().min(3, 'Enter the location address').max(180),
    branchRegion: z.string().trim().min(2, 'Enter the county or region').max(80),
    branchCity: z.string().trim().min(2, 'Enter the city or town').max(80),
    branchTimezone: z.literal('Africa/Nairobi'),
    receiptHeader: optionalText(120),
  }),
  'payments-tax': z.object({
    paymentMethods: z.array(z.enum(['cash', 'mpesa', 'card', 'bank_transfer', 'other'])).min(1, 'Choose at least one payment method'),
    defaultPaymentMethod: z.string().min(1),
    taxEnabled: z.boolean(),
    pricesIncludeTax: z.boolean(),
    taxName: optionalText(30),
    taxRate: z.string().refine((value) => Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 100, 'Enter a rate from 0 to 100'),
    taxIdentifier: optionalText(40),
  }).superRefine((value, context) => {
    if (!value.paymentMethods.includes(value.defaultPaymentMethod as never)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['defaultPaymentMethod'], message: 'Default method must be enabled' })
    if (!value.taxEnabled && value.pricesIncludeTax) context.addIssue({ code: z.ZodIssueCode.custom, path: ['pricesIncludeTax'], message: 'Prices cannot include tax when tax is disabled' })
    if (value.taxEnabled && !value.taxName.trim()) context.addIssue({ code: z.ZodIssueCode.custom, path: ['taxName'], message: 'Enter the tax name' })
  }),
  receipt: z.object({
    receiptBusinessName: z.string().trim().min(2).max(120), receiptPhone: phone, receiptAddress: optionalText(180),
    receiptFooter: optionalText(160), showTaxOnReceipt: z.boolean(), receiptNumbering: z.literal('automatic'),
  }),
  review: z.object({}),
} satisfies Record<(typeof ONBOARDING_STEPS)[number], z.ZodTypeAny>

export const saveOnboardingStepSchema = z.object({
  stepId: z.enum(ONBOARDING_STEPS),
  data: z.record(z.unknown()),
  revision: z.number().int().positive(),
})

function draftError(step: (typeof ONBOARDING_STEPS)[number], path: string, message: string) {
  return { success: false as const, step, error: new z.ZodError([{ code: z.ZodIssueCode.custom, path: [path], message }]) }
}

export function validateCompleteDraft(data: Record<string, unknown>) {
  let merged: Record<string, unknown> = {}
  for (const step of ONBOARDING_STEPS) {
    if (step === 'welcome' || step === 'review') continue
    const parsed = onboardingStepSchemas[step].safeParse(data)
    if (!parsed.success) return { success: false as const, step, error: parsed.error }
    merged = { ...merged, ...parsed.data }
  }

  const draft = merged as unknown as OnboardingDraft
  const modules = new Set(draft.enabledModules)
  if (draft.sellsProducts && !modules.has('products')) return draftError('modules', 'enabledModules', 'Product-selling businesses require Products')
  if (!draft.sellsProducts && modules.has('products')) return draftError('modules', 'enabledModules', 'Products cannot be enabled when the business does not sell products')
  if (draft.tracksInventory && !modules.has('inventory')) return draftError('modules', 'enabledModules', 'Inventory must be enabled when stock tracking is selected')
  if (!draft.tracksInventory && modules.has('inventory')) return draftError('modules', 'enabledModules', 'Inventory cannot be enabled when stock tracking is not selected')
  if (draft.keepsCustomers && !modules.has('customers')) return draftError('modules', 'enabledModules', 'Customers must be enabled when customer records are selected')
  if (!draft.keepsCustomers && modules.has('customers')) return draftError('modules', 'enabledModules', 'Customers cannot be enabled when customer records are not selected')
  if (modules.has('pos') && draft.sellsProducts && !modules.has('products')) return draftError('modules', 'enabledModules', 'Product checkout requires Products')

  const payments = new Set(draft.paymentMethods)
  if (draft.acceptsCash !== payments.has('cash')) return draftError('payments-tax', 'paymentMethods', 'Cash settings must match the operations profile')
  if (draft.acceptsMpesa !== payments.has('mpesa')) return draftError('payments-tax', 'paymentMethods', 'M-Pesa settings must match the operations profile')
  if (draft.acceptsCard !== payments.has('card')) return draftError('payments-tax', 'paymentMethods', 'Card settings must match the operations profile')
  if (draft.needsTax !== draft.taxEnabled) return draftError('payments-tax', 'taxEnabled', 'Tax settings must match the operations profile')
  if (!draft.taxEnabled && (draft.pricesIncludeTax || draft.showTaxOnReceipt)) return draftError('payments-tax', 'taxEnabled', 'Disabled tax cannot be included in prices or receipts')
  if (!draft.issuesReceipts && draft.showTaxOnReceipt) return draftError('receipt', 'showTaxOnReceipt', 'Receipt tax display requires receipts to be enabled')

  return { success: true as const, data: draft }
}
