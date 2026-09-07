import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { and, eq } from 'drizzle-orm'

export type EtimsSecretScope = { organizationId: string; branchId: string; provider: string; environment: string }
export type EncryptedSecret = { ciphertext: string; iv: string; authTag: string; keyVersion: number }

function aad(scope: EtimsSecretScope, name: string) { return Buffer.from(JSON.stringify([scope.organizationId, scope.branchId, scope.provider, scope.environment, name]), 'utf8') }

export function readEtimsMasterKey() {
  const encoded = process.env.ETIMS_SECRET_ENCRYPTION_KEY
  const version = Number(process.env.ETIMS_SECRET_KEY_VERSION ?? '1')
  if (!encoded) throw new Error('eTIMS secret encryption is not configured')
  const key = Buffer.from(encoded, 'base64')
  if (key.length !== 32 || !Number.isInteger(version) || version < 1) throw new Error('eTIMS secret encryption configuration is invalid')
  return { key, version }
}

export function encryptEtimsSecret(value: string, scope: EtimsSecretScope, name: string, material = readEtimsMasterKey()): EncryptedSecret {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', material.key, iv)
  cipher.setAAD(aad(scope, name))
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  return { ciphertext: ciphertext.toString('base64'), iv: iv.toString('base64'), authTag: cipher.getAuthTag().toString('base64'), keyVersion: material.version }
}

export function decryptEtimsSecret(envelope: EncryptedSecret, scope: EtimsSecretScope, name: string, material = readEtimsMasterKey()) {
  if (envelope.keyVersion !== material.version) throw new Error('eTIMS secret key version is unavailable')
  const decipher = createDecipheriv('aes-256-gcm', material.key, Buffer.from(envelope.iv, 'base64'))
  decipher.setAAD(aad(scope, name)); decipher.setAuthTag(Buffer.from(envelope.authTag, 'base64'))
  return Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext, 'base64')), decipher.final()]).toString('utf8')
}

export interface EtimsSecretStore {
  getBranchSecret(scope: EtimsSecretScope, name: string): Promise<string | null>
  setBranchSecret(scope: EtimsSecretScope, name: string, value: string): Promise<void>
  deleteBranchSecret(scope: EtimsSecretScope, name: string): Promise<void>
  hasBranchSecret(scope: EtimsSecretScope, name: string): Promise<boolean>
}

export class DatabaseEtimsSecretStore implements EtimsSecretStore {
  async getBranchSecret(scope: EtimsSecretScope, name: string) {
    const [{ db }, { etimsBranchSecret }] = await Promise.all([import('../db'), import('../db/schema')])
    const [row] = await db.select({ ciphertext: etimsBranchSecret.ciphertext, iv: etimsBranchSecret.iv, authTag: etimsBranchSecret.authTag, keyVersion: etimsBranchSecret.keyVersion }).from(etimsBranchSecret).where(this.where(scope, name, etimsBranchSecret)).limit(1)
    return row ? decryptEtimsSecret(row, scope, name) : null
  }
  async setBranchSecret(scope: EtimsSecretScope, name: string, value: string) {
    const [{ db }, { etimsBranchSecret }] = await Promise.all([import('../db'), import('../db/schema')])
    const encrypted = encryptEtimsSecret(value, scope, name)
    await db.insert(etimsBranchSecret).values({ ...scope, secretName: name, ...encrypted }).onConflictDoUpdate({ target: [etimsBranchSecret.organizationId, etimsBranchSecret.branchId, etimsBranchSecret.provider, etimsBranchSecret.environment, etimsBranchSecret.secretName], set: { ...encrypted, updatedAt: new Date() } })
  }
  async deleteBranchSecret(scope: EtimsSecretScope, name: string) { const [{ db }, { etimsBranchSecret }] = await Promise.all([import('../db'), import('../db/schema')]); await db.delete(etimsBranchSecret).where(this.where(scope, name, etimsBranchSecret)) }
  async hasBranchSecret(scope: EtimsSecretScope, name: string) { const [{ db }, { etimsBranchSecret }] = await Promise.all([import('../db'), import('../db/schema')]); const [row] = await db.select({ name: etimsBranchSecret.secretName }).from(etimsBranchSecret).where(this.where(scope, name, etimsBranchSecret)).limit(1); return Boolean(row) }
  private where(scope: EtimsSecretScope, name: string, table?: typeof import('../db/schema').etimsBranchSecret) { const value = table!; return and(eq(value.organizationId, scope.organizationId), eq(value.branchId, scope.branchId), eq(value.provider, scope.provider), eq(value.environment, scope.environment), eq(value.secretName, name)) }
}

export function redactEtimsSecrets(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactEtimsSecrets)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).filter(([key]) => !['cmckey', 'credential', 'secret', 'token', 'privatekey'].some((term) => key.toLowerCase().includes(term))).map(([key, item]) => [key, redactEtimsSecrets(item)]))
}
