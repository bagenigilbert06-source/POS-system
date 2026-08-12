export const POS_PIN_LENGTH = 6
export const POS_PIN_MAX_ATTEMPTS = 5
export const POS_PIN_LOCK_MINUTES = 15
const weakPins = new Set(['000000', '111111', '222222', '333333', '444444', '555555', '666666', '777777', '888888', '999999', '123456', '654321'])
export function validatePosPin(pin: string) {
  if (!new RegExp(`^\\d{${POS_PIN_LENGTH}}$`).test(pin)) return 'PIN must contain exactly 6 digits'
  if (weakPins.has(pin)) return 'Choose a less predictable PIN'
  return null
}
