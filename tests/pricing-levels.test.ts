import assert from 'node:assert/strict';
import { resolvePriceLevel, resolveUnitPrice } from '../lib/pricing/price-levels';

assert.equal(resolvePriceLevel(), 'retail');
assert.equal(resolvePriceLevel({ priceLevel: 'retail' }), 'retail');
assert.equal(resolvePriceLevel({ priceLevel: 'wholesale' }), 'wholesale');
assert.equal(resolvePriceLevel({ priceLevel: 'WHOLESALE' }), 'wholesale');
assert.equal(resolvePriceLevel({}), 'retail');
assert.equal(resolveUnitPrice({ retailPrice: 1250, wholesalePrice: 1050, priceLevel: 'retail' }).unitPrice, 1250);
assert.deepEqual(resolveUnitPrice({ retailPrice: 1250, wholesalePrice: 1050, priceLevel: 'wholesale' }), { unitPrice: 1050, retailPrice: 1250, priceLevel: 'wholesale', wholesaleFallback: false });
assert.deepEqual(resolveUnitPrice({ retailPrice: 1250, wholesalePrice: null, priceLevel: 'wholesale' }), { unitPrice: 1250, retailPrice: 1250, priceLevel: 'retail', wholesaleFallback: true });
assert.equal(resolveUnitPrice({ retailPrice: 1250, wholesalePrice: 0, priceLevel: 'wholesale' }).unitPrice, 0);
assert.deepEqual(resolveUnitPrice({ retailPrice: 13200, wholesalePrice: 11800, priceLevel: 'wholesale' }), { unitPrice: 11800, retailPrice: 13200, priceLevel: 'wholesale', wholesaleFallback: false });
assert.equal(resolveUnitPrice({ retailPrice: 13200, wholesalePrice: null, priceLevel: 'wholesale' }).unitPrice, 13200);
console.log('pricing level rules passed');
