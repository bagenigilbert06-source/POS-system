import assert from 'node:assert/strict'
import { feedbackCategory, FEEDBACK_TAGS, ratingToFeedbackScore } from '../lib/feedback/rules'
import { npsFromCounts } from '../lib/feedback/rules'

assert.equal(feedbackCategory(10), 'PROMOTER')
assert.equal(feedbackCategory(9), 'PROMOTER')
assert.equal(feedbackCategory(8), 'PASSIVE')
assert.equal(feedbackCategory(7), 'PASSIVE')
assert.equal(feedbackCategory(6), 'DETRACTOR')
assert.equal(FEEDBACK_TAGS.includes('Friendly service'), true)
assert.equal(FEEDBACK_TAGS.some(tag => /liquor|wine|alcohol/i.test(tag)), false)
assert.deepEqual([1, 2, 3, 4, 5].map(ratingToFeedbackScore), [0, 3, 6, 8, 10])
assert.throws(() => ratingToFeedbackScore(0), /1 to 5/)
assert.throws(() => ratingToFeedbackScore(6), /1 to 5/)
assert.equal(npsFromCounts(9, 2, 12), 58)
assert.equal(npsFromCounts(0, 0, 0), 0)
console.log('feedback rules tests passed')
