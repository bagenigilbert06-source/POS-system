import { pgTable, text, timestamp, boolean, integer, numeric, json, uniqueIndex, index } from 'drizzle-orm/pg-core'

// --- Better Auth required tables -------------------------------------------
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  image: text('image'),
  status: text('status').notNull().default('active'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expiresAt').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
})

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
})

export const jwks = pgTable('jwks', {
  id: text('id').primaryKey(),
  publicKey: text('publicKey').notNull(),
  privateKey: text('privateKey').notNull(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  expiresAt: timestamp('expiresAt'),
})

// --- App tables ------------------------------------------------------------
export const organization = pgTable('organization', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  businessType: text('businessType').notNull().default('retail'),
  businessCategory: text('businessCategory').default('other_retail'), // Specific category within business type
  currency: text('currency').notNull().default('KES'),
  taxRate: numeric('taxRate', { precision: 5, scale: 2 }).notNull().default('16'),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  
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
})

// Organization membership - tracks user roles in organizations
export const organizationMembership = pgTable('organization_membership', {
  id: text('id').primaryKey(),
  organizationId: text('organizationId').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  role: text('role').notNull().default('member'), // owner, admin, manager, staff, member
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
}, (table) => ({
  organizationUserUnique: uniqueIndex('organization_membership_org_user_unique').on(table.organizationId, table.userId),
}))

