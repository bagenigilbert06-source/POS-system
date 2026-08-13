import { createHash, randomBytes } from 'node:crypto'

/** Long enough for a full trading day, while still limiting the lifetime of a shared QR link. */
export const WIRELESS_SCANNER_TTL_MS = 12 * 60 * 60 * 1000

export function createWirelessScannerToken() {
  return randomBytes(32).toString('base64url')
}

export function hashWirelessScannerToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}
