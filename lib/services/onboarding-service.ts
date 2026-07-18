import { and, eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  auditEvent,
  branch,
  branchMembership,
  businessSettings,
  onboardingState,
  organization,
  organizationMembership,
  workspace,
} from '@/lib/db/schema'
import { generateId, slugify } from '@/lib/utils'
import {
  DEFAULT_ONBOARDING_DATA,
  ONBOARDING_STEPS,
  type BusinessFamilyId,
  type OnboardingDraft,
  type OnboardingStepId,
} from '@/lib/onboarding/config'
import { onboardingStepSchemas, validateCompleteDraft } from '@/lib/onboarding/schemas'
import { resolveOnboardingTemplateId } from '@/lib/templates'

type DraftRow = typeof onboardingState.$inferSelect

const legacyFamily: Record<string, BusinessFamilyId> = {
  retail: 'retail',
  restaurant: 'food_hospitality',
  pharmacy: 'health_wellness',
}

function migrateLegacyDraft(org: typeof organization.$inferSelect): OnboardingDraft {
  const businessFamily = legacyFamily[org.businessType] ?? 'other'
  const legacyCategory = org.businessCategory ?? ''
  const businessCategory = businessFamily === 'other'
    ? 'custom'
    : businessFamily === 'food_hospitality' && legacyCategory === 'restaurant'
      ? 'restaurant'
      : businessFamily === 'health_wellness' && legacyCategory === 'pharmacy'
        ? 'health_pharmacy'
        : legacyCategory || (businessFamily === 'retail' ? 'other_retail' : '')

  return {
    ...DEFAULT_ONBOARDING_DATA,
    businessName: org.name,
    businessFamily,
    businessCategory,
    customBusinessCategory: businessFamily === 'other' ? (legacyCategory || org.businessType || 'Other business') : '',
    businessEmail: org.businessEmail ?? '',
    phone: org.phone ?? '',
    country: org.country === 'Kenya' ? 'KE' : (org.country ?? 'KE'),
    timezone: org.timezone ?? 'Africa/Nairobi',
  }
}

function operationsFor(data: OnboardingDraft) {
  return {
    businessFamily: data.businessFamily,
    businessCategory: data.businessCategory,
    customBusinessCategory: data.customBusinessCategory,
    sellsProducts: data.sellsProducts,
    providesServices: data.providesServices,
    tracksInventory: data.tracksInventory,
    hasEmployees: data.hasEmployees,
    multipleLocations: data.multipleLocations,
    keepsCustomers: data.keepsCustomers,
    usesSuppliers: data.usesSuppliers,
    acceptsCash: data.acceptsCash,
    acceptsMpesa: data.acceptsMpesa,
    acceptsCard: data.acceptsCard,
    needsTax: data.needsTax,
    issuesReceipts: data.issuesReceipts,
  }
}

export class OnboardingService {
  static async getOrCreate(userId: string): Promise<DraftRow> {
    const [existing] = await db.select().from(onboardingState).where(eq(onboardingState.userId, userId)).limit(1)
    if (existing) return existing

    const [legacyOrganization] = await db.select().from(organization).where(eq(organization.userId, userId)).limit(1)
    if (legacyOrganization?.onboardingCompleted) {
      const [completed] = await db.insert(onboardingState).values({
        id: generateId(), userId, organizationId: legacyOrganization.id, status: 'completed', currentStep: 'review',
        completedSteps: [...ONBOARDING_STEPS], data: {}, completedAt: new Date(),
      }).onConflictDoNothing().returning()
      return completed ?? (await db.select().from(onboardingState).where(eq(onboardingState.userId, userId)).limit(1))[0]
    }

    const legacyData = legacyOrganization ? migrateLegacyDraft(legacyOrganization) : DEFAULT_ONBOARDING_DATA
    const [created] = await db.insert(onboardingState).values({
      id: generateId(), userId, organizationId: legacyOrganization?.id, status: 'in_progress', currentStep: 'welcome',
      completedSteps: [], data: legacyData,
    }).onConflictDoNothing().returning()
    return created ?? (await db.select().from(onboardingState).where(eq(onboardingState.userId, userId)).limit(1))[0]
  }

