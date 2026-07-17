import { z } from 'zod'
import { ONBOARDING_STEPS, WORKING_MODULES } from './config'

const optionalText = (max: number) => z.string().trim().max(max).optional().default('')
const phone = z.string().trim().regex(/^\+?[0-9][0-9\s-]{7,18}$/, 'Enter a valid phone number')
const url = z.union([z.literal(''), z.string().trim().url('Enter a complete website address')])

export const onboardingStepSchemas = {
  welcome: z.object({}),
  'business-details': z.object({
    businessName: z.string().trim().min(2, 'Enter your business name').max(120),
    displayName: optionalText(120), country: z.literal('KE'), region: z.string().trim().min(2).max(80),
    city: z.string().trim().min(2).max(80), phone, businessEmail: z.union([z.literal(''), z.string().trim().email()]),
    website: url, language: z.enum(['en', 'sw']), timezone: z.literal('Africa/Nairobi'), currency: z.literal('KES'),
    financialYearStart: z.string().regex(/^\d{2}-\d{2}$/),
  }),
  'business-type': z.object({ businessType: z.enum(['retail', 'restaurant', 'pharmacy', 'other']), businessCategory: z.string().trim().min(2).max(80) }),
  operations: z.object({
    sellsProducts: z.boolean(), providesServices: z.boolean(), tracksInventory: z.boolean(), hasEmployees: z.boolean(),
    multipleLocations: z.boolean(), keepsCustomers: z.boolean(), usesSuppliers: z.boolean(), acceptsCash: z.boolean(),
    acceptsMpesa: z.boolean(), acceptsCard: z.boolean(), needsTax: z.boolean(), issuesReceipts: z.boolean(),
  }).refine((value) => value.sellsProducts || value.providesServices, { message: 'Select at least one way your business operates' }),
  'main-branch': z.object({ branchName: z.string().trim().min(2).max(100), branchPhone: phone, branchAddress: z.string().trim().min(3).max(180), branchRegion: z.string().trim().min(2).max(80), branchCity: z.string().trim().min(2).max(80), branchTimezone: z.literal('Africa/Nairobi'), receiptHeader: optionalText(120) }),
  modules: z.object({ enabledModules: z.array(z.enum(WORKING_MODULES.map((module) => module.id) as [string, ...string[]])).min(2) })
    .refine((value) => ['sales', 'reports'].every((id) => value.enabledModules.includes(id)), { message: 'Sales and Reports are required' })
    .refine((value) => !value.enabledModules.includes('inventory') || value.enabledModules.includes('products'), { message: 'Inventory requires Products' }),
  'payments-tax': z.object({
    paymentMethods: z.array(z.enum(['cash', 'mpesa', 'card', 'bank_transfer', 'other'])).min(1, 'Choose at least one payment method'),
    defaultPaymentMethod: z.string().min(1), taxEnabled: z.boolean(), pricesIncludeTax: z.boolean(), taxName: optionalText(30),
    taxRate: z.string().refine((value) => Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 100, 'Enter a rate from 0 to 100'),
    taxIdentifier: optionalText(40),
  }).refine((value) => value.paymentMethods.includes(value.defaultPaymentMethod as never), { path: ['defaultPaymentMethod'], message: 'Default method must be enabled' }),
  receipt: z.object({ receiptBusinessName: z.string().trim().min(2).max(120), receiptPhone: phone, receiptAddress: optionalText(180), receiptFooter: optionalText(160), showTaxOnReceipt: z.boolean(), receiptNumbering: z.literal('automatic') }),
  review: z.object({}),
} satisfies Record<(typeof ONBOARDING_STEPS)[number], z.ZodTypeAny>

export const saveOnboardingStepSchema = z.object({ stepId: z.enum(ONBOARDING_STEPS), data: z.record(z.unknown()) })

export function validateCompleteDraft(data: Record<string, unknown>) {
  let merged: Record<string, unknown> = {}
  for (const step of ONBOARDING_STEPS) {
    if (step === 'welcome' || step === 'review') continue
    const parsed = onboardingStepSchemas[step].safeParse(data)
    if (!parsed.success) return { success: false as const, step, error: parsed.error }
    merged = { ...merged, ...parsed.data }
  }
  return { success: true as const, data: merged }
}
