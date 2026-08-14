import type { LucideIcon } from 'lucide-react';
import {
  BookOpenCheck,
  BriefcaseBusiness,
  CircleHelp,
  Factory,
  HeartPulse,
  Leaf,
  Scissors,
  ShoppingBasket,
  Utensils,
  Wrench,
} from 'lucide-react';

export const ONBOARDING_STEPS = [
  'welcome',
  'business-details',
  'business-type',
  'operations',
  'modules',
  'main-branch',
  'payments-tax',
  'receipt',
  'review',
] as const;

export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number];

export const FINANCIAL_YEAR_START_OPTIONS = [
  ['01-01', '1 January'],
  ['02-01', '1 February'],
  ['03-01', '1 March'],
  ['04-01', '1 April'],
  ['05-01', '1 May'],
  ['06-01', '1 June'],
  ['07-01', '1 July'],
  ['08-01', '1 August'],
  ['09-01', '1 September'],
  ['10-01', '1 October'],
  ['11-01', '1 November'],
  ['12-01', '1 December'],
] as const;

export const WORKING_MODULES = [
  {
    id: 'pos',
    name: 'Point of sale',
    description: 'Checkout, payments and supported receipts.',
  },
  {
    id: 'sales',
    name: 'Sales',
    description: 'Transactions and sales history.',
  },
  {
    id: 'products',
    name: 'Products',
    description: 'Product records and pricing.',
  },
  {
    id: 'inventory',
    name: 'Inventory',
    description: 'Stock levels and movement.',
  },
  {
    id: 'customers',
    name: 'Customers',
    description: 'Customer or client records and activity.',
  },
  {
    id: 'expenses',
    name: 'Expenses',
    description: 'Operating costs, categories and cash outflows.',
  },
  {
    id: 'reports',
    name: 'Reports',
    description: 'Reports based on recorded operational data.',
  },
  {
    id: 'analytics',
    name: 'Analytics',
    description: 'Trends, customer insights and performance forecasts.',
  },
] as const;

export const REQUIRED_MODULES = [
  'sales',
  'expenses',
  'reports',
  'analytics',
] as const;
export type WorkingModuleId = (typeof WORKING_MODULES)[number]['id'];

export const BUSINESS_FAMILY_IDS = [
  'retail',
  'food_hospitality',
  'health_wellness',
  'professional_services',
  'beauty_personal_care',
  'wholesale_distribution',
  'repairs_technical',
  'education_training',
  'agriculture',
  'other',
] as const;

export type BusinessFamilyId = (typeof BUSINESS_FAMILY_IDS)[number];

export interface BusinessFamilyProfile {
  id: BusinessFamilyId;
  name: string;
  description: string;
  icon: LucideIcon;
}

export interface BusinessCategoryOption {
  id: string;
  name: string;
}

export const BUSINESS_FAMILIES: BusinessFamilyProfile[] = [
  {
    id: 'retail',
    name: 'Retail and shops',
    description: 'Sell products in a shop, counter or store.',
    icon: ShoppingBasket,
  },
  {
    id: 'food_hospitality',
    name: 'Food and hospitality',
    description: 'Sell prepared food, drinks or hospitality services.',
    icon: Utensils,
  },
  {
    id: 'health_wellness',
    name: 'Health and wellness',
    description: 'Provide health, fitness or wellness services.',
    icon: HeartPulse,
  },
  {
    id: 'professional_services',
    name: 'Professional services',
    description: 'Deliver expertise, projects or client services.',
    icon: BriefcaseBusiness,
  },
  {
    id: 'beauty_personal_care',
    name: 'Beauty and personal care',
    description: 'Provide personal care services or sell related products.',
    icon: Scissors,
  },
  {
    id: 'wholesale_distribution',
    name: 'Wholesale and distribution',
    description: 'Buy, hold and distribute products in volume.',
    icon: Factory,
  },
  {
    id: 'repairs_technical',
    name: 'Repairs and technical services',
    description: 'Repair, install or maintain customer equipment.',
    icon: Wrench,
  },
  {
    id: 'education_training',
    name: 'Education and training',
    description: 'Provide lessons, courses or training services.',
    icon: BookOpenCheck,
  },
  {
    id: 'agriculture',
    name: 'Agriculture',
    description: 'Sell farm products, inputs or agricultural services.',
    icon: Leaf,
  },
  {
    id: 'other',
    name: 'Other business',
    description: 'Describe a business that does not fit these groups.',
    icon: CircleHelp,
  },
];

