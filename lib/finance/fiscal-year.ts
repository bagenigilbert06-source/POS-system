const FISCAL_YEAR_START = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/

export function fiscalYearStart(referenceDate: Date, configuredStart?: string | null) {
  const start = configuredStart && FISCAL_YEAR_START.test(configuredStart) ? configuredStart : '07-01'
  const [month, day] = start.split('-').map(Number)
  const currentYearStart = new Date(Date.UTC(referenceDate.getUTCFullYear(), month - 1, day))

  return referenceDate < currentYearStart
    ? new Date(Date.UTC(referenceDate.getUTCFullYear() - 1, month - 1, day))
    : currentYearStart
}

export function fiscalYearLabel(from: Date, to: Date, locale = 'en-KE') {
  const format = (date: Date) => date.toLocaleDateString(locale, { month: 'short', year: 'numeric', timeZone: 'UTC' })
  return `${format(from)} – ${format(to)}`
}
