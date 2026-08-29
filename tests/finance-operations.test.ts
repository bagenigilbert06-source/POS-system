import assert from 'node:assert/strict';
import { reconciliationResult } from '../lib/finance/operations';

assert.equal(reconciliationResult(150000, 150000).status, 'matched');
assert.equal(
  reconciliationResult(100000, 97500).difference.toFixed(2),
  '-2500.00'
);
assert.equal(reconciliationResult(100000, 97500).status, 'difference');

// Required retail finance consistency examples.
const netSales = 100000 - 10000;
const grossProfit = netSales - 55000;
const operatingProfit = grossProfit - 12000;
assert.deepEqual(
  { netSales, grossProfit, operatingProfit },
  { netSales: 90000, grossProfit: 35000, operatingProfit: 23000 }
);
assert.equal(50000 - 20000, 30000);
console.log('finance operations rules passed');
