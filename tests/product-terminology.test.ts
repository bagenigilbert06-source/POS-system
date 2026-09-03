import assert from 'node:assert/strict';
import test from 'node:test';
import { getProductTerminology } from '../lib/products/terminology';

test('café workspace gets menu terminology without liquor wording', () => {
  const terms = getProductTerminology('food_hospitality', 'cafe');
  assert.equal(terms.add, 'Add Menu Item');
  assert.equal(terms.title, 'Menu Items');
  assert.doesNotMatch(`${terms.add} ${terms.description}`, /liquor|bottle/i);
});

test('liquor terminology stays scoped to liquor stores', () => {
  const terms = getProductTerminology('retail', 'liquor_shop');
  assert.equal(terms.add, 'Add Item');
  assert.equal(terms.title, 'Stock Items');
});

test('pharmacy workspace keeps medicine terminology', () => {
  const terms = getProductTerminology('health_wellness', 'health_pharmacy');
  assert.equal(terms.add, 'Add Medicine');
  assert.equal(terms.title, 'Medicines');
});