  static async saveStep(userId: string, stepId: OnboardingStepId, input: Record<string, unknown>, expectedRevision: number) {
    await this.getOrCreate(userId)
    return db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}))`)
      const [state] = await tx.select().from(onboardingState).where(eq(onboardingState.userId, userId)).limit(1)
      if (!state) throw new Error('ONBOARDING_NOT_FOUND')
      if (state.status === 'completed') throw new Error('ONBOARDING_COMPLETE')
      if (state.configurationVersion !== expectedRevision) throw new Error('STALE_REVISION')

      const requestedIndex = ONBOARDING_STEPS.indexOf(stepId)
      const currentIndex = ONBOARDING_STEPS.indexOf(state.currentStep as OnboardingStepId)
      if (requestedIndex < 0 || requestedIndex > currentIndex) throw new Error('INVALID_STEP_TRANSITION')

      const parsed = onboardingStepSchemas[stepId].safeParse(input)
      if (!parsed.success) return { ok: false as const, error: parsed.error }

      const currentData = (state.data ?? {}) as Record<string, unknown>
      const completedBeforeStep = ((state.completedSteps as string[] | null) ?? [])
        .filter((completedStep) => ONBOARDING_STEPS.indexOf(completedStep as OnboardingStepId) < requestedIndex)
      const completedSteps = Array.from(new Set([...completedBeforeStep, stepId]))
      const nextStep = ONBOARDING_STEPS[Math.min(requestedIndex + 1, ONBOARDING_STEPS.length - 1)]
      const [updated] = await tx.update(onboardingState).set({
        data: { ...currentData, ...parsed.data },
        status: 'in_progress',
        currentStep: nextStep,
        completedSteps,
        configurationVersion: expectedRevision + 1,
        lastSavedAt: new Date(),
      }).where(and(
        eq(onboardingState.id, state.id),
        eq(onboardingState.userId, userId),
        eq(onboardingState.configurationVersion, expectedRevision),
      )).returning()
      if (!updated) throw new Error('STALE_REVISION')
      return { ok: true as const, state: updated }
    })
  }

  static async complete(userId: string, emailVerified: boolean, expectedRevision: number) {
    return db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}))`)
      const [state] = await tx.select().from(onboardingState).where(eq(onboardingState.userId, userId)).limit(1)
      if (!state) throw new Error('ONBOARDING_NOT_FOUND')
      if (process.env.REQUIRE_EMAIL_VERIFICATION === 'true' && !emailVerified) throw new Error('EMAIL_NOT_VERIFIED')
      if (state.status === 'completed' && state.organizationId) {
        return { organizationId: state.organizationId, dashboardRoute: '/dashboard' }
      }
      if (state.configurationVersion !== expectedRevision) throw new Error('STALE_REVISION')

      const completedSteps = new Set((state.completedSteps as string[] | null) ?? [])
      const firstIncompleteStep = ONBOARDING_STEPS.find((step) => !completedSteps.has(step))
      if (firstIncompleteStep) throw new Error(`INCOMPLETE_STEP:${firstIncompleteStep}`)

      const validation = validateCompleteDraft((state.data ?? {}) as Record<string, unknown>)
      if (!validation.success) throw new Error(`INCOMPLETE_STEP:${validation.step}`)
      const data = validation.data
      const [existingOrganization] = await tx.select().from(organization).where(eq(organization.userId, userId)).limit(1)
      const organizationId = existingOrganization?.id ?? generateId()
      const now = new Date()
      const organizationValues = {
        name: data.businessName,
        slug: existingOrganization?.slug ?? `${slugify(data.businessName) || 'business'}-${organizationId.slice(0, 8)}`,
        businessType: data.businessFamily,
        businessCategory: data.businessCategory,
        currency: data.currency,
        taxRate: data.taxEnabled ? data.taxRate : '0',
        userId,
        onboardingCompleted: false,
        onboardingStep: ONBOARDING_STEPS.length - 1,
        businessEmail: data.businessEmail || null,
        country: data.country,
        timezone: data.timezone,
        phone: data.phone,
        updatedAt: now,
      }
      if (existingOrganization) {
        await tx.update(organization).set(organizationValues).where(and(eq(organization.id, organizationId), eq(organization.userId, userId)))
      } else {
        await tx.insert(organization).values({ id: organizationId, ...organizationValues, createdAt: now })
      }

      await tx.insert(organizationMembership).values({ id: generateId(), organizationId, userId, role: 'owner' })
        .onConflictDoUpdate({ target: [organizationMembership.organizationId, organizationMembership.userId], set: { role: 'owner', updatedAt: now } })

      const [existingBranch] = await tx.select().from(branch)
        .where(and(eq(branch.organizationId, organizationId), eq(branch.code, 'MAIN'))).limit(1)
      const branchId = existingBranch?.id ?? generateId()
      const branchValues = {
        name: data.branchName, phone: data.branchPhone, address: data.branchAddress, region: data.branchRegion,
        city: data.branchCity, timezone: data.branchTimezone, receiptHeader: data.receiptHeader || null, isMain: true, updatedAt: now,
      }
      if (existingBranch) await tx.update(branch).set(branchValues).where(eq(branch.id, branchId))
      else await tx.insert(branch).values({ id: branchId, organizationId, code: 'MAIN', ...branchValues, createdAt: now })
      await tx.insert(branchMembership).values({ id: generateId(), branchId, userId, role: 'owner' })
        .onConflictDoUpdate({ target: [branchMembership.branchId, branchMembership.userId], set: { role: 'owner' } })

      const operations = operationsFor(data)
      const settingsValues = {
        displayName: data.displayName || null,
        website: data.website || null,
        region: data.region,
        city: data.city,
        address: data.branchAddress,
        language: data.language,
        financialYearStart: data.financialYearStart,
        customBusinessCategory: data.customBusinessCategory || null,
        operations,
        enabledModules: data.enabledModules,
        paymentMethods: data.paymentMethods,
        defaultPaymentMethod: data.defaultPaymentMethod,
        taxEnabled: data.taxEnabled,
        pricesIncludeTax: data.taxEnabled && data.pricesIncludeTax,
        taxName: data.taxEnabled ? data.taxName : null,
        taxRate: data.taxEnabled ? data.taxRate : '0',
        taxIdentifier: data.taxIdentifier || null,
        receiptBusinessName: data.receiptBusinessName,
        receiptPhone: data.receiptPhone,
        receiptAddress: data.receiptAddress || null,
        receiptFooter: data.receiptFooter || null,
        showTaxOnReceipt: data.issuesReceipts && data.taxEnabled && data.showTaxOnReceipt,
        receiptNumbering: 'automatic',
        updatedAt: now,
      }
      await tx.insert(businessSettings).values({ organizationId, ...settingsValues })
        .onConflictDoUpdate({ target: businessSettings.organizationId, set: settingsValues })

      const workspaceConfig = {
        templateId: resolveOnboardingTemplateId(data.businessFamily, data.businessCategory),
        businessFamily: data.businessFamily,
        businessCategory: data.businessCategory,
        customBusinessCategory: data.customBusinessCategory,
        enabledModules: data.enabledModules,
        enabledFeatures: [],
        ownerPermissions: ['*'],
        configurationVersion: expectedRevision,
      }
      await tx.insert(workspace).values({ id: generateId(), organizationId, config: workspaceConfig, createdAt: now, updatedAt: now })
        .onConflictDoUpdate({ target: workspace.organizationId, set: { config: workspaceConfig, updatedAt: now } })

      await tx.insert(auditEvent).values({
        id: generateId(), organizationId, userId, action: 'workspace.created',
        metadata: { configurationVersion: expectedRevision, businessFamily: data.businessFamily, businessCategory: data.businessCategory },
        createdAt: now,
      })
      await tx.update(organization).set({ onboardingCompleted: true, onboardingStep: ONBOARDING_STEPS.length, updatedAt: now })
        .where(and(eq(organization.id, organizationId), eq(organization.userId, userId)))
      await tx.update(onboardingState).set({
        organizationId, status: 'completed', currentStep: 'review', completedSteps: [...ONBOARDING_STEPS],
        completedAt: now, lastSavedAt: now,
      }).where(and(eq(onboardingState.id, state.id), eq(onboardingState.userId, userId)))

      return { organizationId, dashboardRoute: '/dashboard' }
    })
  }
}
