import { normalizeKenyanPhone } from './daraja'

export type MpesaPhoneMode = 'stk' | 'till' | 'paybill'

/** STK requires a valid Kenyan mobile number; manual modes accept an absent phone. */
export function normalizeMpesaPhoneForMode(mode: MpesaPhoneMode, value?: string | null) {
  const phone = value?.trim() ?? ''
  if (mode !== 'stk' && !phone) return ''
  return normalizeKenyanPhone(phone)
}
