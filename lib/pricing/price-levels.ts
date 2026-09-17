export const PRICE_LEVELS = ['retail', 'wholesale'] as const;
export type PriceLevel = (typeof PRICE_LEVELS)[number];

export function resolvePriceLevel(customer?: { priceLevel?: string | null } | null): PriceLevel {
  return customer?.priceLevel?.toLowerCase() === 'wholesale' ? 'wholesale' : 'retail';
}

export function resolveUnitPrice(input: {
  retailPrice: number | string;
  wholesalePrice?: number | string | null;
  priceLevel: PriceLevel;
}) {
  const retailPrice = Number(input.retailPrice);
  const configuredWholesale =
    input.wholesalePrice !== null && input.wholesalePrice !== undefined && input.wholesalePrice !== '';
  const wholesalePrice = configuredWholesale ? Number(input.wholesalePrice) : null;
  const useWholesale = input.priceLevel === 'wholesale' && wholesalePrice !== null && Number.isFinite(wholesalePrice);
  return {
    unitPrice: useWholesale ? wholesalePrice : retailPrice,
    retailPrice,
    priceLevel: useWholesale ? ('wholesale' as const) : ('retail' as const),
    wholesaleFallback: input.priceLevel === 'wholesale' && !useWholesale,
  };
}
