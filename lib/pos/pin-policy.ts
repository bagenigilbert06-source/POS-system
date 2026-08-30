export const POS_PIN_LENGTH = 6
export const POS_PIN_MAX_ATTEMPTS = 5
export const POS_PIN_LOCK_MINUTES = 15
const weakPins = new Set(['000000', '111111', '222222', '333333', '444444', '555555', '666666', '777777', '888888', '999999', '123456', '654321'])
export function validatePosPin(pin: string) {
  if (!new RegExp(`^\\d{${POS_PIN_LENGTH}}$`).test(pin)) return 'PIN must contain exactly 6 digits'
  if (weakPins.has(pin)) return 'Choose a less predictable PIN'
  return null
}

export type PosPinCandidate = { userId: string; pinHash: string }

/**
 * Returns every owner whose stored hash matches a PIN. Callers must reject
 * anything other than one match: accepting the first match would make a
 * duplicate PIN authenticate an arbitrary cashier.
 */
export async function findPosPinOwners(
  pin: string,
  candidates: readonly PosPinCandidate[],
  verify: (candidate: PosPinCandidate, pin: string) => Promise<boolean>
) {
  const owners: string[] = []
  for (const candidate of candidates) {
    if (await verify(candidate, pin)) owners.push(candidate.userId)
  }
  return owners
}
