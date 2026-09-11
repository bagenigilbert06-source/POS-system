/** Pure guards shared by callback routing and test coverage. */
export function matchesBranchTill(input: { configuredTill: string | null; callbackShortcode: string; manualTillEnabled: boolean }) {
  return input.manualTillEnabled && Boolean(input.configuredTill) && input.configuredTill === input.callbackShortcode.trim()
}

export function callbackAmountMatches(expected: string | number, received: string | number) {
  return Number.isFinite(Number(received)) && Number(expected) === Number(received)
}
