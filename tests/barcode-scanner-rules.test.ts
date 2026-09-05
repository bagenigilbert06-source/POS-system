import assert from 'node:assert/strict';
import { normalizeBarcode } from '../lib/utils';

assert.equal(normalizeBarcode('0012345678905\r\n'), '0012345678905');
assert.equal(normalizeBarcode('\u00025000267024233\u0003'), '5000267024233');
assert.equal(normalizeBarcode(' CODE-128-ABC '), 'CODE-128-ABC');
assert.equal(normalizeBarcode(''), '');
console.log('Barcode scanner normalization tests passed');
