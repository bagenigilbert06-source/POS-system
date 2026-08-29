import Decimal from 'decimal.js';

export function reconciliationResult(
  systemAmount: Decimal.Value,
  externalAmount: Decimal.Value
) {
  const difference = new Decimal(externalAmount)
    .minus(systemAmount)
    .toDecimalPlaces(2);

  return {
    difference,
    status: difference.isZero()
      ? ('matched' as const)
      : ('difference' as const),
  };
}
