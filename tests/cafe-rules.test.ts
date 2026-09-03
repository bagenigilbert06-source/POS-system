import assert from 'node:assert/strict';
import test from 'node:test';
import {
  aggregateRecipeRequirements,
  cafeTableStatusForOrder,
  convertCafeQuantityToBase,
  nextCafePreparationStatus,
  recipeAvailability,
  validateCafeModifierSelections,
} from '../lib/cafe/rules';

test('café ingredient units convert into one authoritative base balance', () => {
  assert.equal(
    convertCafeQuantityToBase({
      quantity: 5,
      enteredUnit: 'litres',
      productBaseUnit: 'ml',
    }),
    5000
  );
  assert.equal(
    convertCafeQuantityToBase({
      quantity: 2.5,
      enteredUnit: 'kg',
      productBaseUnit: 'g',
    }),
    2500
  );
  assert.equal(
    convertCafeQuantityToBase({
      quantity: 3,
      enteredUnit: 'packs',
      productBaseUnit: 'pieces',
      packSize: 12,
    }),
    36
  );
  assert.throws(
    () =>
      convertCafeQuantityToBase({
        quantity: 1,
        enteredUnit: 'kg',
        productBaseUnit: 'ml',
      }),
    /cannot be converted/
  );
});

test('required, single and multiple modifier limits are enforced', () => {
  const groups = [
    {
      id: 'milk',
      selectionType: 'single',
      minimumSelections: 1,
      maximumSelections: 1,
      optionIds: ['regular', 'oat'],
    },
    {
      id: 'extras',
      selectionType: 'multiple',
      minimumSelections: 0,
      maximumSelections: 2,
      optionIds: ['shot', 'syrup', 'cream'],
    },
  ];
  assert.doesNotThrow(() =>
    validateCafeModifierSelections(groups, ['oat', 'shot'])
  );
  assert.throws(
    () => validateCafeModifierSelections(groups, ['shot']),
    /at least 1/
  );
  assert.throws(
    () => validateCafeModifierSelections(groups, ['oat', 'regular']),
    /no more than 1/
  );
  assert.throws(
    () => validateCafeModifierSelections(groups, ['oat', 'unknown']),
    /not available/
  );
});

test('size and modifier recipe rows aggregate exact sale consumption', () => {
  const requirements = aggregateRecipeRequirements(
    [
      {
        ingredientProductId: 'coffee',
        ingredientName: 'Coffee beans',
        quantityBase: 18,
      },
      {
        ingredientProductId: 'milk',
        ingredientName: 'Oat milk',
        quantityBase: 220,
      },
      {
        ingredientProductId: 'coffee',
        ingredientName: 'Coffee beans',
        quantityBase: 18,
      },
    ],
    2
  );
  assert.deepEqual(requirements, [
    {
      ingredientProductId: 'coffee',
      ingredientName: 'Coffee beans',
      quantityBase: 72,
    },
    {
      ingredientProductId: 'milk',
      ingredientName: 'Oat milk',
      quantityBase: 440,
    },
  ]);
});

test('availability blocks only recipes missing their own ingredients', () => {
  assert.deepEqual(
    recipeAvailability(
      [
        {
          ingredientProductId: 'milk',
          ingredientName: 'Milk',
          quantityBase: 220,
        },
      ],
      new Map([['milk', 100]])
    ),
    { available: false, blockingIngredients: ['Milk'] }
  );
  assert.deepEqual(
    recipeAvailability(
      [
        {
          ingredientProductId: 'coffee',
          ingredientName: 'Coffee',
          quantityBase: 18,
        },
      ],
      new Map([['coffee', 100]])
    ),
    { available: true, blockingIngredients: [] }
  );
});

test('modifier recipe rows can replace, rather than double-consume, a base ingredient', () => {
  const requirements = aggregateRecipeRequirements([
    {
      ingredientProductId: 'coffee',
      ingredientName: 'Coffee beans',
      quantityBase: 18,
    },
    { ingredientProductId: 'milk', ingredientName: 'Milk', quantityBase: 220 },
    { ingredientProductId: 'cup', ingredientName: 'Cup', quantityBase: 1 },
    { ingredientProductId: 'milk', ingredientName: 'Milk', quantityBase: -220 },
    {
      ingredientProductId: 'oat',
      ingredientName: 'Oat milk',
      quantityBase: 220,
    },
  ]);
  assert.deepEqual(requirements, [
    {
      ingredientProductId: 'coffee',
      ingredientName: 'Coffee beans',
      quantityBase: 18,
    },
    { ingredientProductId: 'cup', ingredientName: 'Cup', quantityBase: 1 },
    {
      ingredientProductId: 'oat',
      ingredientName: 'Oat milk',
      quantityBase: 220,
    },
  ]);
  assert.throws(
    () =>
      aggregateRecipeRequirements([
        {
          ingredientProductId: 'milk',
          ingredientName: 'Milk',
          quantityBase: -220,
        },
      ]),
    /removes more/
  );
});

test('preparation and table states follow the operational workflow', () => {
  assert.equal(nextCafePreparationStatus('new'), 'preparing');
  assert.equal(nextCafePreparationStatus('preparing'), 'ready');
  assert.equal(nextCafePreparationStatus('ready'), 'completed');
  assert.throws(
    () => nextCafePreparationStatus('completed'),
    /already completed/
  );
  assert.equal(
    cafeTableStatusForOrder({
      orderType: 'dine_in',
      paid: false,
      completed: false,
    }),
    'awaiting_payment'
  );
  assert.equal(
    cafeTableStatusForOrder({
      orderType: 'dine_in',
      paid: true,
      completed: false,
    }),
    'occupied'
  );
  assert.equal(
    cafeTableStatusForOrder({
      orderType: 'takeaway',
      paid: false,
      completed: false,
    }),
    'available'
  );
});
