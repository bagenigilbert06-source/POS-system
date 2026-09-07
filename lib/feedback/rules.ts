export const FEEDBACK_TAGS = ['Friendly service', 'Fast checkout', 'Product availability', 'Staff helpfulness', 'Store cleanliness', 'Pricing', 'Waiting time', 'Other'] as const
export function feedbackCategory(score: number) {
  return score >= 9 ? 'PROMOTER' : score >= 7 ? 'PASSIVE' : 'DETRACTOR'
}
export function npsFromCounts(promoters: number, detractors: number, responses: number) {
  return responses ? Math.round(((promoters - detractors) / responses) * 100) : 0
}
