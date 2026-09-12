export function receiptLogoForTemplate(
  template: 'classic' | 'logo' | 'cafe',
  logoUrl: string | null | undefined
) {
  return template === 'logo' ? logoUrl?.trim() || '' : ''
}
