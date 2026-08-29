import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  numeric,
  json,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// --- Better Auth required tables -------------------------------------------
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  phone: text('phone'),
  emailVerified: boolean('emailVerified').notNull().default(false),
  image: text('image'),
  status: text('status').notNull().default('active'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expiresAt').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
});

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
});

export const jwks = pgTable('jwks', {
  id: text('id').primaryKey(),
  publicKey: text('publicKey').notNull(),
  privateKey: text('privateKey').notNull(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  expiresAt: timestamp('expiresAt'),
});

// --- App tables ------------------------------------------------------------
export const organization = pgTable('organization', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  businessType: text('businessType').notNull().default('retail'),
  businessCategory: text('businessCategory').default('other_retail'), // Specific category within business type
  currency: text('currency').notNull().default('KES'),
  taxRate: numeric('taxRate', { precision: 5, scale: 2 })
    .notNull()
    .default('16'),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),

  // Onboarding fields
  onboardingCompleted: boolean('onboardingCompleted').notNull().default(false),
  onboardingStep: integer('onboardingStep').notNull().default(0),
  businessEmail: text('businessEmail'),
  country: text('country'),
  timezone: text('timezone').default('Africa/Nairobi'),
  businessSize: text('businessSize'), // solo, small, medium, large
  businessDescription: text('businessDescription'),
  phone: text('phone'),

  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});

// Organization membership - tracks user roles in organizations
export const organizationMembership = pgTable(
  'organization_membership',
  {
    id: text('id').primaryKey(),
    organizationId: text('organizationId')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    userId: text('userId')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    role: text('role').notNull().default('member'), // owner, admin, manager, staff, member
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({
    organizationUserUnique: uniqueIndex(
      'organization_membership_org_user_unique'
    ).on(table.organizationId, table.userId),
  })
);

// Workspace configuration
export const workspace = pgTable('workspace', {
  id: text('id').primaryKey(),
  organizationId: text('organizationId')
    .notNull()
    .unique()
    .references(() => organization.id, { onDelete: 'cascade' }),
  config: json('config').notNull(), // { enabledModules: [...], settings: {...} }
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});

/** A user-owned, resumable draft. No tenant id supplied by the browser is trusted. */
export const onboardingState = pgTable('onboarding_state', {
  id: text('id').primaryKey(),
  userId: text('userId')
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: 'cascade' }),
  organizationId: text('organizationId')
    .unique()
    .references(() => organization.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('not_started'),
  currentStep: text('currentStep').notNull().default('welcome'),
  completedSteps: json('completedSteps').notNull().default([]),
  data: json('data').notNull().default({}),
  configurationVersion: integer('configurationVersion').notNull().default(1),
  startedAt: timestamp('startedAt').notNull().defaultNow(),
  lastSavedAt: timestamp('lastSavedAt').notNull().defaultNow(),
  completedAt: timestamp('completedAt'),
});