export const BUSINESS_CATEGORIES: Record<
  BusinessFamilyId,
  BusinessCategoryOption[]
> = {
  retail: [
    ['general_shop', 'General shop'],
    ['supermarket', 'Supermarket'],
    ['mini_mart', 'Mini-mart'],
    ['hardware', 'Hardware'],
    ['electronics', 'Electronics'],
    ['clothing', 'Clothing'],
    ['cosmetics', 'Cosmetics'],
    ['liquor_shop', 'Liquor shop'],
    ['bookshop', 'Bookshop'],
    ['spare_parts', 'Spare parts'],
    ['retail_pharmacy', 'Pharmacy'],
    ['other_retail', 'Other retail'],
  ].map(([id, name]) => ({ id, name })),
  food_hospitality: [
    ['cafe', 'Café'],
    ['restaurant', 'Restaurant'],
    ['bakery', 'Bakery'],
    ['fast_food', 'Fast food'],
    ['catering', 'Catering'],
    ['bar_lounge', 'Bar or lounge'],
    ['other_food', 'Other food business'],
  ].map(([id, name]) => ({ id, name })),
  health_wellness: [
    ['clinic', 'Clinic'],
    ['dental_clinic', 'Dental clinic'],
    ['health_pharmacy', 'Pharmacy'],
    ['optical_shop', 'Optical shop'],
    ['laboratory', 'Laboratory'],
    ['physiotherapy', 'Physiotherapy'],
    ['gym', 'Gym'],
    ['other_health', 'Other health business'],
  ].map(([id, name]) => ({ id, name })),
  professional_services: [
    ['consulting', 'Consulting'],
    ['accounting', 'Accounting'],
    ['legal', 'Legal'],
    ['photography', 'Photography'],
    ['cleaning', 'Cleaning'],
    ['other_professional_service', 'Other professional service'],
  ].map(([id, name]) => ({ id, name })),
  beauty_personal_care: [
    ['salon', 'Salon'],
    ['barber', 'Barber'],
    ['spa', 'Spa'],
    ['beauty_shop', 'Beauty shop'],
    ['other_personal_care', 'Other personal care'],
  ].map(([id, name]) => ({ id, name })),
  wholesale_distribution: [
    ['general_wholesale', 'General wholesale'],
    ['food_distribution', 'Food distribution'],
    ['medical_distribution', 'Medical distribution'],
    ['other_distribution', 'Other distribution'],
  ].map(([id, name]) => ({ id, name })),
  repairs_technical: [
    ['garage', 'Garage'],
    ['electronics_repair', 'Electronics repair'],
    ['appliance_repair', 'Appliance repair'],
    ['installation_service', 'Installation service'],
    ['other_repair', 'Other repair service'],
  ].map(([id, name]) => ({ id, name })),
  education_training: [
    ['school', 'School'],
    ['training_center', 'Training centre'],
    ['tutor', 'Tutor'],
    ['other_education', 'Other education business'],
  ].map(([id, name]) => ({ id, name })),
  agriculture: [
    ['farm', 'Farm'],
    ['agrovet', 'Agrovet'],
    ['produce_shop', 'Produce shop'],
    ['agricultural_service', 'Agricultural service'],
    ['other_agriculture', 'Other agriculture business'],
  ].map(([id, name]) => ({ id, name })),
  other: [{ id: 'custom', name: 'Describe my business' }],
};

