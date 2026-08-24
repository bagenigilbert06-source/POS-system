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
  receiptNumbering: text('receiptNumbering').notNull().default('automatic'),
  checklistDismissed: boolean('checklistDismissed').notNull().default(false),
  cashVarianceTolerance: numeric('cashVarianceTolerance', { precision: 12, scale: 2 }).notNull().default('0'),
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
  expiryWarningDays: json('expiryWarningDays').notNull().default([90, 60, 30, 7]),
  prescriptionWorkflowEnabled: boolean('prescriptionWorkflowEnabled').notNull().default(true),
  restrictedItemWorkflowEnabled: boolean('restrictedItemWorkflowEnabled').notNull().default(true),
  returnedStockDefaultStatus: text('returnedStockDefaultStatus').notNull().default('quarantined'),
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
    invoiceSubmissionEnabled: boolean('invoiceSubmissionEnabled').notNull().default(true),
    automaticRetryEnabled: boolean('automaticRetryEnabled').notNull().default(true),
    maximumRetryAttempts: integer('maximumRetryAttempts').notNull().default(5),
    receiptDetailsEnabled: boolean('receiptDetailsEnabled').notNull().default(true),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({
    organizationBranchUnique: uniqueIndex('etims_configuration_org_branch_unique').on(
      table.organizationId,
      table.branchId
    ),
    organizationIndex: index('etims_configuration_org_idx').on(table.organizationId),
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
    prescriptionRequired: boolean('prescriptionRequired').notNull().default(false),
    restrictedItem: boolean('restrictedItem').notNull().default(false),
    notes: text('notes'),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({
    organizationIndex: index('pharmacy_product_org_idx').on(table.organizationId),
    organizationInternalCodeUnique: uniqueIndex('pharmacy_product_org_internal_code_unique').on(table.organizationId, table.internalCode),
  })
);

export const productPackage = pgTable(
  'product_package',
  {
    id: text('id').primaryKey(),
    organizationId: text('organizationId').notNull().references(() => organization.id, { onDelete: 'cascade' }),
    productId: text('productId').notNull().references(() => product.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    packageType: text('packageType').notNull(),
    barcode: text('barcode'),
    sellingPrice: numeric('sellingPrice', { precision: 12, scale: 2 }).notNull(),
    baseUnitQuantity: integer('baseUnitQuantity').notNull(),
    etimsItemCode: text('etimsItemCode'),
    etimsUnitCode: text('etimsUnitCode'),
    isActive: boolean('isActive').notNull().default(true),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({
    organizationBarcodeUnique: uniqueIndex('product_package_org_barcode_unique').on(table.organizationId, table.barcode),
    productNameUnique: uniqueIndex('product_package_product_name_unique').on(table.productId, table.name),
    productActiveIndex: index('product_package_product_active_idx').on(table.organizationId, table.productId, table.isActive),
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
    roundingAmount: numeric('roundingAmount', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),
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
    packageId: text('packageId').references(() => productPackage.id, { onDelete: 'restrict' }),
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
    retryIndex: index('etims_submission_retry_idx').on(table.status, table.nextRetryAt),
    organizationStatusCreatedIndex: index('etims_submission_org_status_created_idx').on(
      table.organizationId,
      table.status,
      table.createdAt
    ),
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
    poId: text('poId').references(() => purchaseOrder.id, {
      onDelete: 'set null',
    }),
    receiptId: text('receiptId'),
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
    receiptUnique: uniqueIndex('purchase_receipt_link_unique').on(
      table.receiptId
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
    organizationId: text('organizationId').notNull().references(() => organization.id, { onDelete: 'cascade' }),
    saleId: text('saleId').notNull().references(() => sale.id, { onDelete: 'restrict' }),
    saleItemId: text('saleItemId').notNull().references(() => saleItem.id, { onDelete: 'restrict' }),
    productId: text('productId').notNull().references(() => product.id, { onDelete: 'restrict' }),
    lotId: text('lotId').notNull().references(() => inventoryLot.id, { onDelete: 'restrict' }),
    lotNumber: text('lotNumber').notNull(),
    expiresAt: timestamp('expiresAt'),
    quantity: numeric('quantity', { precision: 16, scale: 3 }).notNull(),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
  },
  (table) => ({
    saleItemLotUnique: uniqueIndex('sale_item_lot_allocation_unique').on(table.saleItemId, table.lotId),
    organizationSaleIndex: index('sale_item_lot_allocation_org_sale_idx').on(table.organizationId, table.saleId),
    lotIndex: index('sale_item_lot_allocation_lot_idx').on(table.lotId),
  })
);

/** Commercial prescription reference attached to a sale. This deliberately
 * stores no diagnosis or dosage recommendation. */
export const pharmacySaleRecord = pgTable(
  'pharmacy_sale_record',
  {
    id: text('id').primaryKey(),
    organizationId: text('organizationId').notNull().references(() => organization.id, { onDelete: 'cascade' }),
    branchId: text('branchId').notNull().references(() => branch.id, { onDelete: 'restrict' }),
    saleId: text('saleId').notNull().references(() => sale.id, { onDelete: 'restrict' }),
    prescriptionReference: text('prescriptionReference'),
    prescriberReference: text('prescriberReference'),
    patientReference: text('patientReference'),
    prescriptionDocumentUrl: text('prescriptionDocumentUrl'),
    status: text('status').notNull().default('dispensed'),
    issuedAt: timestamp('issuedAt'),
    expiresAt: timestamp('expiresAt'),
    verifiedBy: text('verifiedBy').references(() => user.id, { onDelete: 'restrict' }),
    verifiedAt: timestamp('verifiedAt'),
    approvalReason: text('approvalReason'),
    notes: text('notes'),
    approvedBy: text('approvedBy').references(() => user.id, { onDelete: 'restrict' }),
    createdBy: text('createdBy').notNull().references(() => user.id, { onDelete: 'restrict' }),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({
    organizationSaleUnique: uniqueIndex('pharmacy_sale_record_org_sale_unique').on(table.organizationId, table.saleId),
    organizationReferenceIndex: index('pharmacy_sale_record_org_reference_idx').on(table.organizationId, table.prescriptionReference),
  })
);

/** Per-medicine prescription quantities. Sale items remain the immutable
 * commercial record; these rows hold the dispensing lifecycle. */
export const pharmacyPrescriptionItem = pgTable(
  'pharmacy_prescription_item',
  {
    id: text('id').primaryKey(),
    organizationId: text('organizationId').notNull().references(() => organization.id, { onDelete: 'cascade' }),
    prescriptionRecordId: text('prescriptionRecordId').notNull().references(() => pharmacySaleRecord.id, { onDelete: 'cascade' }),
    saleItemId: text('saleItemId').references(() => saleItem.id, { onDelete: 'restrict' }),
    productId: text('productId').notNull().references(() => product.id, { onDelete: 'restrict' }),
    prescribedQuantity: numeric('prescribedQuantity', { precision: 16, scale: 3 }).notNull(),
    dispensedQuantity: numeric('dispensedQuantity', { precision: 16, scale: 3 }).notNull(),
    repeatsAuthorized: integer('repeatsAuthorized').notNull().default(0),
    repeatsRemaining: integer('repeatsRemaining').notNull().default(0),
    directions: text('directions'),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({
    recordProductIndex: index('pharmacy_prescription_item_record_product_idx').on(table.prescriptionRecordId, table.productId),
    organizationIndex: index('pharmacy_prescription_item_org_idx').on(table.organizationId),
  })
);

/** A recall targets one concrete stock lot, which makes enforcement and sale
 * traceability deterministic across branches. */
export const pharmacyMedicineRecall = pgTable(
  'pharmacy_medicine_recall',
  {
    id: text('id').primaryKey(),
    organizationId: text('organizationId').notNull().references(() => organization.id, { onDelete: 'cascade' }),
    branchId: text('branchId').notNull().references(() => branch.id, { onDelete: 'restrict' }),
    productId: text('productId').notNull().references(() => product.id, { onDelete: 'restrict' }),
    lotId: text('lotId').notNull().references(() => inventoryLot.id, { onDelete: 'restrict' }),
    reference: text('reference').notNull(),
    reason: text('reason').notNull(),
    status: text('status').notNull().default('active'),
    initiatedBy: text('initiatedBy').notNull().references(() => user.id, { onDelete: 'restrict' }),
    resolvedBy: text('resolvedBy').references(() => user.id, { onDelete: 'restrict' }),
    initiatedAt: timestamp('initiatedAt').notNull().defaultNow(),
    resolvedAt: timestamp('resolvedAt'),
    resolutionNotes: text('resolutionNotes'),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({
    lotIndex: index('pharmacy_medicine_recall_lot_idx').on(table.organizationId, table.lotId),
    organizationStatusIndex: index('pharmacy_medicine_recall_org_status_idx').on(table.organizationId, table.status, table.createdAt),
  })
);

export const restrictedItemAudit = pgTable(
  'restricted_item_audit',
  {
    id: text('id').primaryKey(),
    organizationId: text('organizationId').notNull().references(() => organization.id, { onDelete: 'cascade' }),
    branchId: text('branchId').notNull().references(() => branch.id, { onDelete: 'restrict' }),
    saleId: text('saleId').notNull().references(() => sale.id, { onDelete: 'restrict' }),
    saleItemId: text('saleItemId').notNull().references(() => saleItem.id, { onDelete: 'restrict' }),
    productId: text('productId').notNull().references(() => product.id, { onDelete: 'restrict' }),
    lotId: text('lotId').references(() => inventoryLot.id, { onDelete: 'restrict' }),
    cashierId: text('cashierId').notNull().references(() => user.id, { onDelete: 'restrict' }),
    approvedBy: text('approvedBy').references(() => user.id, { onDelete: 'restrict' }),
    quantity: numeric('quantity', { precision: 16, scale: 3 }).notNull(),
    customerReference: text('customerReference'),
    reason: text('reason'),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
  },
  (table) => ({
    organizationCreatedIndex: index('restricted_item_audit_org_created_idx').on(table.organizationId, table.createdAt),
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
    organizationId: text('organizationId').notNull().references(() => organization.id, { onDelete: 'cascade' }),
    branchId: text('branchId').notNull().references(() => branch.id, { onDelete: 'restrict' }),
    returnId: text('returnId').notNull().references(() => salesReturn.id, { onDelete: 'restrict' }),
    returnItemId: text('returnItemId').notNull().references(() => salesReturnItem.id, { onDelete: 'restrict' }),
    originalSaleItemId: text('originalSaleItemId').notNull().references(() => saleItem.id, { onDelete: 'restrict' }),
    originalAllocationId: text('originalAllocationId').references(() => saleItemLotAllocation.id, { onDelete: 'restrict' }),
    productId: text('productId').notNull().references(() => product.id, { onDelete: 'restrict' }),
    originalLotId: text('originalLotId').references(() => inventoryLot.id, { onDelete: 'restrict' }),
    lotNumber: text('lotNumber'),
    quantity: numeric('quantity', { precision: 16, scale: 3 }).notNull(),
    status: text('status').notNull().default('quarantined'),
    supplierReturnReference: text('supplierReturnReference'),
    supplierReturnStatus: text('supplierReturnStatus'),
    supplierCreditNote: text('supplierCreditNote'),
    supplierResolvedBy: text('supplierResolvedBy').references(() => user.id, { onDelete: 'restrict' }),
    supplierResolvedAt: timestamp('supplierResolvedAt'),
    notes: text('notes'),
    createdBy: text('createdBy').notNull().references(() => user.id, { onDelete: 'restrict' }),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({
    organizationStatusIndex: index('pharmacy_return_disposition_org_status_idx').on(table.organizationId, table.status),
    returnIndex: index('pharmacy_return_disposition_return_idx').on(table.returnId),
    allocationIndex: index('pharmacy_return_disposition_allocation_idx').on(table.originalAllocationId),
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
    returnUnique: uniqueIndex('etims_credit_note_return_unique').on(table.returnId),
    idempotencyUnique: uniqueIndex('etims_credit_note_idempotency_unique').on(
      table.organizationId,
      table.idempotencyKey
    ),
    retryIndex: index('etims_credit_note_retry_idx').on(table.status, table.nextRetryAt),
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

export const cashMovement = pgTable('cash_movement', {
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
  branchId: text('branchId').references(() => branch.id, { onDelete: 'restrict' }),
  idempotencyKey: text('idempotencyKey'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
}, (table) => ({
  sessionIndex: index('cash_movement_session_idx').on(table.sessionId),
  idempotencyIndex: uniqueIndex('cash_movement_org_idempotency_idx').on(table.orgId, table.idempotencyKey),
}));

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
    userId: text('userId').notNull(),
    orgId: text('orgId').notNull(),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
  },
  (table) => ({
    organizationIndex: index('credit_payment_org_idx').on(table.orgId),
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

// --- Financial Management ---
export const glAccount = pgTable(
  'gl_account',
  {
    id: text('id').primaryKey(),
    code: text('code').notNull(),
    name: text('name').notNull(),
    type: text('type').notNull(), // asset, liability, equity, revenue, expense
    category: text('category').notNull(),
    orgId: text('orgId')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
  },
  (table) => ({
    organizationIndex: index('gl_account_org_idx').on(table.orgId),
    codeUnique: uniqueIndex('gl_account_org_code_unique').on(
      table.orgId,
      table.code
    ),
  })
);

export const generalLedger = pgTable(
  'general_ledger',
  {
    id: text('id').primaryKey(),
    accountId: text('accountId')
      .notNull()
      .references(() => glAccount.id, { onDelete: 'restrict' }),
    debit: numeric('debit', { precision: 12, scale: 2 }).notNull().default('0'),
    credit: numeric('credit', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),
    description: text('description'),
    referenceType: text('referenceType'), // sale, purchase, expense, adjustment
    referenceId: text('referenceId'),
    date: timestamp('date').notNull().defaultNow(),
    orgId: text('orgId')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
  },
  (table) => ({
    organizationIndex: index('general_ledger_org_idx').on(table.orgId),
    dateIndex: index('general_ledger_date_idx').on(table.date),
  })
);

export const financialStatement = pgTable(
  'financial_statement',
  {
    id: text('id').primaryKey(),
    type: text('type').notNull(), // income_statement, balance_sheet, cash_flow
    period: text('period').notNull(), // YYYY-MM-01 to YYYY-MM-31
    data: json('data').notNull(), // Statement data
    orgId: text('orgId')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
  },
  (table) => ({
    organizationIndex: index('financial_statement_org_idx').on(table.orgId),
  })
);

// --- Documents: Invoices, Quotes, Purchase Orders ---
export const invoice = pgTable(
  'invoice',
  {
    id: text('id').primaryKey(),
    invoiceNo: text('invoiceNo').notNull(),
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
    dueDate: timestamp('dueDate'),
    status: text('status').notNull().default('draft'), // draft, sent, paid, overdue, cancelled
    notes: text('notes'),
    orgId: text('orgId')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    userId: text('userId').notNull(),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({ organizationIndex: index('invoice_org_idx').on(table.orgId) })
);

export const invoiceItem = pgTable('invoice_item', {
  id: text('id').primaryKey(),
  invoiceId: text('invoiceId')
    .notNull()
    .references(() => invoice.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: numeric('unitPrice', { precision: 12, scale: 2 }).notNull(),
  total: numeric('total', { precision: 12, scale: 2 }).notNull(),
  orgId: text('orgId').notNull(),
});

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

export const purchaseOrder = pgTable(
  'purchase_order',
  {
    id: text('id').primaryKey(),
    poNo: text('poNo').notNull(),
    supplierId: text('supplierId')
      .notNull()
      .references(() => supplier.id, { onDelete: 'restrict' }),
    subtotal: numeric('subtotal', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),
    taxAmount: numeric('taxAmount', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),
    total: numeric('total', { precision: 12, scale: 2 }).notNull(),
    status: text('status').notNull().default('draft'), // draft, sent, confirmed, received, cancelled
    expectedDelivery: timestamp('expectedDelivery'),
    branchId: text('branchId').references(() => branch.id, {
      onDelete: 'restrict',
    }),
    supplierReference: text('supplierReference'),
    discountAmount: numeric('discountAmount', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),
    shippingAmount: numeric('shippingAmount', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),
    otherCosts: numeric('otherCosts', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),
    sentAt: timestamp('sentAt'),
    confirmedAt: timestamp('confirmedAt'),
    closedAt: timestamp('closedAt'),
    notes: text('notes'),
    orgId: text('orgId')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    userId: text('userId').notNull(),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({
    organizationIndex: index('purchase_order_org_idx').on(table.orgId),
    organizationNumberUnique: uniqueIndex(
      'purchase_order_org_number_unique'
    ).on(table.orgId, table.poNo),
  })
);

export const purchaseOrderItem = pgTable('purchase_order_item', {
  id: text('id').primaryKey(),
  poId: text('poId')
    .notNull()
    .references(() => purchaseOrder.id, { onDelete: 'cascade' }),
  productId: text('productId'),
  description: text('description').notNull(),
  quantity: integer('quantity').notNull(),
  receivedQuantity: numeric('receivedQuantity', { precision: 16, scale: 3 })
    .notNull()
    .default('0'),
  rejectedQuantity: numeric('rejectedQuantity', { precision: 16, scale: 3 })
    .notNull()
    .default('0'),
  packagingId: text('packagingId').references(() => productPackaging.id, {
    onDelete: 'set null',
  }),
  unitPrice: numeric('unitPrice', { precision: 12, scale: 2 }).notNull(),
  total: numeric('total', { precision: 12, scale: 2 }).notNull(),
  orgId: text('orgId').notNull(),
});

export const purchaseReceipt = pgTable(
  'purchase_receipt',
  {
    id: text('id').primaryKey(),
    receiptNo: text('receiptNo').notNull(),
    poId: text('poId')
      .notNull()
      .references(() => purchaseOrder.id, { onDelete: 'restrict' }),
    branchId: text('branchId')
      .notNull()
      .references(() => branch.id, { onDelete: 'restrict' }),
    supplierInvoice: text('supplierInvoice'),
    idempotencyKey: text('idempotencyKey').notNull(),
    status: text('status').notNull().default('received'),
    notes: text('notes'),
    receivedBy: text('receivedBy').notNull(),
    orgId: text('orgId')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
  },
  (table) => ({
    organizationReceiptUnique: uniqueIndex(
      'purchase_receipt_org_number_unique'
    ).on(table.orgId, table.receiptNo),
    organizationIdempotencyUnique: uniqueIndex(
      'purchase_receipt_org_idempotency_unique'
    ).on(table.orgId, table.idempotencyKey),
  })
);

export const purchaseReceiptItem = pgTable('purchase_receipt_item', {
  id: text('id').primaryKey(),
  receiptId: text('receiptId')
    .notNull()
    .references(() => purchaseReceipt.id, { onDelete: 'cascade' }),
  poItemId: text('poItemId')
    .notNull()
    .references(() => purchaseOrderItem.id, { onDelete: 'restrict' }),
  productId: text('productId')
    .notNull()
    .references(() => product.id, { onDelete: 'restrict' }),
  acceptedQuantity: numeric('acceptedQuantity', { precision: 16, scale: 3 })
    .notNull()
    .default('0'),
  rejectedQuantity: numeric('rejectedQuantity', { precision: 16, scale: 3 })
    .notNull()
    .default('0'),
  rejectionReason: text('rejectionReason'),
  baseQuantity: numeric('baseQuantity', { precision: 16, scale: 3 }).notNull(),
  unitCost: numeric('unitCost', { precision: 12, scale: 4 }).notNull(),
  lotNumber: text('lotNumber'),
  expiresAt: timestamp('expiresAt'),
  orgId: text('orgId')
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),
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
    organizationId: text('organizationId').notNull().references(() => organization.id, { onDelete: 'cascade' }),
    transferId: text('transferId').notNull().references(() => inventoryTransfer.id, { onDelete: 'cascade' }),
    transferItemId: text('transferItemId').notNull().references(() => inventoryTransferItem.id, { onDelete: 'cascade' }),
    productId: text('productId').notNull().references(() => product.id, { onDelete: 'restrict' }),
    sourceLotId: text('sourceLotId').notNull().references(() => inventoryLot.id, { onDelete: 'restrict' }),
    lotNumber: text('lotNumber').notNull(),
    barcode: text('barcode'),
    manufacturedAt: timestamp('manufacturedAt'),
    bestBeforeAt: timestamp('bestBeforeAt'),
    expiresAt: timestamp('expiresAt'),
    alertAt: timestamp('alertAt'),
    supplierId: text('supplierId').references(() => supplier.id, { onDelete: 'set null' }),
    unitCost: numeric('unitCost', { precision: 12, scale: 4 }).notNull().default('0'),
    dispatchedQuantity: numeric('dispatchedQuantity', { precision: 16, scale: 3 }).notNull(),
    receivedQuantity: numeric('receivedQuantity', { precision: 16, scale: 3 }).notNull().default('0'),
    rejectedQuantity: numeric('rejectedQuantity', { precision: 16, scale: 3 }).notNull().default('0'),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({
    transferItemIndex: index('inventory_transfer_lot_item_idx').on(table.transferItemId),
    organizationTransferIndex: index('inventory_transfer_lot_org_transfer_idx').on(table.organizationId, table.transferId),
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
export type StockMovement = typeof stockMovement.$inferSelect;
export type InventoryBalance = typeof inventoryBalance.$inferSelect;
export type InventoryCostLayer = typeof inventoryCostLayer.$inferSelect;
export type InventoryLot = typeof inventoryLot.$inferSelect;
export type PharmacyConfiguration = typeof pharmacyConfiguration.$inferSelect;
export type PharmacyProduct = typeof pharmacyProduct.$inferSelect;
export type SaleItemLotAllocation = typeof saleItemLotAllocation.$inferSelect;
export type PharmacySaleRecord = typeof pharmacySaleRecord.$inferSelect;
export type RestrictedItemAudit = typeof restrictedItemAudit.$inferSelect;
export type PharmacyReturnDisposition = typeof pharmacyReturnDisposition.$inferSelect;
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
export type GLAccount = typeof glAccount.$inferSelect;
export type GeneralLedger = typeof generalLedger.$inferSelect;
export type FinancialStatement = typeof financialStatement.$inferSelect;
export type Invoice = typeof invoice.$inferSelect;
export type InvoiceItem = typeof invoiceItem.$inferSelect;
export type Quotation = typeof quotation.$inferSelect;
export type QuotationItem = typeof quotationItem.$inferSelect;
export type PurchaseOrder = typeof purchaseOrder.$inferSelect;
export type PurchaseOrderItem = typeof purchaseOrderItem.$inferSelect;
export type PurchaseReceipt = typeof purchaseReceipt.$inferSelect;
export type PurchaseReceiptItem = typeof purchaseReceiptItem.$inferSelect;
export type InventoryTransfer = typeof inventoryTransfer.$inferSelect;
export type InventoryTransferItem = typeof inventoryTransferItem.$inferSelect;
export type Task = typeof task.$inferSelect;
export type PerformanceGoal = typeof performanceGoal.$inferSelect;
