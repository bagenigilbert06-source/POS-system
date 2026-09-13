/** Pure guards shared by callback routing and test coverage. */
export function acceptsBranchC2b(input: { configuredTill: string | null; configuredProviderIdentifier: string; callbackMerchantIdentifier: string; manualTillEnabled: boolean }) {
  return input.manualTillEnabled && Boolean(input.configuredTill) && Boolean(input.configuredProviderIdentifier) &&
    input.configuredProviderIdentifier === input.callbackMerchantIdentifier.trim()
}

export function callbackAmountMatches(expected: string | number, received: string | number) {
  return Number.isFinite(Number(received)) && Number(expected) === Number(received)
}
