import assert from 'node:assert/strict'
import { feedbackCategory, FEEDBACK_TAGS } from '../lib/feedback/service'

assert.equal(feedbackCategory(10), 'PROMOTER')
assert.equal(feedbackCategory(9), 'PROMOTER')
assert.equal(feedbackCategory(8), 'PASSIVE')
assert.equal(feedbackCategory(7), 'PASSIVE')
assert.equal(feedbackCategory(6), 'DETRACTOR')
assert.equal(FEEDBACK_TAGS.includes('Friendly service'), true)
assert.equal(FEEDBACK_TAGS.some(tag => /liquor|wine|alcohol/i.test(tag)), false)
console.log('feedback rules tests passed')
