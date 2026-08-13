import assert from 'node:assert/strict'
import { estimatedStockCoverDays, inventoryStatus, recommendedOrderQuantity, stockVariance } from '../lib/inventory/rules'

assert.equal(inventoryStatus(0, 5), 'out')
assert.equal(inventoryStatus(3, 5), 'low')
assert.equal(inventoryStatus(6, 5), 'healthy')
assert.equal(stockVariance(12, 9), -3)
assert.equal(stockVariance(12, 15), 3)
assert.equal(recommendedOrderQuantity(3, 5, 4), 7, 'replenishment should restore twice the safety level')
assert.equal(recommendedOrderQuantity(3, 5, 20), 17, 'recent demand should raise the replenishment target')
assert.equal(recommendedOrderQuantity(8, 5, 20), 0, 'healthy stock should not be replenished automatically')
assert.equal(estimatedStockCoverDays(15, 30), 15)
assert.equal(estimatedStockCoverDays(15, 0), null)

console.log('Inventory rules unit test passed')
