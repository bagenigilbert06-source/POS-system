import assert from 'node:assert/strict';
import { hardwareTemplate } from '../lib/templates/retail/hardware';
import { resolveOnboardingTemplateId } from '../lib/templates';

const categoryNames = hardwareTemplate.starterCategories.map((item) => item.name);
const productSkus = hardwareTemplate.starterProducts.map((item) => item.sku);

assert.equal(hardwareTemplate.id, 'retail.hardware');
assert.equal(categoryNames.length, 7, 'the authoritative Hardware template should define seven categories');
assert.equal(new Set(categoryNames).size, categoryNames.length, 'Hardware category names must be unique');
assert.equal(productSkus.length, 7, 'the authoritative Hardware template should define seven starter products');
assert.equal(new Set(productSkus).size, productSkus.length, 'Hardware starter SKUs must be unique');
assert.ok(
  hardwareTemplate.starterProducts.every((item) => categoryNames.includes(item.category)),
  'every starter product must reference a Hardware template category'
);
assert.ok(
  hardwareTemplate.starterProducts.every((item) => item.stock === 0),
  'catalogue initialization must never advertise fake opening stock'
);
assert.equal(resolveOnboardingTemplateId('retail', 'hardware'), 'retail.hardware');
assert.notEqual(resolveOnboardingTemplateId('retail', 'general_shop'), 'retail.hardware');
assert.notEqual(resolveOnboardingTemplateId('food_hospitality', 'cafe'), 'retail.hardware');

console.log('Hardware catalogue template test passed');
