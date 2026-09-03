import { isPharmacyBusiness } from '../pharmacy/rules';
import { isCafeBusiness } from '../hospitality/rules';

export type ProductTerminology = Readonly<{
  title: string;
  singular: string;
  plural: string;
  singularLower: string;
  pluralLower: string;
  all: string;
  add: string;
  searchPlaceholder: string;
  importCsv: string;
  description: string;
}>;

const PHARMACY_TERMINOLOGY: ProductTerminology = {
  title: 'Medicines',
  singular: 'Medicine',
  plural: 'Medicines',
  singularLower: 'medicine',
  pluralLower: 'medicines',
  all: 'All Medicines',
  add: 'Add Medicine',
  searchPlaceholder: 'Search medicines, SKU, barcode...',
  importCsv: 'Import Medicines CSV',
  description: 'Manage medicines, pricing, stock and dispensing details.',
};

const LIQUOR_TERMINOLOGY: ProductTerminology = {
  title: 'Stock Items',
  singular: 'Item',
  plural: 'Items',
  singularLower: 'item',
  pluralLower: 'items',
  all: 'All Items',
  add: 'Add Item',
  searchPlaceholder: 'Search items, SKU, barcode...',
  importCsv: 'Import Items CSV',
  description: 'Manage store items, pricing, categories and stock setup.',
};

const CAFE_TERMINOLOGY: ProductTerminology = {
  title: 'Menu Items',
  singular: 'Menu Item',
  plural: 'Menu Items',
  singularLower: 'menu item',
  pluralLower: 'menu items',
  all: 'All Menu Items',
  add: 'Add Menu Item',
  searchPlaceholder: 'Search menu items, SKU, barcode...',
  importCsv: 'Import Menu Items CSV',
  description: 'Manage your café menu, pricing, categories and availability.',
};

const DEFAULT_TERMINOLOGY: ProductTerminology = {
  title: 'Products',
  singular: 'Product',
  plural: 'Products',
  singularLower: 'product',
  pluralLower: 'products',
  all: 'All Products',
  add: 'Add Product',
  searchPlaceholder: 'Search products, SKU, barcode...',
  importCsv: 'Import Products CSV',
  description: 'Manage your product catalog, pricing and stock setup.',
};

export function getProductTerminology(
  businessType?: string | null,
  businessCategory?: string | null
): ProductTerminology {
  const family = businessType ?? '';
  const category = (businessCategory ?? '').toLowerCase();

  if (isPharmacyBusiness(family, category)) return PHARMACY_TERMINOLOGY;
  if (category === 'liquor_shop') return LIQUOR_TERMINOLOGY;
  if (isCafeBusiness(family, category)) return CAFE_TERMINOLOGY;
  return DEFAULT_TERMINOLOGY;
}

export function countProductTerm(
  terminology: ProductTerminology,
  count: number
): string {
  return count === 1 ? terminology.singularLower : terminology.pluralLower;
}
