'use server'

import { and, desc, eq, gte, lte } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db'
import { ageVerificationLog, alcoholSaleHours, complianceLicense, customer } from '@/lib/db/schema'
import { requireAnyPermission, requirePermission } from '@/lib/auth/authorization'
import { PermissionEnum } from '@/lib/types/permissions'
import { generateId } from '@/lib/utils'

const compliancePermissions = [PermissionEnum.AUDIT_LOG_VIEW, PermissionEnum.SETTINGS_VIEW] as const

export async function getComplianceOverview() {
  const authorization = await requireAnyPermission(compliancePermissions)
  const [licenses, verifications, hours] = await Promise.all([
    db.select().from(complianceLicense).where(eq(complianceLicense.orgId, authorization.organizationId)).orderBy(complianceLicense.expiryDate),
    db.select().from(ageVerificationLog).where(eq(ageVerificationLog.orgId, authorization.organizationId)).orderBy(desc(ageVerificationLog.createdAt)).limit(200),
    db.select().from(alcoholSaleHours).where(eq(alcoholSaleHours.orgId, authorization.organizationId)).orderBy(alcoholSaleHours.dayOfWeek),
  ])
  const now = Date.now()
  const normalizedLicenses = licenses.map((license) => {
    const days = Math.ceil((license.expiryDate.getTime() - now) / 86400000)
    return { ...license, computedStatus: days < 0 ? 'expired' : days <= 30 ? 'expiring_soon' : 'active', daysUntilExpiry: days }
  })
  return { licenses: normalizedLicenses, verifications, hours }
}

export async function recordAgeVerification(input: {
  transactionId?: string
  customerId?: string
  method?: 'manual' | 'scanned'
  dob?: string
  idReference?: string
}) {
  const data = z.object({
    transactionId: z.string().min(1).optional(),
    customerId: z.string().min(1).optional(),
    method: z.enum(['manual', 'scanned']).default('manual'),
    dob: z.string().optional(),
    idReference: z.string().trim().max(120).optional(),
  }).parse(input)
  const authorization = await requirePermission(PermissionEnum.POS_SELL)
  const [record] = await db.insert(ageVerificationLog).values({
    id: generateId(), transactionId: data.transactionId, customerId: data.customerId,
    cashierId: authorization.userId, method: data.method, dob: data.dob ? new Date(data.dob) : undefined,
    idReference: data.idReference || undefined, orgId: authorization.organizationId,
  }).returning()
  return record
}

export async function setCustomerBan(input: { customerId: string; banned: boolean; reason?: string }) {
  const data = z.object({ customerId: z.string().min(1), banned: z.boolean(), reason: z.string().trim().max(300).optional() }).parse(input)
  const authorization = await requirePermission(PermissionEnum.CUSTOMER_EDIT)
  const [record] = await db.update(customer).set({
    isBanned: data.banned, banReason: data.banned ? data.reason || 'No reason provided' : null, bannedAt: data.banned ? new Date() : null, updatedAt: new Date(),
  }).where(and(eq(customer.id, data.customerId), eq(customer.orgId, authorization.organizationId))).returning()
  if (!record) throw new Error('Customer not found')
  return record
}

export async function saveComplianceLicense(input: {
  id?: string; name: string; licenseNumber: string; issuingAuthority: string; issueDate: string; expiryDate: string; documentUrl?: string; notes?: string
}) {
  const data = z.object({ id: z.string().optional(), name: z.string().trim().min(2).max(120), licenseNumber: z.string().trim().min(2).max(120), issuingAuthority: z.string().trim().min(2).max(120), issueDate: z.coerce.date(), expiryDate: z.coerce.date(), documentUrl: z.string().url().optional(), notes: z.string().trim().max(500).optional() }).parse(input)
  const authorization = await requirePermission(PermissionEnum.SETTINGS_EDIT)
  const values = { name: data.name, licenseNumber: data.licenseNumber, issuingAuthority: data.issuingAuthority, issueDate: data.issueDate, expiryDate: data.expiryDate, documentUrl: data.documentUrl || null, notes: data.notes || null, updatedAt: new Date() }
  if (data.id) {
    const [record] = await db.update(complianceLicense).set(values).where(and(eq(complianceLicense.id, data.id), eq(complianceLicense.orgId, authorization.organizationId))).returning()
    if (!record) throw new Error('License not found')
    return record
  }
  const [record] = await db.insert(complianceLicense).values({ id: generateId(), ...values, orgId: authorization.organizationId, createdBy: authorization.userId }).returning()
  return record
}

export async function saveAlcoholSaleHours(input: { dayOfWeek: number; startTime: string; endTime: string; enforcement: 'block' | 'warn'; enabled: boolean }) {
  const data = z.object({ dayOfWeek: z.number().int().min(0).max(6), startTime: z.string().regex(/^([01]\\d|2[0-3]):[0-5]\\d$/), endTime: z.string().regex(/^([01]\\d|2[0-3]):[0-5]\\d$/), enforcement: z.enum(['block', 'warn']), enabled: z.boolean() }).parse(input)
  const authorization = await requirePermission(PermissionEnum.SETTINGS_EDIT)
  const existing = await db.select({ id: alcoholSaleHours.id }).from(alcoholSaleHours).where(and(eq(alcoholSaleHours.orgId, authorization.organizationId), eq(alcoholSaleHours.dayOfWeek, data.dayOfWeek))).limit(1)
  if (existing[0]) {
    const [record] = await db.update(alcoholSaleHours).set({ ...data, updatedBy: authorization.userId, updatedAt: new Date() }).where(eq(alcoholSaleHours.id, existing[0].id)).returning()
    return record
  }
  const [record] = await db.insert(alcoholSaleHours).values({ id: generateId(), ...data, orgId: authorization.organizationId, updatedBy: authorization.userId }).returning()
  return record
}

export async function getAlcoholSaleWindow(dayOfWeek: number) {
  const authorization = await requireAnyPermission([PermissionEnum.POS_VIEW, PermissionEnum.POS_SELL])
  return db.select().from(alcoholSaleHours).where(and(eq(alcoholSaleHours.orgId, authorization.organizationId), eq(alcoholSaleHours.dayOfWeek, dayOfWeek), eq(alcoholSaleHours.enabled, true))).limit(1)
}

export async function getExpiringLicenses(days = 30) {
  const authorization = await requireAnyPermission(compliancePermissions)
  const until = new Date(Date.now() + Math.max(1, Math.min(days, 365)) * 86400000)
  return db.select().from(complianceLicense).where(and(eq(complianceLicense.orgId, authorization.organizationId), lte(complianceLicense.expiryDate, until), gte(complianceLicense.expiryDate, new Date()))).orderBy(complianceLicense.expiryDate)
}
