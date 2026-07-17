import type { LucideIcon } from 'lucide-react'
import { Building2, CircleHelp, Pill, ShoppingBasket, Utensils } from 'lucide-react'

export const ONBOARDING_STEPS = [
  'welcome',
  'business-details',
  'business-type',
  'operations',
  'main-branch',
  'modules',
  'payments-tax',
  'receipt',
  'review',
] as const

export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number]

export const WORKING_MODULES = [
  { id: 'pos', name: 'Point of sale', description: 'Checkout, payments and receipts.' },
  { id: 'sales', name: 'Sales', description: 'Transactions and sales history.' },
  { id: 'products', name: 'Products', description: 'Product records and pricing.' },
  { id: 'inventory', name: 'Inventory', description: 'Stock levels and movement.' },
  { id: 'customers', name: 'Customers', description: 'Customer records and activity.' },
  { id: 'reports', name: 'Reports', description: 'Operational reporting.' },
] as const

export const REQUIRED_MODULES = ['sales', 'reports'] as const

export interface BusinessProfile {
  id: 'retail' | 'restaurant' | 'pharmacy' | 'other'
  name: string
  description: string
  icon: LucideIcon
  category: string
  recommendedModules: string[]
  defaults: Partial<OnboardingDraft>
}

export interface OnboardingDraft {
  businessName: string
  displayName: string
  country: string
  region: string
  city: string
  phone: string
  businessEmail: string
  website: string
  language: string
  timezone: string
  currency: string
  financialYearStart: string
  businessType: BusinessProfile['id']
  businessCategory: string
  sellsProducts: boolean
  providesServices: boolean
  tracksInventory: boolean
  hasEmployees: boolean
  multipleLocations: boolean
  keepsCustomers: boolean
  usesSuppliers: boolean
  acceptsCash: boolean
  acceptsMpesa: boolean
  acceptsCard: boolean
  needsTax: boolean
  issuesReceipts: boolean
  branchName: string
  branchPhone: string
  branchAddress: string
  branchRegion: string
  branchCity: string
  branchTimezone: string
  receiptHeader: string
  enabledModules: string[]
  paymentMethods: string[]
  defaultPaymentMethod: string
  taxEnabled: boolean
  pricesIncludeTax: boolean
  taxName: string
  taxRate: string
  taxIdentifier: string
  receiptBusinessName: string
  receiptPhone: string
  receiptAddress: string
  receiptFooter: string
  showTaxOnReceipt: boolean
  receiptNumbering: 'automatic'
}

export const DEFAULT_ONBOARDING_DATA: OnboardingDraft = {
  businessName: '', displayName: '', country: 'KE', region: '', city: '', phone: '',
  businessEmail: '', website: '', language: 'en', timezone: 'Africa/Nairobi', currency: 'KES',
  financialYearStart: '01-01', businessType: 'retail', businessCategory: 'other_retail',
  sellsProducts: true, providesServices: false, tracksInventory: true, hasEmployees: false,
  multipleLocations: false, keepsCustomers: true, usesSuppliers: true, acceptsCash: true,
  acceptsMpesa: true, acceptsCard: false, needsTax: false, issuesReceipts: true,
  branchName: 'Main Branch', branchPhone: '', branchAddress: '', branchRegion: '', branchCity: '',
  branchTimezone: 'Africa/Nairobi', receiptHeader: '',
  enabledModules: ['pos', 'sales', 'products', 'inventory', 'customers', 'reports'],
  paymentMethods: ['cash', 'mpesa'], defaultPaymentMethod: 'cash', taxEnabled: false,
  pricesIncludeTax: false, taxName: 'VAT', taxRate: '16', taxIdentifier: '',
  receiptBusinessName: '', receiptPhone: '', receiptAddress: '', receiptFooter: 'Thank you for your business.',
  showTaxOnReceipt: false, receiptNumbering: 'automatic',
}

export const BUSINESS_PROFILES: BusinessProfile[] = [
  { id: 'retail', name: 'Retail store', description: 'Sell products and manage stock at a counter.', icon: ShoppingBasket, category: 'other_retail', recommendedModules: ['pos', 'sales', 'products', 'inventory', 'customers', 'reports'], defaults: { sellsProducts: true, tracksInventory: true, providesServices: false } },
  { id: 'restaurant', name: 'Restaurant & café', description: 'Manage counter sales, products and daily reporting.', icon: Utensils, category: 'other_restaurant', recommendedModules: ['pos', 'sales', 'products', 'inventory', 'customers', 'reports'], defaults: { sellsProducts: true, tracksInventory: true, providesServices: true } },
  { id: 'pharmacy', name: 'Pharmacy', description: 'Sell products with stock visibility and reporting.', icon: Pill, category: 'other_pharmacy', recommendedModules: ['pos', 'sales', 'products', 'inventory', 'customers', 'reports'], defaults: { sellsProducts: true, tracksInventory: true, providesServices: false } },
  { id: 'other', name: 'Other business', description: 'Start with a safe shared workspace and configure it your way.', icon: CircleHelp, category: 'other_retail', recommendedModules: ['sales', 'customers', 'reports'], defaults: { sellsProducts: false, tracksInventory: false, providesServices: true } },
]

export const profileFor = (id: string) => BUSINESS_PROFILES.find((profile) => profile.id === id) ?? BUSINESS_PROFILES[3]
export const persistedBusinessType = (id: string) => id === 'other' ? 'retail' : id

