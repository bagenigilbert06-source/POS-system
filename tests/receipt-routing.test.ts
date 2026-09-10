import assert from 'node:assert/strict';
import fs from 'node:fs';

const sidebar = fs.readFileSync(
  'components/layout/dynamic-app-sidebar.tsx',
  'utf8'
);
const legacy = fs.readFileSync('app/dashboard/pos/history/page.tsx', 'utf8');
const query = fs.readFileSync('app/actions/pos-queries.ts', 'utf8');
const proxy = fs.readFileSync('proxy.ts', 'utf8');

assert.match(sidebar, /route: '\/dashboard\/receipts'/);
assert.match(legacy, /redirect\('\/dashboard\/receipts'\)/);
assert.match(
  query,
  /context\.viewAll \? undefined : eq\(sale\.userId, context\.userId\)/
);
assert.match(proxy, /pathname\.startsWith\('\/dashboard\/receipts'\)/);
console.log('Receipt routing and cashier ownership rules passed');
