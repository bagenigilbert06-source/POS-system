/** Register-shift time is derived from persisted POS session timestamps.
 * It deliberately has no relationship to attendance or payroll hours. */
export function registerShiftDurationMinutes(openedAt: Date | string, endedAt: Date | string = new Date()) {
  return Math.max(0, Math.floor((new Date(endedAt).getTime() - new Date(openedAt).getTime()) / 60_000))
}

export function formatRegisterShiftDuration(minutes: number) {
  const safeMinutes = Math.max(0, Math.floor(minutes))
  const hours = Math.floor(safeMinutes / 60)
  const remainingMinutes = safeMinutes % 60
  return hours ? `${hours}h ${String(remainingMinutes).padStart(2, '0')}m` : `${remainingMinutes}m`
}