export interface OnboardingDraft {
  acceptsTerms: boolean;
  businessName: string;
  displayName: string;
  country: string;
  region: string;
  city: string;
  phone: string;
  businessEmail: string;
  website: string;
  businessSize: 'solo' | 'small' | 'medium' | 'large';
  businessDescription: string;
  language: string;
  timezone: string;
  currency: string;
  financialYearStart: string;
  businessFamily: BusinessFamilyId | '';
  businessCategory: string;
  customBusinessCategory: string;
  sellsProducts: boolean;
  providesServices: boolean;
  tracksInventory: boolean;
  hasEmployees: boolean;
  multipleLocations: boolean;
  keepsCustomers: boolean;
  usesSuppliers: boolean;
  acceptsCash: boolean;
  acceptsMpesa: boolean;
  acceptsCard: boolean;
  needsTax: boolean;
  issuesReceipts: boolean;
  branchName: string;
  branchPhone: string;
  branchAddress: string;
  branchRegion: string;
  branchCity: string;
  branchTimezone: string;
  receiptHeader: string;
  enabledModules: string[];
  paymentMethods: string[];
  defaultPaymentMethod: string;
  taxEnabled: boolean;
  pricesIncludeTax: boolean;
  taxName: string;
  taxRate: string;
  taxIdentifier: string;
  receiptBusinessName: string;
  receiptPhone: string;
  receiptAddress: string;
  receiptFooter: string;
  showTaxOnReceipt: boolean;
  receiptShowPhone: boolean;
  receiptShowAddress: boolean;
  receiptShowCashier: boolean;
  receiptShowCustomer: boolean;
  receiptShowPayment: boolean;
  receiptShowQrCode: boolean;
  receiptShowItemSku: boolean;
  receiptNumbering: 'automatic';
}

export const DEFAULT_ONBOARDING_DATA: OnboardingDraft = {
  acceptsTerms: false,
  businessName: '',
  displayName: '',
  country: 'KE',
  region: '',
  city: '',
  phone: '',
  businessEmail: '',
  website: '',
  businessSize: 'small',
  businessDescription: '',
  language: 'en',
  timezone: 'Africa/Nairobi',
  currency: 'KES',
  financialYearStart: '07-01',
  businessFamily: '',
  businessCategory: '',
  customBusinessCategory: '',
  sellsProducts: false,
  providesServices: false,
  tracksInventory: false,
  hasEmployees: false,
  multipleLocations: false,
  keepsCustomers: false,
  usesSuppliers: false,
  acceptsCash: true,
  acceptsMpesa: true,
  acceptsCard: false,
  needsTax: false,
  issuesReceipts: true,
  branchName: 'Main location',
  branchPhone: '',
  branchAddress: '',
  branchRegion: '',
  branchCity: '',
  branchTimezone: 'Africa/Nairobi',
  receiptHeader: '',
  enabledModules: ['sales', 'expenses', 'reports', 'analytics'],
  paymentMethods: ['cash', 'mpesa'],
  defaultPaymentMethod: 'cash',
  taxEnabled: false,
  pricesIncludeTax: false,
  taxName: 'VAT',
  taxRate: '16',
  taxIdentifier: '',
  receiptBusinessName: '',
  receiptPhone: '',
  receiptAddress: '',
  receiptFooter: 'Thank you for your business.',
  showTaxOnReceipt: false,
  receiptShowPhone: true,
  receiptShowAddress: true,
  receiptShowCashier: true,
  receiptShowCustomer: true,
  receiptShowPayment: true,
  receiptShowQrCode: false,
  receiptShowItemSku: false,
  receiptNumbering: 'automatic',
};

export function familyFor(id: string) {
  return BUSINESS_FAMILIES.find((family) => family.id === id);
}

export function categoriesFor(family: string) {
  return BUSINESS_CATEGORIES[family as BusinessFamilyId] ?? [];
}

export function isCategoryValidForFamily(family: string, category: string) {
  return categoriesFor(family).some((option) => option.id === category);
}

export function categoryLabel(family: string, category: string, custom = '') {
  if (family === 'other') return custom || 'Other business';
  return (
    categoriesFor(family).find((option) => option.id === category)?.name ??
    category
  );
}

export function recommendedModules(
  data: Pick<
    OnboardingDraft,
    'sellsProducts' | 'tracksInventory' | 'keepsCustomers' | 'usesSuppliers'
  >
): string[] {
  const modules = new Set<string>([
    'sales',
    'expenses',
    'reports',
    'analytics',
  ]);
  if (data.sellsProducts) {
    modules.add('pos');
    modules.add('products');
  }
  if (data.tracksInventory) {
    modules.add('products');
  }
  if (data.tracksInventory) modules.add('inventory');
  if (data.keepsCustomers) modules.add('customers');
  return WORKING_MODULES.map((module) => module.id).filter((id) =>
    modules.has(id)
  );
}
