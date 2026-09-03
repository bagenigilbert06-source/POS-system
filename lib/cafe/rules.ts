export const CAFE_ORDER_TYPES = ['takeaway', 'dine_in', 'delivery'] as const;
export type CafeOrderType = (typeof CAFE_ORDER_TYPES)[number];

export const CAFE_PREPARATION_STATUSES = [
  'new',
  'preparing',
  'ready',
  'completed',
] as const;
export type CafePreparationStatus = (typeof CAFE_PREPARATION_STATUSES)[number];

export const CAFE_WASTAGE_REASONS = [
  'spoilage',
  'expired',
  'preparation_waste',
  'dropped_spilled',
  'damaged',
  'staff_meal',
  'other',
] as const;

const UNIT_ALIASES: Record<string, string> = {
  kilogram: 'kg',
  kilograms: 'kg',
  kg: 'kg',
  gram: 'g',
  grams: 'g',
  g: 'g',
  litre: 'l',
  litres: 'l',
  liter: 'l',
  liters: 'l',
  l: 'l',
  millilitre: 'ml',
  millilitres: 'ml',
  milliliter: 'ml',
  milliliters: 'ml',
  ml: 'ml',
  piece: 'pcs',
  pieces: 'pcs',
  pc: 'pcs',
  pcs: 'pcs',
  each: 'pcs',
  unit: 'pcs',
  units: 'pcs',
  pack: 'pack',
  packs: 'pack',
};

const BASE_UNIT: Record<string, string> = {
  kg: 'g',
  g: 'g',
  l: 'ml',
  ml: 'ml',
  pcs: 'pcs',
  pack: 'pack',
};

const BASE_FACTOR: Record<string, number> = {
  kg: 1000,
  g: 1,
  l: 1000,
  ml: 1,
  pcs: 1,
  pack: 1,
};

export function normalizeCafeUnit(unit: string): string {
  return UNIT_ALIASES[unit.trim().toLowerCase()] ?? unit.trim().toLowerCase();
}

export function cafeBaseUnit(unit: string): string {
  const normalized = normalizeCafeUnit(unit);
  return BASE_UNIT[normalized] ?? normalized;
}

export function convertCafeQuantityToBase(input: {
  quantity: number;
  enteredUnit: string;
  productBaseUnit: string;
  packSize?: number;
}): number {
  if (!Number.isFinite(input.quantity) || input.quantity <= 0)
    throw new Error('Quantity must be greater than zero');
  const entered = normalizeCafeUnit(input.enteredUnit);
  const expectedBase = cafeBaseUnit(input.productBaseUnit);
  const enteredBase = cafeBaseUnit(entered);
  if (entered === 'pack') {
    if (!Number.isInteger(input.packSize) || Number(input.packSize) <= 0)
      throw new Error('A pack conversion is required');
    if (expectedBase !== cafeBaseUnit(input.productBaseUnit))
      throw new Error('Pack unit is incompatible with this ingredient');
    return input.quantity * Number(input.packSize);
  }
  if (enteredBase !== expectedBase)
    throw new Error(
      `${input.enteredUnit} cannot be converted to ${input.productBaseUnit}`
    );
  const converted = input.quantity * (BASE_FACTOR[entered] ?? 1);
  if (!Number.isSafeInteger(converted))
    throw new Error(`Use a quantity that converts to a whole ${expectedBase}`);
  return converted;
}

export type CafeModifierGroupRule = {
  id: string;
  selectionType: string;
  minimumSelections: number;
  maximumSelections: number;
  optionIds: string[];
};

export function validateCafeModifierSelections(
  groups: CafeModifierGroupRule[],
  selectedOptionIds: string[]
): void {
  if (new Set(selectedOptionIds).size !== selectedOptionIds.length)
    throw new Error('A modifier option can only be selected once');
  const allowed = new Set(groups.flatMap((group) => group.optionIds));
  if (selectedOptionIds.some((id) => !allowed.has(id)))
    throw new Error('A selected modifier is not available for this menu item');
  for (const group of groups) {
    const selected = group.optionIds.filter((id) =>
      selectedOptionIds.includes(id)
    );
    const maximum =
      group.selectionType === 'single'
        ? Math.min(1, group.maximumSelections)
        : group.maximumSelections;
    if (selected.length < group.minimumSelections)
      throw new Error(
        `Select at least ${group.minimumSelections} option${group.minimumSelections === 1 ? '' : 's'}`
      );
    if (selected.length > maximum)
      throw new Error(
        `Select no more than ${maximum} option${maximum === 1 ? '' : 's'}`
      );
  }
}

export type RecipeRequirement = {
  ingredientProductId: string;
  ingredientName: string;
  quantityBase: number;
};

export function aggregateRecipeRequirements(
  rows: RecipeRequirement[],
  saleQuantity = 1
): RecipeRequirement[] {
  if (!Number.isInteger(saleQuantity) || saleQuantity <= 0)
    throw new Error('Sale quantity must be a positive whole number');
  const totals = new Map<string, RecipeRequirement>();
  for (const row of rows) {
    const quantityBase = row.quantityBase * saleQuantity;
    if (!Number.isSafeInteger(quantityBase) || quantityBase === 0)
      throw new Error(
        `Recipe quantity for ${row.ingredientName} must resolve to a whole base unit`
      );
    const existing = totals.get(row.ingredientProductId);
    totals.set(row.ingredientProductId, {
      ...row,
      quantityBase: (existing?.quantityBase ?? 0) + quantityBase,
    });
  }
  return [...totals.values()]
    .filter((row) => row.quantityBase !== 0)
    .map((row) => {
      if (row.quantityBase < 0)
        throw new Error(
          `Modifier recipe removes more ${row.ingredientName} than the base recipe uses`
        );
      return row;
    });
}

export function recipeAvailability(
  requirements: RecipeRequirement[],
  availableByIngredient: ReadonlyMap<string, number>
): { available: boolean; blockingIngredients: string[] } {
  const blockingIngredients = requirements
    .filter(
      (row) =>
        (availableByIngredient.get(row.ingredientProductId) ?? 0) <
        row.quantityBase
    )
    .map((row) => row.ingredientName);
  return { available: blockingIngredients.length === 0, blockingIngredients };
}

const NEXT_PREPARATION_STATUS: Record<
  CafePreparationStatus,
  CafePreparationStatus | null
> = {
  new: 'preparing',
  preparing: 'ready',
  ready: 'completed',
  completed: null,
};

export function nextCafePreparationStatus(
  current: CafePreparationStatus
): CafePreparationStatus {
  const next = NEXT_PREPARATION_STATUS[current];
  if (!next) throw new Error('This preparation order is already completed');
  return next;
}

export function cafeTableStatusForOrder(input: {
  orderType: CafeOrderType;
  paid: boolean;
  completed: boolean;
}): 'available' | 'occupied' | 'awaiting_payment' {
  if (input.orderType !== 'dine_in' || input.completed) return 'available';
  return input.paid ? 'occupied' : 'awaiting_payment';
}
