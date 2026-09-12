/** Keep the configured trading name consistent in navigation, admin and print UI. */
export function cleanBusinessDisplayName(
  value: string | null | undefined,
  fallback = 'Business name not configured'
) {
  return value?.trim().replace(/\s+/g, ' ') || fallback
}