export const branch = pgTable(
  'branch',
  {
    id: text('id').primaryKey(),
    organizationId: text('organizationId')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    code: text('code').notNull(),
    name: text('name').notNull(),
    phone: text('phone'),
    address: text('address'),
    region: text('region'),
    city: text('city'),
    timezone: text('timezone').notNull().default('Africa/Nairobi'),
    receiptHeader: text('receiptHeader'),
    isMain: boolean('isMain').notNull().default(false),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({
    organizationCodeUnique: uniqueIndex('branch_org_code_unique').on(
      table.organizationId,
      table.code
    ),
    organizationIndex: index('branch_organization_idx').on(
      table.organizationId
    ),
  })
);

export const branchMembership = pgTable(
  'branch_membership',
  {
    id: text('id').primaryKey(),
    branchId: text('branchId')
      .notNull()
      .references(() => branch.id, { onDelete: 'cascade' }),
    userId: text('userId')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    role: text('role').notNull().default('staff'),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
  },
  (table) => ({
    branchUserUnique: uniqueIndex('branch_membership_branch_user_unique').on(
      table.branchId,
      table.userId
    ),
  })
);

export const cardTerminal = pgTable('card_terminal', {
  id: text('id').primaryKey(),
  organizationId: text('organizationId').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  branchId: text('branchId').notNull().references(() => branch.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  terminalCode: text('terminalCode').notNull(),
  provider: text('provider'),
  referenceRequired: boolean('referenceRequired').notNull().default(false),
  isActive: boolean('isActive').notNull().default(true),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
}, (table) => ({
  organizationCodeUnique: uniqueIndex('card_terminal_org_code_unique').on(table.organizationId, table.terminalCode),
  branchActiveIndex: index('card_terminal_branch_active_idx').on(table.branchId, table.isActive),
}));

export const cardPaymentAttempt = pgTable('card_payment_attempt', {
  id: text('id').primaryKey(),
  organizationId: text('organizationId').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  branchId: text('branchId').notNull().references(() => branch.id, { onDelete: 'restrict' }),
  posSessionId: text('posSessionId').notNull(),
  cashierId: text('cashierId').notNull().references(() => user.id, { onDelete: 'restrict' }),
  cardTerminalId: text('cardTerminalId').notNull().references(() => cardTerminal.id, { onDelete: 'restrict' }),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  authorizationCode: text('authorizationCode').notNull(),
  reference: text('reference'),
  cardBrand: text('cardBrand'),
  last4: text('last4'),
  entryMode: text('entryMode'),
  status: text('status').notNull().default('approved_pending_sale'),
  saleId: text('saleId'),
  idempotencyKey: text('idempotencyKey').notNull(),
  recoveredAt: timestamp('recoveredAt'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
}, (table) => ({
  organizationIdempotencyUnique: uniqueIndex('card_payment_attempt_org_idempotency_unique').on(table.organizationId, table.idempotencyKey),
  terminalCreatedIndex: index('card_payment_attempt_terminal_created_idx').on(table.cardTerminalId, table.createdAt),
  statusIndex: index('card_payment_attempt_status_idx').on(table.organizationId, table.status),
}));

export const businessSettings = pgTable('business_settings', {
  organizationId: text('organizationId')
    .primaryKey()
    .references(() => organization.id, { onDelete: 'cascade' }),
  displayName: text('displayName'),
  website: text('website'),
  region: text('region'),
  city: text('city'),
  address: text('address'),
  language: text('language').notNull().default('en'),
  financialYearStart: text('financialYearStart'),
  customBusinessCategory: text('customBusinessCategory'),
  operations: json('operations').notNull().default({}),
  enabledModules: json('enabledModules').notNull().default([]),
  paymentMethods: json('paymentMethods').notNull().default([]),
  defaultPaymentMethod: text('defaultPaymentMethod'),
  taxEnabled: boolean('taxEnabled').notNull().default(false),
  pricesIncludeTax: boolean('pricesIncludeTax').notNull().default(false),
  taxName: text('taxName'),
  taxRate: numeric('taxRate', { precision: 5, scale: 2 })
    .notNull()
    .default('0'),
  taxIdentifier: text('taxIdentifier'),
  receiptBusinessName: text('receiptBusinessName'),
  receiptPhone: text('receiptPhone'),
  receiptAddress: text('receiptAddress'),
  receiptFooter: text('receiptFooter'),
  receiptLayout: text('receiptLayout').notNull().default('thermal'),
  receiptTemplate: text('receiptTemplate').notNull().default('classic'),
  receiptLogoUrl: text('receiptLogoUrl'),
  showTaxOnReceipt: boolean('showTaxOnReceipt').notNull().default(false),
  receiptShowPhone: boolean('receiptShowPhone').notNull().default(true),
  receiptShowAddress: boolean('receiptShowAddress').notNull().default(true),
  receiptShowCashier: boolean('receiptShowCashier').notNull().default(true),
  receiptShowCustomer: boolean('receiptShowCustomer').notNull().default(true),
  receiptShowPayment: boolean('receiptShowPayment').notNull().default(true),
  receiptShowQrCode: boolean('receiptShowQrCode').notNull().default(false),
  receiptShowItemSku: boolean('receiptShowItemSku').notNull().default(false),
  receiptPrintingMode: text('receiptPrintingMode').notNull().default('direct'),
  receiptPrinterName: text('receiptPrinterName'),
  receiptPaperWidth: integer('receiptPaperWidth').notNull().default(80),
  receiptAutoPrint: boolean('receiptAutoPrint').notNull().default(false),
  receiptPrintCustomerCopy: boolean('receiptPrintCustomerCopy').notNull().default(true),
  receiptPrintCopies: integer('receiptPrintCopies').notNull().default(1),
  receiptCashDrawerPulse: boolean('receiptCashDrawerPulse').notNull().default(false),
  receiptNumbering: text('receiptNumbering').notNull().default('automatic'),
  checklistDismissed: boolean('checklistDismissed').notNull().default(false),
  cashVarianceTolerance: numeric('cashVarianceTolerance', {
    precision: 12,
    scale: 2,
  })
    .notNull()
    .default('0'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});

/** Pharmacy-only operating policy. Core business, tax, payment and receipt
 * settings remain in business_settings and are shared with every vertical. */
export const pharmacyConfiguration = pgTable('pharmacy_configuration', {
  organizationId: text('organizationId')
    .primaryKey()
    .references(() => organization.id, { onDelete: 'cascade' }),
  fefoEnabled: boolean('fefoEnabled').notNull().default(true),
  expiryWarningDays: json('expiryWarningDays')
    .notNull()
    .default([90, 60, 30, 7]),
  prescriptionWorkflowEnabled: boolean('prescriptionWorkflowEnabled')
    .notNull()
    .default(true),
  restrictedItemWorkflowEnabled: boolean('restrictedItemWorkflowEnabled')
    .notNull()
    .default(true),
  returnedStockDefaultStatus: text('returnedStockDefaultStatus')
    .notNull()
    .default('quarantined'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});

/** Branch-scoped eTIMS configuration. Secret values are never stored here;
 * only environment-variable or secret-manager references are persisted. */
export const etimsConfiguration = pgTable(
  'etims_configuration',
  {
    id: text('id').primaryKey(),
    organizationId: text('organizationId')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    branchId: text('branchId')
      .notNull()
      .references(() => branch.id, { onDelete: 'cascade' }),
    enabled: boolean('enabled').notNull().default(false),
    environment: text('environment').notNull().default('sandbox'),
    integrationMethod: text('integrationMethod').notNull().default('OSCU'),
    providerName: text('providerName').notNull().default('mock'),
    businessKraPin: text('businessKraPin'),
    vatRegistered: boolean('vatRegistered').notNull().default(false),
    externalBranchId: text('externalBranchId'),
    deviceId: text('deviceId'),
    apiBaseUrl: text('apiBaseUrl'),
    credentialReference: text('credentialReference'),
    clientId: text('clientId'),
    clientSecretReference: text('clientSecretReference'),
    certificateReference: text('certificateReference'),
    privateKeyReference: text('privateKeyReference'),
    tokenConfiguration: json('tokenConfiguration').notNull().default({}),
    invoiceSubmissionEnabled: boolean('invoiceSubmissionEnabled')
      .notNull()
      .default(true),
    automaticRetryEnabled: boolean('automaticRetryEnabled')
      .notNull()
      .default(true),
    maximumRetryAttempts: integer('maximumRetryAttempts').notNull().default(5),
    receiptDetailsEnabled: boolean('receiptDetailsEnabled')
      .notNull()
      .default(true),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({
    organizationBranchUnique: uniqueIndex(
      'etims_configuration_org_branch_unique'
    ).on(table.organizationId, table.branchId),
    organizationIndex: index('etims_configuration_org_idx').on(
      table.organizationId
    ),
  })
);

export const auditEvent = pgTable(
  'audit_event',
  {
    id: text('id').primaryKey(),
    organizationId: text('organizationId')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    userId: text('userId')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    action: text('action').notNull(),
    metadata: json('metadata').notNull().default({}),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
  },
  (table) => ({
    organizationIndex: index('audit_event_organization_idx').on(
      table.organizationId
    ),
  })
);

export const category = pgTable(
  'category',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description'),
    imageUrl: text('imageUrl'),
    parentCategoryId: text('parentCategoryId'),
    isActive: boolean('isActive').notNull().default(true),
    userId: text('userId').notNull(),
    orgId: text('orgId').notNull(),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({
    organizationSlugUnique: uniqueIndex('category_org_slug_unique').on(
      table.orgId,
      table.slug
    ),
    organizationParentIndex: index('category_org_parent_idx').on(
      table.orgId,
      table.parentCategoryId
    ),
  })
);

export const product = pgTable(
  'product',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    brand: text('brand'),
    variant: text('variant'),
    sku: text('sku'),
    barcode: text('barcode'),
    description: text('description'),
    categoryId: text('categoryId'),
    buyingPrice: numeric('buyingPrice', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),
    sellingPrice: numeric('sellingPrice', {
      precision: 12,
      scale: 2,
    }).notNull(),
    stock: integer('stock').notNull().default(0),
    minStock: integer('minStock').notNull().default(5),
    unit: text('unit').notNull().default('pcs'),
    etimsItemCode: text('etimsItemCode'),
    etimsUnitCode: text('etimsUnitCode'),
    etimsTaxCategory: text('etimsTaxCategory'),
    etimsTaxRate: numeric('etimsTaxRate', { precision: 5, scale: 2 }),
    etimsVatClassification: text('etimsVatClassification'),
    volume: numeric('volume', { precision: 10, scale: 2 }),
    volumeUnit: text('volumeUnit'),
    abv: numeric('abv', { precision: 5, scale: 2 }),
    countryOfOrigin: text('countryOfOrigin'),
    unitsPerPack: integer('unitsPerPack'),
    preferredSupplierId: text('preferredSupplierId'),
    trackingMode: text('trackingMode').notNull().default('none'),
    costingMethod: text('costingMethod').notNull().default('weighted_average'),
    allowDecimalQuantity: boolean('allowDecimalQuantity')
      .notNull()
      .default(false),
    shelfLifeDays: integer('shelfLifeDays'),
    expiryAlertDays: integer('expiryAlertDays'),
    imageUrl: text('imageUrl'),
    isActive: boolean('isActive').notNull().default(true),
    userId: text('userId').notNull(),
    orgId: text('orgId').notNull(),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({
    organizationActiveIndex: index('product_org_active_idx').on(
      table.orgId,
      table.isActive
    ),
  })
);

/** One-to-one medicine metadata layered on the shared product catalogue. */
export const pharmacyProduct = pgTable(
  'pharmacy_product',
  {
    productId: text('productId')
      .primaryKey()
      .references(() => product.id, { onDelete: 'cascade' }),
    organizationId: text('organizationId')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    genericName: text('genericName'),
    internalCode: text('internalCode'),
    manufacturer: text('manufacturer'),
    strength: text('strength'),
    dosageForm: text('dosageForm'),
    packSize: text('packSize'),
    prescriptionRequired: boolean('prescriptionRequired')
      .notNull()
      .default(false),
    restrictedItem: boolean('restrictedItem').notNull().default(false),
    notes: text('notes'),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({
    organizationIndex: index('pharmacy_product_org_idx').on(
      table.organizationId
    ),
    organizationInternalCodeUnique: uniqueIndex(
      'pharmacy_product_org_internal_code_unique'
    ).on(table.organizationId, table.internalCode),
  })
);

export const productPackage = pgTable(
  'product_package',
  {
    id: text('id').primaryKey(),
    organizationId: text('organizationId')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    productId: text('productId')
      .notNull()
      .references(() => product.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    packageType: text('packageType').notNull(),
    barcode: text('barcode'),
    sellingPrice: numeric('sellingPrice', {
      precision: 12,
      scale: 2,
    }).notNull(),
    baseUnitQuantity: integer('baseUnitQuantity').notNull(),
    etimsItemCode: text('etimsItemCode'),
    etimsUnitCode: text('etimsUnitCode'),
    isActive: boolean('isActive').notNull().default(true),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({
    organizationBarcodeUnique: uniqueIndex(
      'product_package_org_barcode_unique'
    ).on(table.organizationId, table.barcode),
    productNameUnique: uniqueIndex('product_package_product_name_unique').on(
      table.productId,
      table.name
    ),
    productActiveIndex: index('product_package_product_active_idx').on(
      table.organizationId,
      table.productId,
      table.isActive
    ),
  })
);

export const wirelessScannerSession = pgTable(
  'wireless_scanner_session',
  {
    id: text('id').primaryKey(),
    organizationId: text('organizationId').notNull(),
    userId: text('userId').notNull(),
    tokenHash: text('tokenHash').notNull().unique(),
    status: text('status').notNull().default('active'),
    expiresAt: timestamp('expiresAt').notNull(),
    lastSeenAt: timestamp('lastSeenAt'),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
  },
  (table) => ({
    ownerIndex: index('wireless_scanner_session_owner_idx').on(
      table.organizationId,
      table.userId,
      table.status
    ),
  })
);

export const wirelessScannerEvent = pgTable(
  'wireless_scanner_event',
  {
    id: text('id').primaryKey(),
    sessionId: text('sessionId')
      .notNull()
      .references(() => wirelessScannerSession.id, { onDelete: 'cascade' }),
    barcode: text('barcode').notNull(),
    clientEventId: text('clientEventId').notNull(),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    consumedAt: timestamp('consumedAt'),
  },
  (table) => ({
    sessionCreatedIndex: index('wireless_scanner_event_session_created_idx').on(
      table.sessionId,
      table.createdAt
    ),
    clientEventUnique: uniqueIndex('wireless_scanner_event_client_unique').on(
      table.sessionId,
      table.clientEventId
    ),
  })
);

export const customer = pgTable('customer', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  kraPin: text('kraPin'),
  customerType: text('customerType').notNull().default('individual'),
  vatRegistered: boolean('vatRegistered').notNull().default(false),
  loyaltyPoints: integer('loyaltyPoints').notNull().default(0),
  userId: text('userId').notNull(),
  orgId: text('orgId').notNull(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});

export const rewardSettings = pgTable(
  'reward_settings',
  {
    id: text('id').primaryKey(),
    organizationId: text('organizationId')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    loyaltyEnabled: boolean('loyaltyEnabled').notNull().default(true),
    spendPerPoint: numeric('spendPerPoint', { precision: 12, scale: 2 })
      .notNull()
      .default('100'),
    pointValue: numeric('pointValue', { precision: 12, scale: 2 })
      .notNull()
      .default('1'),
    minimumRedemptionPoints: integer('minimumRedemptionPoints')
      .notNull()
      .default(100),
    maximumPointsRedemptionPercent: numeric('maximumPointsRedemptionPercent', {
      precision: 5,
      scale: 2,
    })
      .notNull()
      .default('50'),
    minimumEligibleSpend: numeric('minimumEligibleSpend', {
      precision: 12,
      scale: 2,
    })
      .notNull()
      .default('0'),
    pointsExpiryDays: integer('pointsExpiryDays'),
    bonusEnabled: boolean('bonusEnabled').notNull().default(true),
    maximumBonusRedemptionPercent: numeric('maximumBonusRedemptionPercent', {
      precision: 5,
      scale: 2,
    })
      .notNull()
      .default('100'),
    allowPointsWithBonus: boolean('allowPointsWithBonus')
      .notNull()
      .default(true),
    discountedItemsEarnPoints: boolean('discountedItemsEarnPoints')
      .notNull()
      .default(true),
    bonusPaidAmountEarnsPoints: boolean('bonusPaidAmountEarnsPoints')
      .notNull()
      .default(false),
    loyaltyPaidAmountEarnsPoints: boolean('loyaltyPaidAmountEarnsPoints')
      .notNull()
      .default(false),
    roundingMode: text('roundingMode').notNull().default('floor'),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({
    organizationUnique: uniqueIndex('reward_settings_org_unique').on(
      table.organizationId
    ),
  })
);

export const rewardBranchEligibility = pgTable(
  'reward_branch_eligibility',
  {
    id: text('id').primaryKey(),
    rewardSettingsId: text('rewardSettingsId')
      .notNull()
      .references(() => rewardSettings.id, { onDelete: 'cascade' }),
    branchId: text('branchId')
      .notNull()
      .references(() => branch.id, { onDelete: 'cascade' }),
    rewardKind: text('rewardKind').notNull(),
  },
  (table) => ({
    settingsBranchKindUnique: uniqueIndex(
      'reward_branch_eligibility_unique'
    ).on(table.rewardSettingsId, table.branchId, table.rewardKind),
  })
);

export const rewardCategoryEligibility = pgTable(
  'reward_category_eligibility',
  {
    id: text('id').primaryKey(),
    rewardSettingsId: text('rewardSettingsId')
      .notNull()
      .references(() => rewardSettings.id, { onDelete: 'cascade' }),
    categoryId: text('categoryId')
      .notNull()
      .references(() => category.id, { onDelete: 'cascade' }),
    rewardKind: text('rewardKind').notNull(),
    mode: text('mode').notNull(),
  },
  (table) => ({
    settingsCategoryKindUnique: uniqueIndex(
      'reward_category_eligibility_unique'
    ).on(table.rewardSettingsId, table.categoryId, table.rewardKind),
  })
);

export const rewardProductEligibility = pgTable(
  'reward_product_eligibility',
  {
    id: text('id').primaryKey(),
    rewardSettingsId: text('rewardSettingsId')
      .notNull()
      .references(() => rewardSettings.id, { onDelete: 'cascade' }),
    productId: text('productId')
      .notNull()
      .references(() => product.id, { onDelete: 'cascade' }),
    rewardKind: text('rewardKind').notNull(),
    mode: text('mode').notNull(),
  },
  (table) => ({
    settingsProductKindUnique: uniqueIndex(
      'reward_product_eligibility_unique'
    ).on(table.rewardSettingsId, table.productId, table.rewardKind),
  })
);

export const customerRewardAccount = pgTable(
  'customer_reward_account',
  {
    id: text('id').primaryKey(),
    organizationId: text('organizationId')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    customerId: text('customerId')
      .notNull()
      .references(() => customer.id, { onDelete: 'cascade' }),
    pointsBalance: integer('pointsBalance').notNull().default(0),
    pointsDebt: integer('pointsDebt').notNull().default(0),
    bonusBalance: numeric('bonusBalance', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),
    bonusDebt: numeric('bonusDebt', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),
    lifetimePointsEarned: integer('lifetimePointsEarned').notNull().default(0),
    lifetimePointsRedeemed: integer('lifetimePointsRedeemed')
      .notNull()
      .default(0),
    lifetimeBonusCredited: numeric('lifetimeBonusCredited', {
      precision: 12,
      scale: 2,
    })
      .notNull()
      .default('0'),
    lifetimeBonusRedeemed: numeric('lifetimeBonusRedeemed', {
      precision: 12,
      scale: 2,
    })
      .notNull()
      .default('0'),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({
    customerUnique: uniqueIndex('customer_reward_account_customer_unique').on(
      table.customerId
    ),
    organizationIndex: index('customer_reward_account_org_idx').on(
      table.organizationId
    ),
  })
);

export const promotionRule = pgTable(
  'promotion_rule',
  {
    id: text('id').primaryKey(),
    organizationId: text('organizationId')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    code: text('code'),
    description: text('description'),
    kind: text('kind').notNull(),
    valueType: text('valueType').notNull().default('percentage'),
    value: numeric('value', { precision: 12, scale: 2 }).notNull(),
    minimumSpend: numeric('minimumSpend', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),
    maximumDiscount: numeric('maximumDiscount', { precision: 12, scale: 2 }),
    usageLimit: integer('usageLimit'),
    usedCount: integer('usedCount').notNull().default(0),
    startsAt: timestamp('startsAt').notNull(),
    endsAt: timestamp('endsAt').notNull(),
    isActive: boolean('isActive').notNull().default(true),
    createdBy: text('createdBy').references(() => user.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({
    organizationCodeUnique: uniqueIndex('promotion_rule_org_code_unique').on(
      table.organizationId,
      table.code
    ),
    organizationKindIndex: index('promotion_rule_org_kind_idx').on(
      table.organizationId,
      table.kind
    ),
  })
);

export const rewardLedger = pgTable(
  'reward_ledger',
  {
    id: text('id').primaryKey(),
    organizationId: text('organizationId')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    customerId: text('customerId')
      .notNull()
      .references(() => customer.id, { onDelete: 'restrict' }),
    rewardAccountId: text('rewardAccountId')
      .notNull()
      .references(() => customerRewardAccount.id, { onDelete: 'restrict' }),
    branchId: text('branchId').references(() => branch.id, {
      onDelete: 'restrict',
    }),
    saleId: text('saleId'),
    salesReturnId: text('salesReturnId'),
    campaignSource: text('campaignSource'),
    type: text('type').notNull(),
    pointsDelta: integer('pointsDelta').notNull().default(0),
    bonusDelta: numeric('bonusDelta', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),
    monetaryValue: numeric('monetaryValue', { precision: 12, scale: 2 }),
    reason: text('reason').notNull(),
    reference: text('reference'),
    createdBy: text('createdBy').references(() => user.id, {
      onDelete: 'restrict',
    }),
    idempotencyKey: text('idempotencyKey').notNull(),
    metadata: json('metadata').notNull().default({}),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
  },
  (table) => ({
    organizationIdempotencyUnique: uniqueIndex(
      'reward_ledger_org_idempotency_unique'
    ).on(table.organizationId, table.idempotencyKey),
    customerCreatedIndex: index('reward_ledger_customer_created_idx').on(
      table.customerId,
      table.createdAt
    ),
    branchCreatedIndex: index('reward_ledger_branch_created_idx').on(
      table.branchId,
      table.createdAt
    ),
  })
);

export const rewardReservation = pgTable(
  'reward_reservation',
  {
    id: text('id').primaryKey(),
    organizationId: text('organizationId')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    customerId: text('customerId')
      .notNull()
      .references(() => customer.id, { onDelete: 'restrict' }),
    rewardAccountId: text('rewardAccountId')
      .notNull()
      .references(() => customerRewardAccount.id, { onDelete: 'restrict' }),
    paymentRequestId: text('paymentRequestId').notNull(),
    pointsReserved: integer('pointsReserved').notNull().default(0),
    pointsValueReserved: numeric('pointsValueReserved', {
      precision: 12,
      scale: 2,
    })
      .notNull()
      .default('0'),
    bonusReserved: numeric('bonusReserved', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),
    status: text('status').notNull().default('ACTIVE'),
    expiresAt: timestamp('expiresAt').notNull(),
    consumedAt: timestamp('consumedAt'),
    releasedAt: timestamp('releasedAt'),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
    updatedAt: timestamp('updatedAt').defaultNow().notNull(),
  },
  (table) => ({
    paymentRequestUnique: uniqueIndex(
      'reward_reservation_payment_request_unique'
    ).on(table.paymentRequestId),
    accountStatusIndex: index('reward_reservation_account_status_idx').on(
      table.rewardAccountId,
      table.status,
      table.expiresAt
    ),
  })
);

export const sale = pgTable(
  'sale',
  {
    id: text('id').primaryKey(),
    receiptNo: text('receiptNo').notNull(),
    customerId: text('customerId'),
    subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull(),
    taxAmount: numeric('taxAmount', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),
    discountAmount: numeric('discountAmount', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),
    shippingAmount: numeric('shippingAmount', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),
    roundingAmount: numeric('roundingAmount', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),
    loyaltyPointsEarned: integer('loyaltyPointsEarned').notNull().default(0),
    loyaltyPointsRedeemed: integer('loyaltyPointsRedeemed')
      .notNull()
      .default(0),
    loyaltyRedemptionValue: numeric('loyaltyRedemptionValue', {
      precision: 12,
      scale: 2,
    })
      .notNull()
      .default('0'),
    bonusRedeemed: numeric('bonusRedeemed', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),
    rewardEligibleSpend: numeric('rewardEligibleSpend', {
      precision: 12,
      scale: 2,
    })
      .notNull()
      .default('0'),
    rewardEarningRateSnapshot: numeric('rewardEarningRateSnapshot', {
      precision: 12,
      scale: 2,
    }),
    rewardPointValueSnapshot: numeric('rewardPointValueSnapshot', {
      precision: 12,
      scale: 2,
    }),
    total: numeric('total', { precision: 12, scale: 2 }).notNull(),
    amountReceived: numeric('amountReceived', { precision: 12, scale: 2 }), // Cash only
    change: numeric('change', { precision: 12, scale: 2 }), // Cash only
    paymentMethod: text('paymentMethod').notNull().default('cash'),
    mpesaRef: text('mpesaRef'),
    // Recorded when a liquor-workspace cashier confirms the customer was checked
    // before an age-restricted sale can be completed.
    ageVerified: boolean('ageVerified').notNull().default(false),
    ageVerifiedAt: timestamp('ageVerifiedAt'),
    ageVerifiedBy: text('ageVerifiedBy'),
    status: text('status').notNull().default('completed'),
    idempotencyKey: text('idempotencyKey'), // For duplicate prevention
    // Offline cash sales receive a provisional browser receipt and are assigned
    // their official receipt only after this server-side synchronization.
    origin: text('origin').notNull().default('online'),
    provisionalReceiptNo: text('provisionalReceiptNo'),
    offlineCreatedAt: timestamp('offlineCreatedAt'),
    syncedAt: timestamp('syncedAt'),
    userId: text('userId').notNull(),
    orgId: text('orgId').notNull(),
    branchId: text('branchId'),
    posSessionId: text('posSessionId'),
    terminalId: text('terminalId').references(() => posTerminal.id, { onDelete: 'restrict' }),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
  },
  (table) => ({
    organizationIndex: index('sale_org_idx').on(table.orgId),
    organizationCreatedIndex: index('sale_org_created_idx').on(
      table.orgId,
      table.createdAt
    ),
    organizationStatusCreatedIndex: index('sale_org_status_created_idx').on(
      table.orgId,
      table.status,
      table.createdAt
    ),
    organizationPaymentCreatedIndex: index('sale_org_payment_created_idx').on(
      table.orgId,
      table.paymentMethod,
      table.createdAt
    ),
    organizationCustomerCreatedIndex: index('sale_org_customer_created_idx').on(
      table.orgId,
      table.customerId,
      table.createdAt
    ),
    organizationCashierCreatedIndex: index('sale_org_cashier_created_idx').on(
      table.orgId,
      table.userId,
      table.createdAt
    ),
    organizationBranchCreatedIndex: index('sale_org_branch_created_idx').on(
      table.orgId,
      table.branchId,
      table.createdAt
    ),
    organizationIdempotencyUnique: uniqueIndex(
      'sale_org_idempotency_unique'
    ).on(table.orgId, table.idempotencyKey),
    organizationReceiptUnique: uniqueIndex('sale_org_receipt_unique').on(
      table.orgId,
      table.receiptNo
    ),
  })
);

export const saleItem = pgTable(
  'sale_item',
  {
    id: text('id').primaryKey(),
    saleId: text('saleId').notNull(),
    productId: text('productId').notNull(),
    productName: text('productName').notNull(),
    quantity: integer('quantity').notNull(),
    packageId: text('packageId').references(() => productPackage.id, {
      onDelete: 'restrict',
    }),
    packageName: text('packageName'),
    baseUnitQuantity: integer('baseUnitQuantity').notNull().default(1),
    unitPrice: numeric('unitPrice', { precision: 12, scale: 2 }).notNull(),
    totalPrice: numeric('totalPrice', { precision: 12, scale: 2 }).notNull(),
    unitCostAtSale: numeric('unitCostAtSale', { precision: 12, scale: 4 })
      .notNull()
      .default('0'),
    totalCost: numeric('totalCost', { precision: 12, scale: 4 })
      .notNull()
      .default('0'),
    rewardEligibleAmount: numeric('rewardEligibleAmount', {
      precision: 12,
      scale: 2,
    })
      .notNull()
      .default('0'),
    userId: text('userId').notNull(),
    orgId: text('orgId').notNull(),
  },
  (table) => ({
    saleOrganizationIndex: index('sale_item_sale_org_idx').on(
      table.saleId,
      table.orgId
    ),
  })
);

/** Durable fiscal outbox and immutable provider result for one sale. */
export const etimsSubmission = pgTable(
  'etims_submission',
  {
    id: text('id').primaryKey(),
    organizationId: text('organizationId')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    branchId: text('branchId')
      .notNull()
      .references(() => branch.id, { onDelete: 'restrict' }),
    saleId: text('saleId')
      .notNull()
      .references(() => sale.id, { onDelete: 'restrict' }),
    configurationId: text('configurationId')
      .notNull()
      .references(() => etimsConfiguration.id, { onDelete: 'restrict' }),
    status: text('status').notNull().default('PENDING'),
    provider: text('provider').notNull(),
    environment: text('environment').notNull(),
    idempotencyKey: text('idempotencyKey').notNull(),
    invoiceNumber: text('invoiceNumber'),
    internalReference: text('internalReference'),
    controlNumber: text('controlNumber'),
    receiptNumber: text('receiptNumber'),
    providerSubmissionId: text('providerSubmissionId'),
    qrData: text('qrData'),
    verificationData: text('verificationData'),
    requestData: json('requestData'),
    responseData: json('responseData'),
    submittedAt: timestamp('submittedAt'),
    acceptedAt: timestamp('acceptedAt'),
    lastAttemptAt: timestamp('lastAttemptAt'),
    nextRetryAt: timestamp('nextRetryAt'),
    retryCount: integer('retryCount').notNull().default(0),
    errorCode: text('errorCode'),
    errorMessage: text('errorMessage'),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({
    saleUnique: uniqueIndex('etims_submission_sale_unique').on(table.saleId),
    idempotencyUnique: uniqueIndex('etims_submission_idempotency_unique').on(
      table.organizationId,
      table.idempotencyKey
    ),
    retryIndex: index('etims_submission_retry_idx').on(
      table.status,
      table.nextRetryAt
    ),
    organizationStatusCreatedIndex: index(
      'etims_submission_org_status_created_idx'
    ).on(table.organizationId, table.status, table.createdAt),
    branchCreatedIndex: index('etims_submission_branch_created_idx').on(
      table.branchId,
      table.createdAt
    ),
  })
);

export const expense = pgTable('expense', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  category: text('category').notNull().default('general'),
  paymentMethod: text('paymentMethod').notNull().default('cash'),
  reference: text('reference'),
  notes: text('notes'),
  userId: text('userId').notNull(),
  orgId: text('orgId').notNull(),
  branchId: text('branchId').references(() => branch.id, {
    onDelete: 'restrict',
  }),
  expenseDate: timestamp('expenseDate').notNull().defaultNow(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});

export const supplier = pgTable(
  'supplier',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    phone: text('phone'),
    email: text('email'),
    taxId: text('taxId'),
    address: text('address'),
    contactPerson: text('contactPerson'),
    paymentTermsDays: integer('paymentTermsDays').notNull().default(0),
    leadTimeDays: integer('leadTimeDays').notNull().default(0),
    notes: text('notes'),
    status: text('status').notNull().default('active'),
    userId: text('userId').notNull(),
    orgId: text('orgId').notNull(),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({ organizationIndex: index('supplier_org_idx').on(table.orgId) })
);

export const purchase = pgTable(
  'purchase',
  {
    id: text('id').primaryKey(),
    purchaseNo: text('purchaseNo').notNull(),
    supplierId: text('supplierId').references(() => supplier.id, {
      onDelete: 'restrict',
    }),
    supplierName: text('supplierName').notNull(),
    reference: text('reference'),
    subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull(),
    taxAmount: numeric('taxAmount', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),
    total: numeric('total', { precision: 12, scale: 2 }).notNull(),
    paymentStatus: text('paymentStatus').notNull().default('unpaid'),
    status: text('status').notNull().default('received'),
    branchId: text('branchId').references(() => branch.id, {
      onDelete: 'restrict',
    }),
    paidAmount: numeric('paidAmount', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),
    dueDate: timestamp('dueDate'),
    paidAt: timestamp('paidAt'),
    notes: text('notes'),
    userId: text('userId').notNull(),
    orgId: text('orgId').notNull(),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({
    organizationIndex: index('purchase_org_idx').on(table.orgId),
    organizationNumberUnique: uniqueIndex('purchase_org_number_unique').on(
      table.orgId,
      table.purchaseNo
    ),
    paymentIndex: index('purchase_org_payment_idx').on(
      table.orgId,
      table.paymentStatus,
      table.dueDate
    ),
  })
);

export const purchaseItem = pgTable('purchase_item', {
  id: text('id').primaryKey(),
  purchaseId: text('purchaseId')
    .notNull()
    .references(() => purchase.id, { onDelete: 'cascade' }),
  productId: text('productId').notNull(),
  productName: text('productName').notNull(),
  quantity: integer('quantity').notNull(),
  unitCost: numeric('unitCost', { precision: 12, scale: 2 }).notNull(),
  totalCost: numeric('totalCost', { precision: 12, scale: 2 }).notNull(),
  orgId: text('orgId').notNull(),
});

/** A confirmed physical delivery. Unlike purchasing, an intake has no order,
 * supplier-payment, or approval lifecycle. */
export const stockIntake = pgTable(
  'stock_intake',
  {
    id: text('id').primaryKey(),
    intakeNo: text('intakeNo').notNull(),
    externalReference: text('externalReference'),
    sourceName: text('sourceName'),
    sourceType: text('sourceType').notNull().default('new_stock'),
    notes: text('notes'),
    status: text('status').notNull().default('confirmed'),
    receivedAt: timestamp('receivedAt').notNull(),
    createdBy: text('createdBy').notNull(),
    confirmedBy: text('confirmedBy').notNull(),
    confirmedAt: timestamp('confirmedAt').notNull().defaultNow(),
    idempotencyKey: text('idempotencyKey').notNull(),
    orgId: text('orgId').notNull().references(() => organization.id, { onDelete: 'cascade' }),
    branchId: text('branchId').notNull().references(() => branch.id, { onDelete: 'restrict' }),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
  },
  (table) => ({
    organizationNumberUnique: uniqueIndex('stock_intake_org_number_unique').on(table.orgId, table.intakeNo),
    organizationIdempotencyUnique: uniqueIndex('stock_intake_org_idempotency_unique').on(table.orgId, table.idempotencyKey),
    organizationReceivedIndex: index('stock_intake_org_received_idx').on(table.orgId, table.receivedAt),
  })
);

export const stockIntakeItem = pgTable('stock_intake_item', {
  id: text('id').primaryKey(),
  intakeId: text('intakeId').notNull().references(() => stockIntake.id, { onDelete: 'restrict' }),
  productId: text('productId').notNull().references(() => product.id, { onDelete: 'restrict' }),
  productName: text('productName').notNull(),
  sku: text('sku'),
  packageId: text('packageId').references(() => productPackage.id, { onDelete: 'restrict' }),
  enteredQuantity: integer('enteredQuantity').notNull(),
  enteredUnit: text('enteredUnit').notNull(),
  baseQuantity: integer('baseQuantity').notNull(),
  unitCost: numeric('unitCost', { precision: 12, scale: 4 }).notNull(),
  totalCost: numeric('totalCost', { precision: 12, scale: 2 }).notNull(),
  orgId: text('orgId').notNull().references(() => organization.id, { onDelete: 'cascade' }),
});

export const stockMovement = pgTable(
  'stock_movement',
  {
    id: text('id').primaryKey(),
    productId: text('productId').notNull(),
    productName: text('productName').notNull(),
    type: text('type').notNull(),
    quantity: integer('quantity').notNull(),
    stockBefore: integer('stockBefore').notNull(),
    stockAfter: integer('stockAfter').notNull(),
    referenceType: text('referenceType'),
    referenceId: text('referenceId'),
    reason: text('reason'),
    branchId: text('branchId').references(() => branch.id, {
      onDelete: 'restrict',
    }),
    lotId: text('lotId'),
    serialId: text('serialId'),
    unitCost: numeric('unitCost', { precision: 12, scale: 4 }),
    userId: text('userId').notNull(),
    orgId: text('orgId').notNull(),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
  },
  (table) => ({
    organizationIndex: index('stock_movement_org_idx').on(table.orgId),
    productIndex: index('stock_movement_product_idx').on(table.productId),
  })
);

/** Per-location source of truth. product.stock remains a synchronized organization
 * aggregate during the backwards-compatible migration of legacy consumers. */
export const inventoryBalance = pgTable(
  'inventory_balance',
  {
    id: text('id').primaryKey(),
    productId: text('productId')
      .notNull()
      .references(() => product.id, { onDelete: 'cascade' }),
    branchId: text('branchId')
      .notNull()
      .references(() => branch.id, { onDelete: 'cascade' }),
    onHand: numeric('onHand', { precision: 16, scale: 3 })
      .notNull()
      .default('0'),
    reserved: numeric('reserved', { precision: 16, scale: 3 })
      .notNull()
      .default('0'),
    unavailable: numeric('unavailable', { precision: 16, scale: 3 })
      .notNull()
      .default('0'),
    incoming: numeric('incoming', { precision: 16, scale: 3 })
      .notNull()
      .default('0'),
    reorderPoint: numeric('reorderPoint', { precision: 16, scale: 3 }),
    reorderTarget: numeric('reorderTarget', { precision: 16, scale: 3 }),
    safetyStock: numeric('safetyStock', { precision: 16, scale: 3 })
      .notNull()
      .default('0'),
    orgId: text('orgId')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({
    productBranchUnique: uniqueIndex(
      'inventory_balance_product_branch_unique'
    ).on(table.productId, table.branchId),
    organizationBranchIndex: index('inventory_balance_org_branch_idx').on(
      table.orgId,
      table.branchId
    ),
  })
);

export const inventoryCostLayer = pgTable(
  'inventory_cost_layer',
  {
    id: text('id').primaryKey(),
    productId: text('productId')
      .notNull()
      .references(() => product.id, { onDelete: 'restrict' }),
    branchId: text('branchId')
      .notNull()
      .references(() => branch.id, { onDelete: 'restrict' }),
    sourceType: text('sourceType').notNull(),
    sourceId: text('sourceId').notNull(),
    quantityReceived: numeric('quantityReceived', {
      precision: 16,
      scale: 3,
    }).notNull(),
    quantityRemaining: numeric('quantityRemaining', {
      precision: 16,
      scale: 3,
    }).notNull(),
    unitCost: numeric('unitCost', { precision: 12, scale: 4 }).notNull(),
    landedUnitCost: numeric('landedUnitCost', {
      precision: 12,
      scale: 4,
    }).notNull(),
    orgId: text('orgId')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    receivedAt: timestamp('receivedAt').notNull().defaultNow(),
  },
  (table) => ({
    productBranchIndex: index('inventory_cost_layer_product_branch_idx').on(
      table.productId,
      table.branchId,
      table.receivedAt
    ),
  })
);

export const inventoryLot = pgTable(
  'inventory_lot',
  {
    id: text('id').primaryKey(),
    productId: text('productId')
      .notNull()
      .references(() => product.id, { onDelete: 'restrict' }),
    branchId: text('branchId')
      .notNull()
      .references(() => branch.id, { onDelete: 'restrict' }),
    lotNumber: text('lotNumber').notNull(),
    barcode: text('barcode'),
    quantity: numeric('quantity', { precision: 16, scale: 3 })
      .notNull()
      .default('0'),
    receivedAt: timestamp('receivedAt').notNull().defaultNow(),
    manufacturedAt: timestamp('manufacturedAt'),
    bestBeforeAt: timestamp('bestBeforeAt'),
    expiresAt: timestamp('expiresAt'),
    alertAt: timestamp('alertAt'),
    status: text('status').notNull().default('available'),
    supplierId: text('supplierId').references(() => supplier.id, {
      onDelete: 'set null',
    }),
    unitCost: numeric('unitCost', { precision: 12, scale: 4 })
      .notNull()
      .default('0'),
    orgId: text('orgId')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
  },
  (table) => ({
    lotBranchUnique: uniqueIndex(
      'inventory_lot_product_branch_number_unique'
    ).on(table.productId, table.branchId, table.lotNumber),
    expiryIndex: index('inventory_lot_org_expiry_idx').on(
      table.orgId,
      table.expiresAt
    ),
  })
);

/** Immutable FEFO trace: exactly which inventory lots supplied a sale line. */
export const saleItemLotAllocation = pgTable(
  'sale_item_lot_allocation',
  {
    id: text('id').primaryKey(),
    organizationId: text('organizationId')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    saleId: text('saleId')
      .notNull()
      .references(() => sale.id, { onDelete: 'restrict' }),
    saleItemId: text('saleItemId')
      .notNull()
      .references(() => saleItem.id, { onDelete: 'restrict' }),
    productId: text('productId')
      .notNull()
      .references(() => product.id, { onDelete: 'restrict' }),
    lotId: text('lotId')
      .notNull()
      .references(() => inventoryLot.id, { onDelete: 'restrict' }),
    lotNumber: text('lotNumber').notNull(),
    expiresAt: timestamp('expiresAt'),
    quantity: numeric('quantity', { precision: 16, scale: 3 }).notNull(),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
  },
  (table) => ({
    saleItemLotUnique: uniqueIndex('sale_item_lot_allocation_unique').on(
      table.saleItemId,
      table.lotId
    ),
    organizationSaleIndex: index('sale_item_lot_allocation_org_sale_idx').on(
      table.organizationId,
      table.saleId
    ),
    lotIndex: index('sale_item_lot_allocation_lot_idx').on(table.lotId),
  })
);

/** Commercial prescription reference attached to a sale. This deliberately
 * stores no diagnosis or dosage recommendation. */
export const pharmacySaleRecord = pgTable(
  'pharmacy_sale_record',
  {
    id: text('id').primaryKey(),
    organizationId: text('organizationId')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    branchId: text('branchId')
      .notNull()
      .references(() => branch.id, { onDelete: 'restrict' }),
    saleId: text('saleId')
      .notNull()
      .references(() => sale.id, { onDelete: 'restrict' }),
    prescriptionReference: text('prescriptionReference'),
    prescriberReference: text('prescriberReference'),
    patientReference: text('patientReference'),
    prescriptionDocumentUrl: text('prescriptionDocumentUrl'),
    status: text('status').notNull().default('dispensed'),
    issuedAt: timestamp('issuedAt'),
    expiresAt: timestamp('expiresAt'),
    verifiedBy: text('verifiedBy').references(() => user.id, {
      onDelete: 'restrict',
    }),
    verifiedAt: timestamp('verifiedAt'),
    approvalReason: text('approvalReason'),
    notes: text('notes'),
    approvedBy: text('approvedBy').references(() => user.id, {
      onDelete: 'restrict',
    }),
    createdBy: text('createdBy')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({
    organizationSaleUnique: uniqueIndex(
      'pharmacy_sale_record_org_sale_unique'
    ).on(table.organizationId, table.saleId),
    organizationReferenceIndex: index(
      'pharmacy_sale_record_org_reference_idx'
    ).on(table.organizationId, table.prescriptionReference),
  })
);

/** Per-medicine prescription quantities. Sale items remain the immutable
 * commercial record; these rows hold the dispensing lifecycle. */
export const pharmacyPrescriptionItem = pgTable(
  'pharmacy_prescription_item',
  {
    id: text('id').primaryKey(),
    organizationId: text('organizationId')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    prescriptionRecordId: text('prescriptionRecordId')
      .notNull()
      .references(() => pharmacySaleRecord.id, { onDelete: 'cascade' }),
    saleItemId: text('saleItemId').references(() => saleItem.id, {
      onDelete: 'restrict',
    }),
    productId: text('productId')
      .notNull()
      .references(() => product.id, { onDelete: 'restrict' }),
    prescribedQuantity: numeric('prescribedQuantity', {
      precision: 16,
      scale: 3,
    }).notNull(),
    dispensedQuantity: numeric('dispensedQuantity', {
      precision: 16,
      scale: 3,
    }).notNull(),
    repeatsAuthorized: integer('repeatsAuthorized').notNull().default(0),
    repeatsRemaining: integer('repeatsRemaining').notNull().default(0),
    directions: text('directions'),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({
    recordProductIndex: index(
      'pharmacy_prescription_item_record_product_idx'
    ).on(table.prescriptionRecordId, table.productId),
    organizationIndex: index('pharmacy_prescription_item_org_idx').on(
      table.organizationId
    ),
  })
);

/** A recall targets one concrete stock lot, which makes enforcement and sale
 * traceability deterministic across branches. */
export const pharmacyMedicineRecall = pgTable(
  'pharmacy_medicine_recall',
  {
    id: text('id').primaryKey(),
    organizationId: text('organizationId')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    branchId: text('branchId')
      .notNull()
      .references(() => branch.id, { onDelete: 'restrict' }),
    productId: text('productId')
      .notNull()
      .references(() => product.id, { onDelete: 'restrict' }),
    lotId: text('lotId')
      .notNull()
      .references(() => inventoryLot.id, { onDelete: 'restrict' }),
    reference: text('reference').notNull(),
    reason: text('reason').notNull(),
    status: text('status').notNull().default('active'),
    initiatedBy: text('initiatedBy')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    resolvedBy: text('resolvedBy').references(() => user.id, {
      onDelete: 'restrict',
    }),
    initiatedAt: timestamp('initiatedAt').notNull().defaultNow(),
    resolvedAt: timestamp('resolvedAt'),
    resolutionNotes: text('resolutionNotes'),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({
    lotIndex: index('pharmacy_medicine_recall_lot_idx').on(
      table.organizationId,
      table.lotId
    ),
    organizationStatusIndex: index(
      'pharmacy_medicine_recall_org_status_idx'
    ).on(table.organizationId, table.status, table.createdAt),
  })
);

export const restrictedItemAudit = pgTable(
  'restricted_item_audit',
  {
    id: text('id').primaryKey(),
    organizationId: text('organizationId')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    branchId: text('branchId')
      .notNull()
      .references(() => branch.id, { onDelete: 'restrict' }),
    saleId: text('saleId')
      .notNull()
      .references(() => sale.id, { onDelete: 'restrict' }),
    saleItemId: text('saleItemId')
      .notNull()
      .references(() => saleItem.id, { onDelete: 'restrict' }),
    productId: text('productId')
      .notNull()
      .references(() => product.id, { onDelete: 'restrict' }),
    lotId: text('lotId').references(() => inventoryLot.id, {
      onDelete: 'restrict',
    }),
    cashierId: text('cashierId')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    approvedBy: text('approvedBy').references(() => user.id, {
      onDelete: 'restrict',
    }),
    quantity: numeric('quantity', { precision: 16, scale: 3 }).notNull(),
    customerReference: text('customerReference'),
    reason: text('reason'),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
  },
  (table) => ({
    organizationCreatedIndex: index('restricted_item_audit_org_created_idx').on(
      table.organizationId,
      table.createdAt
    ),
    saleIndex: index('restricted_item_audit_sale_idx').on(table.saleId),
  })
);

export const inventorySerial = pgTable(
  'inventory_serial',
  {
    id: text('id').primaryKey(),
    productId: text('productId')
      .notNull()
      .references(() => product.id, { onDelete: 'restrict' }),
    branchId: text('branchId')
      .notNull()
      .references(() => branch.id, { onDelete: 'restrict' }),
    lotId: text('lotId').references(() => inventoryLot.id, {
      onDelete: 'set null',
    }),
    serialNumber: text('serialNumber').notNull(),
    status: text('status').notNull().default('available'),
    warrantyEndsAt: timestamp('warrantyEndsAt'),
    soldAt: timestamp('soldAt'),
    saleId: text('saleId'),
    orgId: text('orgId')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({
    organizationSerialUnique: uniqueIndex(
      'inventory_serial_org_number_unique'
    ).on(table.orgId, table.serialNumber),
    productBranchIndex: index('inventory_serial_product_branch_idx').on(
      table.productId,
      table.branchId
    ),
  })
);

export const productPackaging = pgTable(
  'product_packaging',
  {
    id: text('id').primaryKey(),
    productId: text('productId')
      .notNull()
      .references(() => product.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    barcode: text('barcode'),
    quantityInBaseUnit: numeric('quantityInBaseUnit', {
      precision: 16,
      scale: 3,
    }).notNull(),
    purpose: text('purpose').notNull().default('both'),
    isDefaultPurchase: boolean('isDefaultPurchase').notNull().default(false),
    isDefaultSale: boolean('isDefaultSale').notNull().default(false),
    orgId: text('orgId')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    productNameUnique: uniqueIndex('product_packaging_product_name_unique').on(
      table.productId,
      table.name
    ),
    organizationBarcodeUnique: uniqueIndex(
      'product_packaging_org_barcode_unique'
    ).on(table.orgId, table.barcode),
  })
);

export const supplierProduct = pgTable(
  'supplier_product',
  {
    id: text('id').primaryKey(),
    supplierId: text('supplierId')
      .notNull()
      .references(() => supplier.id, { onDelete: 'cascade' }),
    productId: text('productId')
      .notNull()
      .references(() => product.id, { onDelete: 'cascade' }),
    supplierCode: text('supplierCode'),
    unitCost: numeric('unitCost', { precision: 12, scale: 4 })
      .notNull()
      .default('0'),
    minimumOrderQuantity: numeric('minimumOrderQuantity', {
      precision: 16,
      scale: 3,
    })
      .notNull()
      .default('1'),
    leadTimeDays: integer('leadTimeDays').notNull().default(0),
    packSize: numeric('packSize', { precision: 16, scale: 3 })
      .notNull()
      .default('1'),
    isPreferred: boolean('isPreferred').notNull().default(false),
    orgId: text('orgId')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({
    supplierProductUnique: uniqueIndex('supplier_product_unique').on(
      table.supplierId,
      table.productId
    ),
    organizationCodeIndex: index('supplier_product_org_code_idx').on(
      table.orgId,
      table.supplierCode
    ),
  })
);

export const salesReturn = pgTable(
  'sales_return',
  {
    id: text('id').primaryKey(),
    returnNo: text('returnNo').notNull(),
    saleId: text('saleId').notNull(),
    receiptNo: text('receiptNo').notNull(),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    refundMethod: text('refundMethod').notNull(),
    reason: text('reason').notNull(),
    status: text('status').notNull().default('completed'),
    userId: text('userId').notNull(),
    orgId: text('orgId').notNull(),
    // A cash refund changes the drawer of the shift that issued it, which can
    // be different from the shift that made the original sale.
    posSessionId: text('posSessionId').references(() => posSession.id, {
      onDelete: 'restrict',
    }),
    terminalId: text('terminalId').references(() => posTerminal.id, { onDelete: 'restrict' }),
    pointsEarnedReversed: integer('pointsEarnedReversed').notNull().default(0),
    pointsRedeemedRestored: integer('pointsRedeemedRestored')
      .notNull()
      .default(0),
    bonusRestored: numeric('bonusRestored', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),
    rewardEligibleSpendReversed: numeric('rewardEligibleSpendReversed', {
      precision: 12,
      scale: 2,
    })
      .notNull()
      .default('0'),
    rewardEffectsAppliedAt: timestamp('rewardEffectsAppliedAt'),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
  },
  (table) => ({
    organizationIndex: index('sales_return_org_idx').on(table.orgId),
    sessionIndex: index('sales_return_session_idx').on(table.posSessionId),
  })
);

export const salesReturnItem = pgTable('sales_return_item', {
  id: text('id').primaryKey(),
  returnId: text('returnId')
    .notNull()
    .references(() => salesReturn.id, { onDelete: 'cascade' }),
  originalSaleItemId: text('originalSaleItemId').references(() => saleItem.id, {
    onDelete: 'restrict',
  }),
  productId: text('productId').notNull(),
  productName: text('productName').notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: numeric('unitPrice', { precision: 12, scale: 2 }).notNull(),
  total: numeric('total', { precision: 12, scale: 2 }).notNull(),
  disposition: text('disposition').notNull().default('restock'),
  orgId: text('orgId').notNull(),
});

/** Pharmacy returns stay unavailable until an authorized disposition decision
 * is recorded. The original allocation preserves batch recall traceability. */
export const pharmacyReturnDisposition = pgTable(
  'pharmacy_return_disposition',
  {
    id: text('id').primaryKey(),
    organizationId: text('organizationId')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    branchId: text('branchId')
      .notNull()
      .references(() => branch.id, { onDelete: 'restrict' }),
    returnId: text('returnId')
      .notNull()
      .references(() => salesReturn.id, { onDelete: 'restrict' }),
    returnItemId: text('returnItemId')
      .notNull()
      .references(() => salesReturnItem.id, { onDelete: 'restrict' }),
    originalSaleItemId: text('originalSaleItemId')
      .notNull()
      .references(() => saleItem.id, { onDelete: 'restrict' }),
    originalAllocationId: text('originalAllocationId').references(
      () => saleItemLotAllocation.id,
      { onDelete: 'restrict' }
    ),
    productId: text('productId')
      .notNull()
      .references(() => product.id, { onDelete: 'restrict' }),
    originalLotId: text('originalLotId').references(() => inventoryLot.id, {
      onDelete: 'restrict',
    }),
    lotNumber: text('lotNumber'),
    quantity: numeric('quantity', { precision: 16, scale: 3 }).notNull(),
    status: text('status').notNull().default('quarantined'),
    supplierReturnReference: text('supplierReturnReference'),
    supplierReturnStatus: text('supplierReturnStatus'),
    supplierCreditNote: text('supplierCreditNote'),
    supplierResolvedBy: text('supplierResolvedBy').references(() => user.id, {
      onDelete: 'restrict',
    }),
    supplierResolvedAt: timestamp('supplierResolvedAt'),
    notes: text('notes'),
    createdBy: text('createdBy')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({
    organizationStatusIndex: index(
      'pharmacy_return_disposition_org_status_idx'
    ).on(table.organizationId, table.status),
    returnIndex: index('pharmacy_return_disposition_return_idx').on(
      table.returnId
    ),
    allocationIndex: index('pharmacy_return_disposition_allocation_idx').on(
      table.originalAllocationId
    ),
  })
);

export const etimsCreditNote = pgTable(
  'etims_credit_note',
  {
    id: text('id').primaryKey(),
    organizationId: text('organizationId')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    branchId: text('branchId')
      .notNull()
      .references(() => branch.id, { onDelete: 'restrict' }),
    saleId: text('saleId')
      .notNull()
      .references(() => sale.id, { onDelete: 'restrict' }),
    returnId: text('returnId')
      .notNull()
      .references(() => salesReturn.id, { onDelete: 'restrict' }),
    originalSubmissionId: text('originalSubmissionId')
      .notNull()
      .references(() => etimsSubmission.id, { onDelete: 'restrict' }),
    status: text('status').notNull().default('PENDING'),
    provider: text('provider').notNull(),
    environment: text('environment').notNull(),
    idempotencyKey: text('idempotencyKey').notNull(),
    providerSubmissionId: text('providerSubmissionId'),
    creditNoteNumber: text('creditNoteNumber'),
    requestData: json('requestData'),
    responseData: json('responseData'),
    retryCount: integer('retryCount').notNull().default(0),
    lastAttemptAt: timestamp('lastAttemptAt'),
    nextRetryAt: timestamp('nextRetryAt'),
    acceptedAt: timestamp('acceptedAt'),
    errorCode: text('errorCode'),
    errorMessage: text('errorMessage'),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({
    returnUnique: uniqueIndex('etims_credit_note_return_unique').on(
      table.returnId
    ),
    idempotencyUnique: uniqueIndex('etims_credit_note_idempotency_unique').on(
      table.organizationId,
      table.idempotencyKey
    ),
    retryIndex: index('etims_credit_note_retry_idx').on(
      table.status,
      table.nextRetryAt
    ),
  })
);

export const inventoryLoss = pgTable(
  'inventory_loss',
  {
    id: text('id').primaryKey(),
    lossNo: text('lossNo').notNull(),
    productId: text('productId').notNull(),
    productName: text('productName').notNull(),
    quantity: integer('quantity').notNull(),
    type: text('type').notNull(),
    unitCost: numeric('unitCost', { precision: 12, scale: 2 }).notNull(),
    totalCost: numeric('totalCost', { precision: 12, scale: 2 }).notNull(),
    reason: text('reason').notNull(),
    userId: text('userId').notNull(),
    orgId: text('orgId').notNull(),
    branchId: text('branchId').references(() => branch.id, {
      onDelete: 'restrict',
    }),
    terminalId: text('terminalId').references(() => posTerminal.id, { onDelete: 'restrict' }),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
  },
  (table) => ({
    organizationIndex: index('inventory_loss_org_idx').on(table.orgId),
  })
);

export const posSession = pgTable(
  'pos_session',
  {
    id: text('id').primaryKey(),
    sessionNo: text('sessionNo').notNull(),
    status: text('status').notNull().default('open'),
    openingCash: numeric('openingCash', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),
    expectedCash: numeric('expectedCash', { precision: 12, scale: 2 }),
    closingCash: numeric('closingCash', { precision: 12, scale: 2 }),
    variance: numeric('variance', { precision: 12, scale: 2 }),
    // Blind-count draft: populated while status is closing, promoted to the
    // final closingCash/variance fields only when the shift is closed.
    countedCash: numeric('countedCash', { precision: 12, scale: 2 }),
    countedVariance: numeric('countedVariance', { precision: 12, scale: 2 }),
    countedAt: timestamp('countedAt'),
    notes: text('notes'),
    varianceReason: text('varianceReason'),
    reconciliationStartedAt: timestamp('reconciliationStartedAt'),
    // Immutable closing snapshot for reporting after live sales data changes.
    closingSummary: json('closingSummary'),
    openedBy: text('openedBy').notNull(),
    closedBy: text('closedBy'),
    // A registered POS terminal is the stable physical register identity.
    terminalId: text('terminalId').references(() => posTerminal.id, {
      onDelete: 'restrict',
    }),
    orgId: text('orgId').notNull(),
    branchId: text('branchId').references(() => branch.id, {
      onDelete: 'restrict',
    }),
    openedAt: timestamp('openedAt').notNull().defaultNow(),
    closedAt: timestamp('closedAt'),
  },
  (table) => ({
    organizationIndex: index('pos_session_org_idx').on(table.orgId),
    operatorStatusIndex: index('pos_session_operator_status_idx').on(
      table.orgId,
      table.openedBy,
      table.status
    ),
    branchStatusIndex: index('pos_session_branch_status_idx').on(
      table.orgId,
      table.branchId,
      table.status
    ),
    terminalStatusIndex: index('pos_session_terminal_status_idx').on(
      table.orgId,
      table.terminalId,
      table.status
    ),
  })
);

// POS-only authentication. Secrets are one-way hashes and never returned to clients.
export const posPinCredential = pgTable('pos_pin_credential', {
  userId: text('userId')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  pinHash: text('pinHash').notNull(),
  failedAttempts: integer('failedAttempts').notNull().default(0),
  lockedUntil: timestamp('lockedUntil'),
  enabled: boolean('enabled').notNull().default(true),
  setAt: timestamp('setAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});

export const posTerminal = pgTable(
  'pos_terminal',
  {
    id: text('id').primaryKey(),
    organizationId: text('organizationId')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    branchId: text('branchId')
      .notNull()
      .references(() => branch.id, { onDelete: 'cascade' }),
    tokenHash: text('tokenHash').notNull().unique(),
    name: text('name').notNull().default('POS terminal'),
    status: text('status').notNull().default('active'),
    registeredBy: text('registeredBy')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    lastSeenAt: timestamp('lastSeenAt').notNull().defaultNow(),
  },
  (table) => ({
    organizationIndex: index('pos_terminal_org_idx').on(table.organizationId),
    branchIndex: index('pos_terminal_branch_idx').on(table.branchId),
  })
);

export const posAuthSession = pgTable(
  'pos_auth_session',
  {
    id: text('id').primaryKey(),
    tokenHash: text('tokenHash').notNull().unique(),
    terminalId: text('terminalId')
      .notNull()
      .references(() => posTerminal.id, { onDelete: 'cascade' }),
    userId: text('userId')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    organizationId: text('organizationId')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    branchId: text('branchId')
      .notNull()
      .references(() => branch.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('active'),
    expiresAt: timestamp('expiresAt').notNull(),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    lastSeenAt: timestamp('lastSeenAt').notNull().defaultNow(),
  },
  (table) => ({
    terminalIndex: index('pos_auth_session_terminal_idx').on(table.terminalId),
    userIndex: index('pos_auth_session_user_idx').on(table.userId),
  })
);

/** Server-side reconciliation ledger for browser-queued offline cash sales. */
export const offlineSaleSync = pgTable(
  'offline_sale_sync',
  {
    id: text('id').primaryKey(),
    organizationId: text('organizationId')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    branchId: text('branchId')
      .notNull()
      .references(() => branch.id, { onDelete: 'restrict' }),
    sessionId: text('sessionId')
      .notNull()
      .references(() => posSession.id, { onDelete: 'restrict' }),
    terminalId: text('terminalId').references(() => posTerminal.id, {
      onDelete: 'restrict',
    }),
    userId: text('userId')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    saleId: text('saleId').references(() => sale.id, { onDelete: 'restrict' }),
    idempotencyKey: text('idempotencyKey').notNull(),
    provisionalReceiptNo: text('provisionalReceiptNo').notNull(),
    payloadHash: text('payloadHash').notNull(),
    status: text('status').notNull().default('RECEIVED'),
    attemptCount: integer('attemptCount').notNull().default(0),
    offlineCreatedAt: timestamp('offlineCreatedAt').notNull(),
    firstReceivedAt: timestamp('firstReceivedAt').notNull().defaultNow(),
    lastAttemptAt: timestamp('lastAttemptAt'),
    syncedAt: timestamp('syncedAt'),
    errorCode: text('errorCode'),
    errorMessage: text('errorMessage'),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({
    organizationIdempotencyUnique: uniqueIndex(
      'offline_sale_sync_org_idempotency_unique'
    ).on(table.organizationId, table.idempotencyKey),
    organizationProvisionalReceiptUnique: uniqueIndex(
      'offline_sale_sync_org_provisional_unique'
    ).on(table.organizationId, table.provisionalReceiptNo),
    organizationStatusIndex: index('offline_sale_sync_org_status_idx').on(
      table.organizationId,
      table.status,
      table.updatedAt
    ),
    sessionStatusIndex: index('offline_sale_sync_session_status_idx').on(
      table.sessionId,
      table.status
    ),
  })
);

/** Durable held baskets shared by authorized registers in one branch. */
export const suspendedSale = pgTable(
  'suspended_sale',
  {
    id: text('id').primaryKey(),
    organizationId: text('organizationId')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    branchId: text('branchId')
      .notNull()
      .references(() => branch.id, { onDelete: 'restrict' }),
    terminalId: text('terminalId').references(() => posTerminal.id, {
      onDelete: 'restrict',
    }),
    sessionId: text('sessionId').references(() => posSession.id, {
      onDelete: 'restrict',
    }),
    cashierId: text('cashierId')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    customerId: text('customerId').references(() => customer.id, {
      onDelete: 'set null',
    }),
    idempotencyKey: text('idempotencyKey').notNull(),
    status: text('status').notNull().default('HELD'),
    items: json('items').notNull(),
    discountValue: numeric('discountValue', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),
    discountType: text('discountType').notNull().default('fixed'),
    subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull(),
    note: text('note'),
    expiresAt: timestamp('expiresAt').notNull(),
    resumedBy: text('resumedBy').references(() => user.id, {
      onDelete: 'restrict',
    }),
    resumedTerminalId: text('resumedTerminalId').references(
      () => posTerminal.id,
      { onDelete: 'restrict' }
    ),
    resumedAt: timestamp('resumedAt'),
    deletedBy: text('deletedBy').references(() => user.id, {
      onDelete: 'restrict',
    }),
    deletedAt: timestamp('deletedAt'),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({
    organizationIdempotencyUnique: uniqueIndex(
      'suspended_sale_org_idempotency_unique'
    ).on(table.organizationId, table.idempotencyKey),
    branchStatusCreatedIndex: index(
      'suspended_sale_branch_status_created_idx'
    ).on(table.organizationId, table.branchId, table.status, table.createdAt),
    expiryIndex: index('suspended_sale_expiry_idx').on(
      table.status,
      table.expiresAt
    ),
  })
);

export const cashMovement = pgTable(
  'cash_movement',
  {
    id: text('id').primaryKey(),
    sessionId: text('sessionId')
      .notNull()
      .references(() => posSession.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    reason: text('reason').notNull(),
    notes: text('notes'),
    userId: text('userId').notNull(),
    orgId: text('orgId').notNull(),
    branchId: text('branchId').references(() => branch.id, {
      onDelete: 'restrict',
    }),
    terminalId: text('terminalId').references(() => posTerminal.id, { onDelete: 'restrict' }),
    idempotencyKey: text('idempotencyKey'),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
  },
  (table) => ({
    sessionIndex: index('cash_movement_session_idx').on(table.sessionId),
    idempotencyIndex: uniqueIndex('cash_movement_org_idempotency_idx').on(
      table.orgId,
      table.idempotencyKey
    ),
  })
);

export const salePayment = pgTable(
  'sale_payment',
  {
    id: text('id').primaryKey(),
    saleId: text('saleId')
      .notNull()
      .references(() => sale.id, { onDelete: 'cascade' }),
    method: text('method').notNull(),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    reference: text('reference'),
    cardTerminalId: text('cardTerminalId').references(() => cardTerminal.id, { onDelete: 'restrict' }),
    authorizationCode: text('authorizationCode'),
    cardBrand: text('cardBrand'),
    cardLast4: text('cardLast4'),
    cardEntryMode: text('cardEntryMode'),
    status: text('status').notNull().default('completed'),
    userId: text('userId').notNull(),
    orgId: text('orgId').notNull(),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
  },
  (table) => ({
    organizationIndex: index('sale_payment_org_idx').on(table.orgId),
    saleIndex: index('sale_payment_sale_idx').on(table.saleId),
    referenceIndex: index('sale_payment_org_reference_idx').on(
      table.orgId,
      table.reference
    ),
  })
);

/** A server-verified Daraja STK Push intent. A successful intent may fund one sale only. */
export const mpesaPaymentRequest = pgTable(
  'mpesa_payment_request',
  {
    id: text('id').primaryKey(),
    organizationId: text('organizationId').notNull(),
    userId: text('userId').notNull(),
    branchId: text('branchId'),
    posSessionId: text('posSessionId'),
    customerId: text('customerId'),
    checkoutPayload: json('checkoutPayload'),
    idempotencyKey: text('idempotencyKey').notNull(),
    paymentMode: text('paymentMode').notNull().default('stk'),
    accountReference: text('accountReference'),
    phone: text('phone').notNull(),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    merchantRequestId: text('merchantRequestId'),
    checkoutRequestId: text('checkoutRequestId'),
    receiptNumber: text('receiptNumber'),
    resultCode: text('resultCode'),
    resultDescription: text('resultDescription'),
    status: text('status').notNull().default('pending'),
    saleId: text('saleId'),
    callbackPayload: json('callbackPayload'),
    expiresAt: timestamp('expiresAt').notNull(),
    completedAt: timestamp('completedAt'),
    finalizedAt: timestamp('finalizedAt'),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({
    organizationIndex: index('mpesa_payment_request_org_idx').on(
      table.organizationId
    ),
    checkoutRequestUnique: uniqueIndex(
      'mpesa_payment_request_checkout_unique'
    ).on(table.checkoutRequestId),
    accountReferenceUnique: uniqueIndex(
      'mpesa_payment_request_account_reference_unique'
    ).on(table.accountReference),
    receiptNumberUnique: uniqueIndex('mpesa_payment_request_receipt_unique').on(
      table.receiptNumber
    ),
    organizationIdempotencyUnique: uniqueIndex(
      'mpesa_payment_request_org_idempotency_unique'
    ).on(table.organizationId, table.idempotencyKey),
  })
);

/** Immutable C2B receipts, including payments that need manual reconciliation. */
export const mpesaIncomingPayment = pgTable(
  'mpesa_incoming_payment',
  {
    id: text('id').primaryKey(),
    transactionId: text('transactionId').notNull(),
    organizationId: text('organizationId'),
    branchId: text('branchId'),
    shortcode: text('shortcode').notNull(),
    accountReference: text('accountReference'),
    phone: text('phone'),
    payerName: text('payerName'),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    matchedRequestId: text('matchedRequestId'),
    matchedAt: timestamp('matchedAt'),
    matchedBy: text('matchedBy'),
    status: text('status').notNull().default('unmatched'),
    payload: json('payload'),
    transactionAt: timestamp('transactionAt'),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
  },
  (table) => ({
    transactionUnique: uniqueIndex(
      'mpesa_incoming_payment_transaction_unique'
    ).on(table.transactionId),
    referenceIndex: index('mpesa_incoming_payment_reference_idx').on(
      table.accountReference
    ),
  })
);

/** Maps a Daraja shortcode to the tenant and branch that own its callbacks. */
export const mpesaBusinessAccount = pgTable(
  'mpesa_business_account',
  {
    id: text('id').primaryKey(),
    organizationId: text('organizationId').notNull(),
    branchId: text('branchId').notNull(),
    shortcode: text('shortcode').notNull(),
    accountType: text('accountType').notNull(),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({
    shortcodeUnique: uniqueIndex('mpesa_business_account_shortcode_unique').on(
      table.shortcode
    ),
    organizationIndex: index('mpesa_business_account_org_idx').on(
      table.organizationId
    ),
  })
);

export const creditSale = pgTable(
  'credit_sale',
  {
    id: text('id').primaryKey(),
    saleId: text('saleId')
      .notNull()
      .references(() => sale.id, { onDelete: 'cascade' }),
    customerId: text('customerId')
      .notNull()
      .references(() => customer.id, { onDelete: 'restrict' }),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    amountPaid: numeric('amountPaid', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),
    creditedAmount: numeric('creditedAmount', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),
    dueDate: timestamp('dueDate'),
    status: text('status').notNull().default('unpaid'),
    userId: text('userId').notNull(),
    orgId: text('orgId').notNull(),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({
    organizationIndex: index('credit_sale_org_idx').on(table.orgId),
    customerIndex: index('credit_sale_customer_idx').on(table.customerId),
    organizationStatusDueIndex: index('credit_sale_org_status_due_idx').on(table.orgId, table.status, table.dueDate),
    saleUnique: uniqueIndex('credit_sale_sale_unique').on(table.saleId),
  })
);

export const creditPayment = pgTable(
  'credit_payment',
  {
    id: text('id').primaryKey(),
    creditSaleId: text('creditSaleId')
      .notNull()
      .references(() => creditSale.id, { onDelete: 'cascade' }),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    method: text('method').notNull().default('cash'),
    reference: text('reference'),
    idempotencyKey: text('idempotencyKey'),
    userId: text('userId').notNull(),
    orgId: text('orgId').notNull(),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
  },
  (table) => ({
    organizationIndex: index('credit_payment_org_idx').on(table.orgId),
    creditSaleCreatedIndex: index('credit_payment_credit_sale_created_idx').on(table.creditSaleId, table.createdAt),
    organizationIdempotencyUnique: uniqueIndex('credit_payment_org_idempotency_unique').on(table.orgId, table.idempotencyKey),
  })
);

export const stockAdjustment = pgTable(
  'stock_adjustment',
  {
    id: text('id').primaryKey(),
    adjustmentNo: text('adjustmentNo').notNull(),
    type: text('type').notNull(),
    status: text('status').notNull().default('pending'),
    notes: text('notes'),
    approvedBy: text('approvedBy'),
    branchId: text('branchId').references(() => branch.id, {
      onDelete: 'restrict',
    }),
    countMode: text('countMode').notNull().default('cycle'),
    countName: text('countName'),
    assignedTo: text('assignedTo'),
    blindCount: boolean('blindCount').notNull().default(false),
    startedAt: timestamp('startedAt'),
    submittedAt: timestamp('submittedAt'),
    userId: text('userId').notNull(),
    orgId: text('orgId').notNull(),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    approvedAt: timestamp('approvedAt'),
    completedAt: timestamp('completedAt'),
  },
  (table) => ({
    organizationIndex: index('stock_adjustment_org_idx').on(table.orgId),
  })
);

export const stockAdjustmentItem = pgTable('stock_adjustment_item', {
  id: text('id').primaryKey(),
  adjustmentId: text('adjustmentId')
    .notNull()
    .references(() => stockAdjustment.id, { onDelete: 'cascade' }),
  productId: text('productId').notNull(),
  productName: text('productName').notNull(),
  quantityBefore: integer('quantityBefore').notNull(),
  quantityAfter: integer('quantityAfter').notNull(),
  variance: integer('variance').notNull(),
  countedAt: timestamp('countedAt'),
  countedBy: text('countedBy'),
  notes: text('notes'),
  orgId: text('orgId').notNull(),
});

export const customerCreditLimit = pgTable(
  'customer_credit_limit',
  {
    id: text('id').primaryKey(),
    customerId: text('customerId')
      .notNull()
      .references(() => customer.id, { onDelete: 'cascade' }),
    creditLimit: numeric('creditLimit', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),
    currentBalance: numeric('currentBalance', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),
    approvedBy: text('approvedBy').notNull(),
    status: text('status').notNull().default('active'),
    orgId: text('orgId').notNull(),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({
    organizationIndex: index('customer_credit_limit_org_idx').on(table.orgId),
    customerIndex: index('customer_credit_limit_customer_idx').on(
      table.customerId
    ),
    organizationCustomerUnique: uniqueIndex('customer_credit_limit_org_customer_unique').on(table.orgId, table.customerId),
  })
);

export const cashierShift = pgTable(
  'cashier_shift',
  {
    id: text('id').primaryKey(),
    shiftNo: text('shiftNo').notNull(),
    cashierId: text('cashierId')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    sessionId: text('sessionId')
      .notNull()
      .references(() => posSession.id, { onDelete: 'cascade' }),
    startTime: timestamp('startTime').notNull(),
    endTime: timestamp('endTime'),
    openingCash: numeric('openingCash', { precision: 12, scale: 2 }).notNull(),
    closingCash: numeric('closingCash', { precision: 12, scale: 2 }),
    expectedCash: numeric('expectedCash', { precision: 12, scale: 2 }),
    variance: numeric('variance', { precision: 12, scale: 2 }),
    status: text('status').notNull().default('open'),
    orgId: text('orgId').notNull(),
  },
  (table) => ({
    organizationIndex: index('cashier_shift_org_idx').on(table.orgId),
    cashierIndex: index('cashier_shift_cashier_idx').on(table.cashierId),
  })
);

// --- Staff & Employee Management ---
export const employee = pgTable(
  'employee',
  {
    id: text('id').primaryKey(),
    userId: text('userId').references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    email: text('email'),
    phone: text('phone'),
    role: text('role').notNull().default('staff'), // manager, cashier, stock, supervisor
    department: text('department'),
    salary: numeric('salary', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),
    profile: json('profile').notNull().default({}),
    joinDate: timestamp('joinDate').notNull().defaultNow(),
    status: text('status').notNull().default('active'), // active, inactive, terminated
    orgId: text('orgId')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({ organizationIndex: index('employee_org_idx').on(table.orgId) })
);

// Work attendance deliberately remains separate from POS cash sessions. A
// person can be clocked in without operating a register, and vice versa.
export const staffAttendance = pgTable(
  'staff_attendance',
  {
    id: text('id').primaryKey(),
    organizationId: text('organizationId').notNull().references(() => organization.id, { onDelete: 'cascade' }),
    branchId: text('branchId').notNull().references(() => branch.id, { onDelete: 'restrict' }),
    userId: text('userId').notNull().references(() => user.id, { onDelete: 'restrict' }),
    workDate: text('workDate').notNull(), // organization-local ISO date at clock-in
    clockInAt: timestamp('clockInAt').notNull(),
    clockOutAt: timestamp('clockOutAt'),
    status: text('status').notNull().default('working'),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({
    activeUserUnique: uniqueIndex('staff_attendance_active_user_unique').on(table.organizationId, table.userId).where(sql`${table.clockOutAt} is null`),
    organizationDateIndex: index('staff_attendance_org_date_idx').on(table.organizationId, table.workDate),
    userDateIndex: index('staff_attendance_user_date_idx').on(table.userId, table.workDate),
  })
);

export const staffAttendanceBreak = pgTable('staff_attendance_break', {
  id: text('id').primaryKey(),
  attendanceId: text('attendanceId').notNull().references(() => staffAttendance.id, { onDelete: 'cascade' }),
  startedAt: timestamp('startedAt').notNull(),
  endedAt: timestamp('endedAt'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
}, (table) => ({
  activeAttendanceUnique: uniqueIndex('staff_attendance_break_active_unique').on(table.attendanceId).where(sql`${table.endedAt} is null`),
}));

export const staffAttendanceAudit = pgTable('staff_attendance_audit', {
  id: text('id').primaryKey(),
  attendanceId: text('attendanceId').notNull().references(() => staffAttendance.id, { onDelete: 'cascade' }),
  organizationId: text('organizationId').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  managerId: text('managerId').notNull().references(() => user.id, { onDelete: 'restrict' }),
  originalValue: json('originalValue').notNull(),
  correctedValue: json('correctedValue').notNull(),
  reason: text('reason').notNull(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
});

export const shift = pgTable(
  'shift',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    startTime: text('startTime').notNull(), // HH:mm format
    endTime: text('endTime').notNull(),
    orgId: text('orgId')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
  },
  (table) => ({ organizationIndex: index('shift_org_idx').on(table.orgId) })
);

export const shiftAssignment = pgTable(
  'shift_assignment',
  {
    id: text('id').primaryKey(),
    employeeId: text('employeeId')
      .notNull()
      .references(() => employee.id, { onDelete: 'cascade' }),
    shiftId: text('shiftId')
      .notNull()
      .references(() => shift.id, { onDelete: 'cascade' }),
    date: timestamp('date').notNull(),
    orgId: text('orgId')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
  },
  (table) => ({
    organizationIndex: index('shift_assignment_org_idx').on(table.orgId),
    employeeIndex: index('shift_assignment_employee_idx').on(table.employeeId),
  })
);

export const employeeCommission = pgTable(
  'employee_commission',
  {
    id: text('id').primaryKey(),
    employeeId: text('employeeId')
      .notNull()
      .references(() => employee.id, { onDelete: 'cascade' }),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    period: text('period').notNull(), // YYYY-MM format
    status: text('status').notNull().default('pending'), // pending, approved, paid
    orgId: text('orgId')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
  },
  (table) => ({
    organizationIndex: index('employee_commission_org_idx').on(table.orgId),
  })
);

// --- Customer documents ---
export const invoice = pgTable(
  'invoice',
  {
    id: text('id').primaryKey(),
    invoiceNo: text('invoiceNo').notNull(),
    branchId: text('branchId').references(() => branch.id, { onDelete: 'restrict' }),
    saleId: text('saleId').references(() => sale.id, { onDelete: 'restrict' }),
    creditSaleId: text('creditSaleId').references(() => creditSale.id, { onDelete: 'restrict' }),
    customerSnapshot: json('customerSnapshot').notNull().default({}),
    businessSnapshot: json('businessSnapshot').notNull().default({}),
    customerId: text('customerId').references(() => customer.id, {
      onDelete: 'set null',
    }),
    subtotal: numeric('subtotal', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),
    discountAmount: numeric('discountAmount', { precision: 12, scale: 2 }).notNull().default('0'),
    shippingAmount: numeric('shippingAmount', { precision: 12, scale: 2 }).notNull().default('0'),
    roundingAmount: numeric('roundingAmount', { precision: 12, scale: 2 }).notNull().default('0'),
    taxableAmount: numeric('taxableAmount', { precision: 12, scale: 2 }).notNull().default('0'),
    taxRate: numeric('taxRate', { precision: 7, scale: 4 }).notNull().default('0'),
    taxAmount: numeric('taxAmount', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),
    total: numeric('total', { precision: 12, scale: 2 }).notNull(),
    amountPaid: numeric('amountPaid', { precision: 12, scale: 2 }).notNull().default('0'),
    creditedAmount: numeric('creditedAmount', { precision: 12, scale: 2 }).notNull().default('0'),
    balanceDue: numeric('balanceDue', { precision: 12, scale: 2 }).notNull().default('0'),
    fiscalStatus: text('fiscalStatus').notNull().default('not_submitted'),
    fiscalReference: text('fiscalReference'),
    idempotencyKey: text('idempotencyKey'),
    dueDate: timestamp('dueDate'),
    issuedAt: timestamp('issuedAt'),
    status: text('status').notNull().default('draft'), // draft, issued, partially_paid, paid, overdue, cancelled, credited
    notes: text('notes'),
    orgId: text('orgId')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    userId: text('userId').notNull(),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({ organizationIndex: index('invoice_org_idx').on(table.orgId), organizationBranchCreatedIndex: index('invoice_org_branch_created_idx').on(table.orgId, table.branchId, table.createdAt), organizationStatusDueIndex: index('invoice_org_status_due_idx').on(table.orgId, table.status, table.dueDate), organizationNumberUnique: uniqueIndex('invoice_org_number_unique').on(table.orgId, table.invoiceNo), organizationIdempotencyUnique: uniqueIndex('invoice_org_idempotency_unique').on(table.orgId, table.idempotencyKey), saleUnique: uniqueIndex('invoice_sale_unique').on(table.saleId), creditSaleUnique: uniqueIndex('invoice_credit_sale_unique').on(table.creditSaleId) })
);

export const invoiceNumberSequence = pgTable('invoice_number_sequence', {
  organizationId: text('organizationId').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  year: integer('year').notNull(),
  lastNumber: integer('lastNumber').notNull().default(0),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
}, (table) => ({ organizationYearUnique: uniqueIndex('invoice_number_sequence_org_year_unique').on(table.organizationId, table.year) }));

export const invoiceItem = pgTable('invoice_item', {
  id: text('id').primaryKey(),
  invoiceId: text('invoiceId')
    .notNull()
    .references(() => invoice.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: numeric('unitPrice', { precision: 12, scale: 2 }).notNull(),
  sku: text('sku'),
  unit: text('unit').notNull().default('each'),
  discountAmount: numeric('discountAmount', { precision: 12, scale: 2 }).notNull().default('0'),
  invoiceDiscountShare: numeric('invoiceDiscountShare', { precision: 12, scale: 2 }).notNull().default('0'),
  taxRate: numeric('taxRate', { precision: 7, scale: 4 }).notNull().default('0'),
  taxAmount: numeric('taxAmount', { precision: 12, scale: 2 }).notNull().default('0'),
  total: numeric('total', { precision: 12, scale: 2 }).notNull(),
  orgId: text('orgId').notNull(),
});

export const invoicePayment = pgTable('invoice_payment', {
  id: text('id').primaryKey(),
  invoiceId: text('invoiceId').notNull().references(() => invoice.id, { onDelete: 'restrict' }),
  organizationId: text('organizationId').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  branchId: text('branchId').references(() => branch.id, { onDelete: 'restrict' }),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  method: text('method').notNull(),
  reference: text('reference'),
  idempotencyKey: text('idempotencyKey').notNull(),
  receivedBy: text('receivedBy').notNull().references(() => user.id, { onDelete: 'restrict' }),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
}, (table) => ({ invoiceIndex: index('invoice_payment_invoice_idx').on(table.invoiceId), idempotencyUnique: uniqueIndex('invoice_payment_idempotency_unique').on(table.organizationId, table.idempotencyKey) }));

export const invoiceCreditNote = pgTable('invoice_credit_note', {
  id: text('id').primaryKey(),
  organizationId: text('organizationId').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  branchId: text('branchId').references(() => branch.id, { onDelete: 'restrict' }),
  invoiceId: text('invoiceId').notNull().references(() => invoice.id, { onDelete: 'restrict' }),
  returnId: text('returnId').references(() => salesReturn.id, { onDelete: 'restrict' }),
  creditNoteNo: text('creditNoteNo').notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  reason: text('reason').notNull(),
  status: text('status').notNull().default('issued'),
  fiscalStatus: text('fiscalStatus').notNull().default('not_submitted'),
  fiscalReference: text('fiscalReference'),
  idempotencyKey: text('idempotencyKey').notNull(),
  createdBy: text('createdBy').notNull().references(() => user.id, { onDelete: 'restrict' }),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
}, (table) => ({
  organizationNumberUnique: uniqueIndex('invoice_credit_note_org_number_unique').on(table.organizationId, table.creditNoteNo),
  organizationIdempotencyUnique: uniqueIndex('invoice_credit_note_org_idempotency_unique').on(table.organizationId, table.idempotencyKey),
  returnUnique: uniqueIndex('invoice_credit_note_return_unique').on(table.returnId),
  invoiceCreatedIndex: index('invoice_credit_note_invoice_created_idx').on(table.invoiceId, table.createdAt),
}));

/** Read-only preservation for deterministic finance migration repairs. */
export const financeLegacyArchive = pgTable('finance_legacy_archive', {
  id: text('id').primaryKey(),
  organizationId: text('organizationId').notNull().references(() => organization.id, { onDelete: 'restrict' }),
  entityType: text('entityType').notNull(),
  legacyId: text('legacyId').notNull(),
  reason: text('reason').notNull(),
  data: json('data').notNull(),
  archivedAt: timestamp('archivedAt').notNull().defaultNow(),
}, (table) => ({
  entityLegacyUnique: uniqueIndex('finance_legacy_archive_entity_legacy_unique').on(table.entityType, table.legacyId),
  organizationIndex: index('finance_legacy_archive_org_idx').on(table.organizationId),
}));

export const quotation = pgTable(
  'quotation',
  {
    id: text('id').primaryKey(),
    quoteNo: text('quoteNo').notNull(),
    customerId: text('customerId').references(() => customer.id, {
      onDelete: 'set null',
    }),
    subtotal: numeric('subtotal', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),
    taxAmount: numeric('taxAmount', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),
    total: numeric('total', { precision: 12, scale: 2 }).notNull(),
    validUntil: timestamp('validUntil'),
    status: text('status').notNull().default('draft'), // draft, sent, accepted, rejected, expired
    notes: text('notes'),
    orgId: text('orgId')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    userId: text('userId').notNull(),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({ organizationIndex: index('quotation_org_idx').on(table.orgId) })
);

export const quotationItem = pgTable('quotation_item', {
  id: text('id').primaryKey(),
  quotationId: text('quotationId')
    .notNull()
    .references(() => quotation.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: numeric('unitPrice', { precision: 12, scale: 2 }).notNull(),
  total: numeric('total', { precision: 12, scale: 2 }).notNull(),
  orgId: text('orgId').notNull(),
});

// --- Inventory & Process Management ---
export const inventoryTransfer = pgTable(
  'inventory_transfer',
  {
    id: text('id').primaryKey(),
    transferNo: text('transferNo').notNull(),
    fromLocation: text('fromLocation').notNull(), // branch ID or location
    toLocation: text('toLocation').notNull(),
    status: text('status').notNull().default('pending'), // pending, in_transit, received
    userId: text('userId').notNull(),
    approvedBy: text('approvedBy'),
    dispatchedBy: text('dispatchedBy'),
    receivedBy: text('receivedBy'),
    reference: text('reference'),
    notes: text('notes'),
    trackingNumber: text('trackingNumber'),
    idempotencyKey: text('idempotencyKey'),
    orgId: text('orgId')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    approvedAt: timestamp('approvedAt'),
    dispatchedAt: timestamp('dispatchedAt'),
    receivedAt: timestamp('receivedAt'),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({
    organizationIndex: index('inventory_transfer_org_idx').on(table.orgId),
    organizationNumberUnique: uniqueIndex(
      'inventory_transfer_org_number_unique'
    ).on(table.orgId, table.transferNo),
    organizationIdempotencyUnique: uniqueIndex(
      'inventory_transfer_org_idempotency_unique'
    ).on(table.orgId, table.idempotencyKey),
  })
);

export const inventoryTransferItem = pgTable('inventory_transfer_item', {
  id: text('id').primaryKey(),
  transferId: text('transferId')
    .notNull()
    .references(() => inventoryTransfer.id, { onDelete: 'cascade' }),
  productId: text('productId').notNull(),
  productName: text('productName').notNull(),
  quantity: integer('quantity').notNull(),
  dispatchedQuantity: numeric('dispatchedQuantity', { precision: 16, scale: 3 })
    .notNull()
    .default('0'),
  receivedQuantity: numeric('receivedQuantity', { precision: 16, scale: 3 })
    .notNull()
    .default('0'),
  rejectedQuantity: numeric('rejectedQuantity', { precision: 16, scale: 3 })
    .notNull()
    .default('0'),
  orgId: text('orgId').notNull(),
});

export const inventoryTransferLotAllocation = pgTable(
  'inventory_transfer_lot_allocation',
  {
    id: text('id').primaryKey(),
    organizationId: text('organizationId')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    transferId: text('transferId')
      .notNull()
      .references(() => inventoryTransfer.id, { onDelete: 'cascade' }),
    transferItemId: text('transferItemId')
      .notNull()
      .references(() => inventoryTransferItem.id, { onDelete: 'cascade' }),
    productId: text('productId')
      .notNull()
      .references(() => product.id, { onDelete: 'restrict' }),
    sourceLotId: text('sourceLotId')
      .notNull()
      .references(() => inventoryLot.id, { onDelete: 'restrict' }),
    lotNumber: text('lotNumber').notNull(),
    barcode: text('barcode'),
    manufacturedAt: timestamp('manufacturedAt'),
    bestBeforeAt: timestamp('bestBeforeAt'),
    expiresAt: timestamp('expiresAt'),
    alertAt: timestamp('alertAt'),
    supplierId: text('supplierId').references(() => supplier.id, {
      onDelete: 'set null',
    }),
    unitCost: numeric('unitCost', { precision: 12, scale: 4 })
      .notNull()
      .default('0'),
    dispatchedQuantity: numeric('dispatchedQuantity', {
      precision: 16,
      scale: 3,
    }).notNull(),
    receivedQuantity: numeric('receivedQuantity', { precision: 16, scale: 3 })
      .notNull()
      .default('0'),
    rejectedQuantity: numeric('rejectedQuantity', { precision: 16, scale: 3 })
      .notNull()
      .default('0'),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({
    transferItemIndex: index('inventory_transfer_lot_item_idx').on(
      table.transferItemId
    ),
    organizationTransferIndex: index(
      'inventory_transfer_lot_org_transfer_idx'
    ).on(table.organizationId, table.transferId),
  })
);

export const task = pgTable(
  'task',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    description: text('description'),
    status: text('status').notNull().default('pending'), // pending, in_progress, completed, cancelled
    priority: text('priority').notNull().default('medium'), // low, medium, high, urgent
    assigneeId: text('assigneeId').references(() => employee.id, {
      onDelete: 'set null',
    }),
    dueDate: timestamp('dueDate'),
    completedAt: timestamp('completedAt'),
    orgId: text('orgId')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    createdBy: text('createdBy').notNull(),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
  },
  (table) => ({ organizationIndex: index('task_org_idx').on(table.orgId) })
);

export const performanceGoal = pgTable(
  'performance_goal',
  {
    id: text('id').primaryKey(),
    employeeId: text('employeeId')
      .notNull()
      .references(() => employee.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    target: numeric('target', { precision: 12, scale: 2 }).notNull(),
    achieved: numeric('achieved', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),
    period: text('period').notNull(), // YYYY-Q1, YYYY-Q2, YYYY-MM
    status: text('status').notNull().default('in_progress'), // in_progress, completed, missed
    orgId: text('orgId')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
  },
  (table) => ({
    organizationIndex: index('performance_goal_org_idx').on(table.orgId),
  })
);

// --- Retail finance operations --------------------------------------------
// These records extend the authoritative POS, Stock Intake and customer-credit
// ledgers. They intentionally do not pretend to be a double-entry accounting
// ledger.
export const financialAccount = pgTable(
  'financial_account',
  {
    id: text('id').primaryKey(),
    organizationId: text('organizationId').notNull().references(() => organization.id, { onDelete: 'cascade' }),
    branchId: text('branchId').references(() => branch.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    type: text('type').notNull(),
    provider: text('provider'),
    maskedIdentifier: text('maskedIdentifier'),
    isActive: boolean('isActive').notNull().default(true),
    reconciliationEnabled: boolean('reconciliationEnabled').notNull().default(true),
    createdBy: text('createdBy').notNull().references(() => user.id, { onDelete: 'restrict' }),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({ nameUnique: uniqueIndex('financial_account_org_name_unique').on(table.organizationId, table.name), organizationIndex: index('financial_account_org_active_idx').on(table.organizationId, table.isActive) })
);

export const reconciliationImport = pgTable(
  'reconciliation_import',
  {
    id: text('id').primaryKey(), organizationId: text('organizationId').notNull().references(() => organization.id, { onDelete: 'cascade' }),
    financialAccountId: text('financialAccountId').notNull().references(() => financialAccount.id, { onDelete: 'restrict' }),
    filename: text('filename').notNull(), fileHash: text('fileHash').notNull(), statementFrom: timestamp('statementFrom'), statementTo: timestamp('statementTo'), rowCount: integer('rowCount').notNull(),
    status: text('status').notNull().default('imported'), importedBy: text('importedBy').notNull().references(() => user.id, { onDelete: 'restrict' }), createdAt: timestamp('createdAt').notNull().defaultNow(),
  },
  (table) => ({ hashUnique: uniqueIndex('reconciliation_import_org_hash_unique').on(table.organizationId, table.fileHash) })
);

export const externalFinancialTransaction = pgTable(
  'external_financial_transaction',
  {
    id: text('id').primaryKey(), organizationId: text('organizationId').notNull().references(() => organization.id, { onDelete: 'cascade' }),
    financialAccountId: text('financialAccountId').notNull().references(() => financialAccount.id, { onDelete: 'restrict' }), importId: text('importId').references(() => reconciliationImport.id, { onDelete: 'restrict' }),
    externalId: text('externalId').notNull(), transactionAt: timestamp('transactionAt').notNull(), amount: numeric('amount', { precision: 14, scale: 2 }).notNull(), feeAmount: numeric('feeAmount', { precision: 14, scale: 2 }).notNull().default('0'), direction: text('direction').notNull(), description: text('description'), reference: text('reference'),
    status: text('status').notNull().default('unmatched'), ignoredReason: text('ignoredReason'), rowHash: text('rowHash').notNull(), createdAt: timestamp('createdAt').notNull().defaultNow(), updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({ rowUnique: uniqueIndex('external_financial_transaction_account_row_unique').on(table.financialAccountId, table.rowHash), statusIndex: index('external_financial_transaction_org_status_idx').on(table.organizationId, table.status, table.transactionAt) })
);

export const reconciliationMatch = pgTable(
  'reconciliation_match',
  {
    id: text('id').primaryKey(), organizationId: text('organizationId').notNull().references(() => organization.id, { onDelete: 'cascade' }), externalTransactionId: text('externalTransactionId').notNull().references(() => externalFinancialTransaction.id, { onDelete: 'restrict' }),
    systemType: text('systemType').notNull(), systemId: text('systemId').notNull(), systemAmount: numeric('systemAmount', { precision: 14, scale: 2 }).notNull(), externalAmount: numeric('externalAmount', { precision: 14, scale: 2 }).notNull(), difference: numeric('difference', { precision: 14, scale: 2 }).notNull(), status: text('status').notNull(), reason: text('reason'), idempotencyKey: text('idempotencyKey').notNull(), matchedBy: text('matchedBy').notNull().references(() => user.id, { onDelete: 'restrict' }), matchedAt: timestamp('matchedAt').notNull().defaultNow(),
  },
  (table) => ({ externalUnique: uniqueIndex('reconciliation_match_external_unique').on(table.externalTransactionId), idempotencyUnique: uniqueIndex('reconciliation_match_org_idempotency_unique').on(table.organizationId, table.idempotencyKey) })
);

export const financeApprovalPolicy = pgTable('finance_approval_policy', {
  id: text('id').primaryKey(), organizationId: text('organizationId').notNull().references(() => organization.id, { onDelete: 'cascade' }), actionType: text('actionType').notNull(), thresholdAmount: numeric('thresholdAmount', { precision: 14, scale: 2 }).notNull(), preventSelfApproval: boolean('preventSelfApproval').notNull().default(true), isActive: boolean('isActive').notNull().default(true), createdAt: timestamp('createdAt').notNull().defaultNow(), updatedAt: timestamp('updatedAt').notNull().defaultNow(),
}, (table) => ({ actionUnique: uniqueIndex('finance_approval_policy_org_action_unique').on(table.organizationId, table.actionType) }));

export const financeApproval = pgTable('finance_approval', {
  id: text('id').primaryKey(), organizationId: text('organizationId').notNull().references(() => organization.id, { onDelete: 'cascade' }), branchId: text('branchId').references(() => branch.id, { onDelete: 'restrict' }), actionType: text('actionType').notNull(), entityType: text('entityType').notNull(), entityId: text('entityId').notNull(), amount: numeric('amount', { precision: 14, scale: 2 }).notNull(), reason: text('reason').notNull(), status: text('status').notNull().default('pending'), requestedBy: text('requestedBy').notNull().references(() => user.id, { onDelete: 'restrict' }), decidedBy: text('decidedBy').references(() => user.id, { onDelete: 'restrict' }), decisionReason: text('decisionReason'), decidedAt: timestamp('decidedAt'), idempotencyKey: text('idempotencyKey').notNull(), createdAt: timestamp('createdAt').notNull().defaultNow(), updatedAt: timestamp('updatedAt').notNull().defaultNow(),
}, (table) => ({ idempotencyUnique: uniqueIndex('finance_approval_org_idempotency_unique').on(table.organizationId, table.idempotencyKey), pendingIndex: index('finance_approval_org_status_idx').on(table.organizationId, table.status, table.createdAt) }));

export const financeDocument = pgTable('finance_document', {
  id: text('id').primaryKey(), organizationId: text('organizationId').notNull().references(() => organization.id, { onDelete: 'cascade' }), entityType: text('entityType').notNull(), entityId: text('entityId').notNull(), filename: text('filename').notNull(), storageUrl: text('storageUrl').notNull(), contentType: text('contentType').notNull(), sizeBytes: integer('sizeBytes').notNull(), uploadedBy: text('uploadedBy').notNull().references(() => user.id, { onDelete: 'restrict' }), createdAt: timestamp('createdAt').notNull().defaultNow(),
}, (table) => ({ entityIndex: index('finance_document_org_entity_idx').on(table.organizationId, table.entityType, table.entityId) }));

// --- Type exports ----------------------------------------------------------
export type User = typeof user.$inferSelect;
export type Organization = typeof organization.$inferSelect;
export type OrganizationMembership = typeof organizationMembership.$inferSelect;
export type Workspace = typeof workspace.$inferSelect;
export type OnboardingState = typeof onboardingState.$inferSelect;
export type Branch = typeof branch.$inferSelect;
export type BusinessSettings = typeof businessSettings.$inferSelect;
export type EtimsConfiguration = typeof etimsConfiguration.$inferSelect;
export type EtimsSubmission = typeof etimsSubmission.$inferSelect;
export type EtimsCreditNote = typeof etimsCreditNote.$inferSelect;
export type Category = typeof category.$inferSelect;
export type Product = typeof product.$inferSelect;
export type ProductPackage = typeof productPackage.$inferSelect;
export type Customer = typeof customer.$inferSelect;
export type Sale = typeof sale.$inferSelect;
export type SaleItem = typeof saleItem.$inferSelect;
export type Expense = typeof expense.$inferSelect;
export type Supplier = typeof supplier.$inferSelect;
export type Purchase = typeof purchase.$inferSelect;
export type PurchaseItem = typeof purchaseItem.$inferSelect;
export type StockIntake = typeof stockIntake.$inferSelect;
export type StockIntakeItem = typeof stockIntakeItem.$inferSelect;
export type StockMovement = typeof stockMovement.$inferSelect;
export type InventoryBalance = typeof inventoryBalance.$inferSelect;
export type InventoryCostLayer = typeof inventoryCostLayer.$inferSelect;
export type InventoryLot = typeof inventoryLot.$inferSelect;
export type PharmacyConfiguration = typeof pharmacyConfiguration.$inferSelect;
export type PharmacyProduct = typeof pharmacyProduct.$inferSelect;
export type SaleItemLotAllocation = typeof saleItemLotAllocation.$inferSelect;
export type PharmacySaleRecord = typeof pharmacySaleRecord.$inferSelect;
export type RestrictedItemAudit = typeof restrictedItemAudit.$inferSelect;
export type PharmacyReturnDisposition =
  typeof pharmacyReturnDisposition.$inferSelect;
export type InventorySerial = typeof inventorySerial.$inferSelect;
export type ProductPackaging = typeof productPackaging.$inferSelect;
export type SupplierProduct = typeof supplierProduct.$inferSelect;
export type SalesReturn = typeof salesReturn.$inferSelect;
export type SalePayment = typeof salePayment.$inferSelect;
export type CreditSale = typeof creditSale.$inferSelect;
export type CreditPayment = typeof creditPayment.$inferSelect;
export type StockAdjustment = typeof stockAdjustment.$inferSelect;
export type StockAdjustmentItem = typeof stockAdjustmentItem.$inferSelect;
export type CustomerCreditLimit = typeof customerCreditLimit.$inferSelect;
export type CashierShift = typeof cashierShift.$inferSelect;
export type InventoryLoss = typeof inventoryLoss.$inferSelect;
export type PosSession = typeof posSession.$inferSelect;
export type PosPinCredential = typeof posPinCredential.$inferSelect;
export type PosTerminal = typeof posTerminal.$inferSelect;
export type PosAuthSession = typeof posAuthSession.$inferSelect;
export type OfflineSaleSync = typeof offlineSaleSync.$inferSelect;
export type SuspendedSale = typeof suspendedSale.$inferSelect;
export type Employee = typeof employee.$inferSelect;
export type Shift = typeof shift.$inferSelect;
export type ShiftAssignment = typeof shiftAssignment.$inferSelect;
export type EmployeeCommission = typeof employeeCommission.$inferSelect;
export type Invoice = typeof invoice.$inferSelect;
export type InvoiceItem = typeof invoiceItem.$inferSelect;
export type Quotation = typeof quotation.$inferSelect;
export type QuotationItem = typeof quotationItem.$inferSelect;
export type InventoryTransfer = typeof inventoryTransfer.$inferSelect;
export type InventoryTransferItem = typeof inventoryTransferItem.$inferSelect;
export type Task = typeof task.$inferSelect;
export type PerformanceGoal = typeof performanceGoal.$inferSelect;
export type FinancialAccount = typeof financialAccount.$inferSelect;
export type ExternalFinancialTransaction = typeof externalFinancialTransaction.$inferSelect;
export type FinanceApproval = typeof financeApproval.$inferSelect;

