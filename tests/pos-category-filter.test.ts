import assert from 'node:assert/strict'
import { getSellableCategoryData } from '../lib/pos/category-filter'

const result = getSellableCategoryData([
  { categoryId: 'beer', isActive: true, stock: 3, imageUrl: '/beer.png' },
  { categoryId: 'beer', isActive: true, stock: 0 },
  { categoryId: 'wine', isActive: true, stock: 0 },
  { categoryId: 'spirits', isActive: false, stock: 9 },
], [{ id: 'beer', name: 'Beer' }, { id: 'wine', name: 'Wine' }, { id: 'spirits', name: 'Spirits' }, { id: 'empty', name: 'Empty' }])

assert.deepEqual(result.visibleCategories.map(({ id }) => id), ['beer'])
assert.equal(result.counts.get('beer'), 1)
assert.equal(result.counts.has('wine'), false)
assert.equal(result.sellableProducts.length, 1)
console.log('POS category filter test passed')