// Workspace configuration
export const workspace = pgTable('workspace', {
  id: text('id').primaryKey(),
  organizationId: text('organizationId').notNull().unique().references(() => organization.id, { onDelete: 'cascade' }),
  config: json('config').notNull(), // { enabledModules: [...], settings: {...} }
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

/** A user-owned, resumable draft. No tenant id supplied by the browser is trusted. */
export const onboardingState = pgTable('onboarding_state', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull().unique().references(() => user.id, { onDelete: 'cascade' }),
  organizationId: text('organizationId').unique().references(() => organization.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('not_started'),
  currentStep: text('currentStep').notNull().default('welcome'),
  completedSteps: json('completedSteps').notNull().default([]),
  data: json('data').notNull().default({}),
  configurationVersion: integer('configurationVersion').notNull().default(1),
  startedAt: timestamp('startedAt').notNull().defaultNow(),
  lastSavedAt: timestamp('lastSavedAt').notNull().defaultNow(),
  completedAt: timestamp('completedAt'),
})

export const branch = pgTable('branch', {
  id: text('id').primaryKey(),
  organizationId: text('organizationId').notNull().references(() => organization.id, { onDelete: 'cascade' }),
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
}, (table) => ({
  organizationCodeUnique: uniqueIndex('branch_org_code_unique').on(table.organizationId, table.code),
  organizationIndex: index('branch_organization_idx').on(table.organizationId),
}))

export const branchMembership = pgTable('branch_membership', {
  id: text('id').primaryKey(),
  branchId: text('branchId').notNull().references(() => branch.id, { onDelete: 'cascade' }),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  role: text('role').notNull().default('staff'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
}, (table) => ({
  branchUserUnique: uniqueIndex('branch_membership_branch_user_unique').on(table.branchId, table.userId),
}))

export const businessSettings = pgTable('business_settings', {
  organizationId: text('organizationId').primaryKey().references(() => organization.id, { onDelete: 'cascade' }),
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
  taxRate: numeric('taxRate', { precision: 5, scale: 2 }).notNull().default('0'),
  taxIdentifier: text('taxIdentifier'),
  receiptBusinessName: text('receiptBusinessName'),
  receiptPhone: text('receiptPhone'),
  receiptAddress: text('receiptAddress'),
  receiptFooter: text('receiptFooter'),
  showTaxOnReceipt: boolean('showTaxOnReceipt').notNull().default(false),
  receiptNumbering: text('receiptNumbering').notNull().default('automatic'),
  checklistDismissed: boolean('checklistDismissed').notNull().default(false),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const auditEvent = pgTable('audit_event', {
  id: text('id').primaryKey(),
  organizationId: text('organizationId').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'restrict' }),
  action: text('action').notNull(),
  metadata: json('metadata').notNull().default({}),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
}, (table) => ({
  organizationIndex: index('audit_event_organization_idx').on(table.organizationId),
}))

export const category = pgTable('category', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  userId: text('userId').notNull(),
  orgId: text('orgId').notNull(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

export const product = pgTable('product', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  sku: text('sku'),
  barcode: text('barcode'),
  description: text('description'),
  categoryId: text('categoryId'),
  buyingPrice: numeric('buyingPrice', { precision: 12, scale: 2 }).notNull().default('0'),
  sellingPrice: numeric('sellingPrice', { precision: 12, scale: 2 }).notNull(),
  stock: integer('stock').notNull().default(0),
  minStock: integer('minStock').notNull().default(5),
  unit: text('unit').notNull().default('pcs'),
  imageUrl: text('imageUrl'),
  isActive: boolean('isActive').notNull().default(true),
  userId: text('userId').notNull(),
  orgId: text('orgId').notNull(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const customer = pgTable('customer', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  loyaltyPoints: integer('loyaltyPoints').notNull().default(0),
  userId: text('userId').notNull(),
  orgId: text('orgId').notNull(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const sale = pgTable('sale', {
  id: text('id').primaryKey(),
  receiptNo: text('receiptNo').notNull(),
  customerId: text('customerId'),
  subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull(),
  taxAmount: numeric('taxAmount', { precision: 12, scale: 2 }).notNull().default('0'),
  discountAmount: numeric('discountAmount', { precision: 12, scale: 2 }).notNull().default('0'),
  total: numeric('total', { precision: 12, scale: 2 }).notNull(),
  paymentMethod: text('paymentMethod').notNull().default('cash'),
  mpesaRef: text('mpesaRef'),
  status: text('status').notNull().default('completed'),
  userId: text('userId').notNull(),
  orgId: text('orgId').notNull(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

export const saleItem = pgTable('sale_item', {
  id: text('id').primaryKey(),
  saleId: text('saleId').notNull(),
  productId: text('productId').notNull(),
  productName: text('productName').notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: numeric('unitPrice', { precision: 12, scale: 2 }).notNull(),
  totalPrice: numeric('totalPrice', { precision: 12, scale: 2 }).notNull(),
  userId: text('userId').notNull(),
  orgId: text('orgId').notNull(),
})

export const expense = pgTable('expense', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  category: text('category').notNull().default('general'),
  notes: text('notes'),
  userId: text('userId').notNull(),
  orgId: text('orgId').notNull(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

export const supplier = pgTable('supplier', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone'),
  email: text('email'),
  taxId: text('taxId'),
  address: text('address'),
  status: text('status').notNull().default('active'),
  userId: text('userId').notNull(),
  orgId: text('orgId').notNull(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
}, (table) => ({ organizationIndex: index('supplier_org_idx').on(table.orgId) }))

export const purchase = pgTable('purchase', {
  id: text('id').primaryKey(),
  purchaseNo: text('purchaseNo').notNull(),
  supplierId: text('supplierId').references(() => supplier.id, { onDelete: 'restrict' }),
  supplierName: text('supplierName').notNull(),
  reference: text('reference'),
  subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull(),
  taxAmount: numeric('taxAmount', { precision: 12, scale: 2 }).notNull().default('0'),
  total: numeric('total', { precision: 12, scale: 2 }).notNull(),
  paymentStatus: text('paymentStatus').notNull().default('unpaid'),
  status: text('status').notNull().default('received'),
  notes: text('notes'),
  userId: text('userId').notNull(),
  orgId: text('orgId').notNull(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
}, (table) => ({ organizationIndex: index('purchase_org_idx').on(table.orgId) }))

export const purchaseItem = pgTable('purchase_item', {
  id: text('id').primaryKey(),
  purchaseId: text('purchaseId').notNull().references(() => purchase.id, { onDelete: 'cascade' }),
  productId: text('productId').notNull(),
  productName: text('productName').notNull(),
  quantity: integer('quantity').notNull(),
  unitCost: numeric('unitCost', { precision: 12, scale: 2 }).notNull(),
  totalCost: numeric('totalCost', { precision: 12, scale: 2 }).notNull(),
  orgId: text('orgId').notNull(),
})

export const stockMovement = pgTable('stock_movement', {
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
  userId: text('userId').notNull(),
  orgId: text('orgId').notNull(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
}, (table) => ({ organizationIndex: index('stock_movement_org_idx').on(table.orgId), productIndex: index('stock_movement_product_idx').on(table.productId) }))

export const salesReturn = pgTable('sales_return', {
  id: text('id').primaryKey(), returnNo: text('returnNo').notNull(), saleId: text('saleId').notNull(), receiptNo: text('receiptNo').notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(), refundMethod: text('refundMethod').notNull(), reason: text('reason').notNull(),
  status: text('status').notNull().default('completed'), userId: text('userId').notNull(), orgId: text('orgId').notNull(), createdAt: timestamp('createdAt').notNull().defaultNow(),
}, (table) => ({ organizationIndex: index('sales_return_org_idx').on(table.orgId) }))

export const salesReturnItem = pgTable('sales_return_item', {
  id: text('id').primaryKey(), returnId: text('returnId').notNull().references(() => salesReturn.id, { onDelete: 'cascade' }), productId: text('productId').notNull(),
  productName: text('productName').notNull(), quantity: integer('quantity').notNull(), unitPrice: numeric('unitPrice', { precision: 12, scale: 2 }).notNull(),
  total: numeric('total', { precision: 12, scale: 2 }).notNull(), disposition: text('disposition').notNull().default('restock'), orgId: text('orgId').notNull(),
})

export const inventoryLoss = pgTable('inventory_loss', {
  id: text('id').primaryKey(), lossNo: text('lossNo').notNull(), productId: text('productId').notNull(), productName: text('productName').notNull(),
  quantity: integer('quantity').notNull(), type: text('type').notNull(), unitCost: numeric('unitCost', { precision: 12, scale: 2 }).notNull(),
  totalCost: numeric('totalCost', { precision: 12, scale: 2 }).notNull(), reason: text('reason').notNull(), userId: text('userId').notNull(),
  orgId: text('orgId').notNull(), createdAt: timestamp('createdAt').notNull().defaultNow(),
}, (table) => ({ organizationIndex: index('inventory_loss_org_idx').on(table.orgId) }))

export const posSession = pgTable('pos_session', {
  id: text('id').primaryKey(), sessionNo: text('sessionNo').notNull(), status: text('status').notNull().default('open'),
  openingCash: numeric('openingCash', { precision: 12, scale: 2 }).notNull().default('0'), expectedCash: numeric('expectedCash', { precision: 12, scale: 2 }),
  closingCash: numeric('closingCash', { precision: 12, scale: 2 }), variance: numeric('variance', { precision: 12, scale: 2 }), notes: text('notes'),
  openedBy: text('openedBy').notNull(), closedBy: text('closedBy'), orgId: text('orgId').notNull(), openedAt: timestamp('openedAt').notNull().defaultNow(), closedAt: timestamp('closedAt'),
}, (table) => ({ organizationIndex: index('pos_session_org_idx').on(table.orgId) }))

export const cashMovement = pgTable('cash_movement', {
  id: text('id').primaryKey(), sessionId: text('sessionId').notNull().references(() => posSession.id, { onDelete: 'cascade' }), type: text('type').notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(), reason: text('reason').notNull(), userId: text('userId').notNull(), orgId: text('orgId').notNull(), createdAt: timestamp('createdAt').notNull().defaultNow(),
})

// --- Type exports ----------------------------------------------------------
export type User = typeof user.$inferSelect
export type Organization = typeof organization.$inferSelect
export type OrganizationMembership = typeof organizationMembership.$inferSelect
export type Workspace = typeof workspace.$inferSelect
export type OnboardingState = typeof onboardingState.$inferSelect
export type Branch = typeof branch.$inferSelect
export type BusinessSettings = typeof businessSettings.$inferSelect
export type Category = typeof category.$inferSelect
export type Product = typeof product.$inferSelect
export type Customer = typeof customer.$inferSelect
export type Sale = typeof sale.$inferSelect
export type SaleItem = typeof saleItem.$inferSelect
export type Expense = typeof expense.$inferSelect
export type Supplier = typeof supplier.$inferSelect
export type Purchase = typeof purchase.$inferSelect
export type PurchaseItem = typeof purchaseItem.$inferSelect
export type StockMovement = typeof stockMovement.$inferSelect
export type SalesReturn = typeof salesReturn.$inferSelect
export type InventoryLoss = typeof inventoryLoss.$inferSelect
export type PosSession = typeof posSession.$inferSelect
