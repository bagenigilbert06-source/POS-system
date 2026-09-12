export const FEEDBACK_TAGS = ['Friendly service', 'Fast checkout', 'Product availability', 'Staff helpfulness', 'Store cleanliness', 'Pricing', 'Waiting time', 'Other'] as const
export function ratingToFeedbackScore(rating: number) {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new Error('Choose a rating from 1 to 5.')
  return [0, 0, 3, 6, 8, 10][rating]
}
export function feedbackCategory(score: number) {
  return score >= 9 ? 'PROMOTER' : score >= 7 ? 'PASSIVE' : 'DETRACTOR'
}
export function npsFromCounts(promoters: number, detractors: number, responses: number) {
  return responses ? Math.round(((promoters - detractors) / responses) * 100) : 0
}
