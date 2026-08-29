const parts = (date: Date, timeZone: string) => {
  const values = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(date)
  const map = Object.fromEntries(values.map((part) => [part.type, part.value]))
  return { year: Number(map.year), month: Number(map.month), day: Number(map.day), hour: Number(map.hour), minute: Number(map.minute), second: Number(map.second) }
}

/** Converts an organization-local wall time to a UTC Date without assuming a fixed offset. */
export function zonedDateTimeToUtc(timeZone: string, year: number, month: number, day: number, hour = 0, minute = 0, second = 0) {
  const desired = Date.UTC(year, month - 1, day, hour, minute, second)
  let result = new Date(desired)
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const actual = parts(result, timeZone)
    const represented = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, actual.second)
    result = new Date(result.getTime() + desired - represented)
  }
  return result
}

export function organizationDateBoundaries(timeZone: string, now = new Date()) {
  const local = parts(now, timeZone)
  const today = zonedDateTimeToUtc(timeZone, local.year, local.month, local.day)
  const day = (offset: number) => zonedDateTimeToUtc(timeZone, local.year, local.month, local.day + offset)
  const monthStart = zonedDateTimeToUtc(timeZone, local.year, local.month, 1)
  const nextMonthStart = zonedDateTimeToUtc(timeZone, local.year, local.month + 1, 1)
  return { today, day, monthStart, nextMonthStart }
}

export type AgeBucket = 'current' | '1-30' | '31-60' | '61-90' | '90+'

export function receivableAge(dueDate: Date | null, timeZone: string, now = new Date()): { days: number; bucket: AgeBucket } {
  if (!dueDate) return { days: 0, bucket: 'current' as const }
  const current = parts(now, timeZone)
  const due = parts(dueDate, timeZone)
  const days = Math.max(0, Math.floor((Date.UTC(current.year, current.month - 1, current.day) - Date.UTC(due.year, due.month - 1, due.day)) / 86_400_000))
  const bucket: AgeBucket = days === 0 ? 'current' : days <= 30 ? '1-30' : days <= 60 ? '31-60' : days <= 90 ? '61-90' : '90+'
  return { days, bucket }
}
