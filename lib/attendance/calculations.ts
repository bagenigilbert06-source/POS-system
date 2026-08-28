export type AttendanceBreak = { startedAt: Date; endedAt: Date | null }

export function breakMilliseconds(breaks: AttendanceBreak[], now = new Date()) {
  return breaks.reduce((total, item) => total + Math.max(0, (item.endedAt ?? now).getTime() - item.startedAt.getTime()), 0)
}

export function workedMilliseconds(clockInAt: Date, clockOutAt: Date | null, breaks: AttendanceBreak[], now = new Date()) {
  return Math.max(0, (clockOutAt ?? now).getTime() - clockInAt.getTime() - breakMilliseconds(breaks, now))
}

export function formatDuration(milliseconds: number) {
  const minutes = Math.floor(milliseconds / 60_000)
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`
}

export function localWorkDate(date: Date, timezone: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}
