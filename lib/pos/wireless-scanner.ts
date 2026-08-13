import { createHash, randomBytes } from 'node:crypto'

export const WIRELESS_SCANNER_TTL_MS = 30 * 60 * 1000

export function createWirelessScannerToken() {
  return randomBytes(32).toString('base64url')
}

export function hashWirelessScannerToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}
