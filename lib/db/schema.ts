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
  amountReceived: numeric('amountReceived', { precision: 12, scale: 2 }), // Cash only
  change: numeric('change', { precision: 12, scale: 2 }), // Cash only
  paymentMethod: text('paymentMethod').notNull().default('cash'),
  mpesaRef: text('mpesaRef'),
  status: text('status').notNull().default('completed'),
  idempotencyKey: text('idempotencyKey'), // For duplicate prevention
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

export const salePayment = pgTable('sale_payment', {
  id: text('id').primaryKey(),
  saleId: text('saleId').notNull().references(() => sale.id, { onDelete: 'cascade' }),
  method: text('method').notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  reference: text('reference'),
  status: text('status').notNull().default('completed'),
  userId: text('userId').notNull(),
  orgId: text('orgId').notNull(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
}, (table) => ({ organizationIndex: index('sale_payment_org_idx').on(table.orgId), saleIndex: index('sale_payment_sale_idx').on(table.saleId) }))

export const creditSale = pgTable('credit_sale', {
  id: text('id').primaryKey(),
  saleId: text('saleId').notNull().references(() => sale.id, { onDelete: 'cascade' }),
  customerId: text('customerId').notNull().references(() => customer.id, { onDelete: 'restrict' }),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  amountPaid: numeric('amountPaid', { precision: 12, scale: 2 }).notNull().default('0'),
  dueDate: timestamp('dueDate'),
  status: text('status').notNull().default('unpaid'),
  userId: text('userId').notNull(),
  orgId: text('orgId').notNull(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
}, (table) => ({ organizationIndex: index('credit_sale_org_idx').on(table.orgId), customerIndex: index('credit_sale_customer_idx').on(table.customerId) }))

export const creditPayment = pgTable('credit_payment', {
  id: text('id').primaryKey(),
  creditSaleId: text('creditSaleId').notNull().references(() => creditSale.id, { onDelete: 'cascade' }),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  method: text('method').notNull().default('cash'),
  reference: text('reference'),
  userId: text('userId').notNull(),
  orgId: text('orgId').notNull(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
}, (table) => ({ organizationIndex: index('credit_payment_org_idx').on(table.orgId) }))

export const stockAdjustment = pgTable('stock_adjustment', {
  id: text('id').primaryKey(),
  adjustmentNo: text('adjustmentNo').notNull(),
  type: text('type').notNull(),
  status: text('status').notNull().default('pending'),
  notes: text('notes'),
  approvedBy: text('approvedBy'),
  userId: text('userId').notNull(),
  orgId: text('orgId').notNull(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  approvedAt: timestamp('approvedAt'),
}, (table) => ({ organizationIndex: index('stock_adjustment_org_idx').on(table.orgId) }))

export const stockAdjustmentItem = pgTable('stock_adjustment_item', {
  id: text('id').primaryKey(),
  adjustmentId: text('adjustmentId').notNull().references(() => stockAdjustment.id, { onDelete: 'cascade' }),
  productId: text('productId').notNull(),
  productName: text('productName').notNull(),
  quantityBefore: integer('quantityBefore').notNull(),
  quantityAfter: integer('quantityAfter').notNull(),
  variance: integer('variance').notNull(),
  orgId: text('orgId').notNull(),
})

export const customerCreditLimit = pgTable('customer_credit_limit', {
  id: text('id').primaryKey(),
  customerId: text('customerId').notNull().references(() => customer.id, { onDelete: 'cascade' }),
  creditLimit: numeric('creditLimit', { precision: 12, scale: 2 }).notNull().default('0'),
  currentBalance: numeric('currentBalance', { precision: 12, scale: 2 }).notNull().default('0'),
  approvedBy: text('approvedBy').notNull(),
  status: text('status').notNull().default('active'),
  orgId: text('orgId').notNull(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
}, (table) => ({ organizationIndex: index('customer_credit_limit_org_idx').on(table.orgId), customerIndex: index('customer_credit_limit_customer_idx').on(table.customerId) }))

export const cashierShift = pgTable('cashier_shift', {
  id: text('id').primaryKey(),
  shiftNo: text('shiftNo').notNull(),
  cashierId: text('cashierId').notNull().references(() => user.id, { onDelete: 'restrict' }),
  sessionId: text('sessionId').notNull().references(() => posSession.id, { onDelete: 'cascade' }),
  startTime: timestamp('startTime').notNull(),
  endTime: timestamp('endTime'),
  openingCash: numeric('openingCash', { precision: 12, scale: 2 }).notNull(),
  closingCash: numeric('closingCash', { precision: 12, scale: 2 }),
  expectedCash: numeric('expectedCash', { precision: 12, scale: 2 }),
  variance: numeric('variance', { precision: 12, scale: 2 }),
  status: text('status').notNull().default('open'),
  orgId: text('orgId').notNull(),
}, (table) => ({ organizationIndex: index('cashier_shift_org_idx').on(table.orgId), cashierIndex: index('cashier_shift_cashier_idx').on(table.cashierId) }))

// --- Staff & Employee Management ---
export const employee = pgTable('employee', {
  id: text('id').primaryKey(),
  userId: text('userId').references(() => user.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  role: text('role').notNull().default('staff'), // manager, cashier, stock, supervisor
  department: text('department'),
  salary: numeric('salary', { precision: 12, scale: 2 }).notNull().default('0'),
  joinDate: timestamp('joinDate').notNull().defaultNow(),
  status: text('status').notNull().default('active'), // active, inactive, terminated
  orgId: text('orgId').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
}, (table) => ({ organizationIndex: index('employee_org_idx').on(table.orgId) }))

export const shift = pgTable('shift', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  startTime: text('startTime').notNull(), // HH:mm format
  endTime: text('endTime').notNull(),
  orgId: text('orgId').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
}, (table) => ({ organizationIndex: index('shift_org_idx').on(table.orgId) }))

export const shiftAssignment = pgTable('shift_assignment', {
  id: text('id').primaryKey(),
  employeeId: text('employeeId').notNull().references(() => employee.id, { onDelete: 'cascade' }),
  shiftId: text('shiftId').notNull().references(() => shift.id, { onDelete: 'cascade' }),
  date: timestamp('date').notNull(),
  orgId: text('orgId').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
}, (table) => ({ organizationIndex: index('shift_assignment_org_idx').on(table.orgId), employeeIndex: index('shift_assignment_employee_idx').on(table.employeeId) }))

export const employeeCommission = pgTable('employee_commission', {
  id: text('id').primaryKey(),
  employeeId: text('employeeId').notNull().references(() => employee.id, { onDelete: 'cascade' }),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  period: text('period').notNull(), // YYYY-MM format
  status: text('status').notNull().default('pending'), // pending, approved, paid
  orgId: text('orgId').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
}, (table) => ({ organizationIndex: index('employee_commission_org_idx').on(table.orgId) }))

// --- Financial Management ---
export const account = pgTable('gl_account', {
  id: text('id').primaryKey(),
  code: text('code').notNull(),
  name: text('name').notNull(),
  type: text('type').notNull(), // asset, liability, equity, revenue, expense
  category: text('category').notNull(),
  orgId: text('orgId').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
}, (table) => ({ organizationIndex: index('gl_account_org_idx').on(table.orgId), codeUnique: uniqueIndex('gl_account_org_code_unique').on(table.orgId, table.code) }))

export const generalLedger = pgTable('general_ledger', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull().references(() => account.id, { onDelete: 'restrict' }),
  debit: numeric('debit', { precision: 12, scale: 2 }).notNull().default('0'),
  credit: numeric('credit', { precision: 12, scale: 2 }).notNull().default('0'),
  description: text('description'),
  referenceType: text('referenceType'), // sale, purchase, expense, adjustment
  referenceId: text('referenceId'),
  date: timestamp('date').notNull().defaultNow(),
  orgId: text('orgId').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
}, (table) => ({ organizationIndex: index('general_ledger_org_idx').on(table.orgId), dateIndex: index('general_ledger_date_idx').on(table.date) }))

export const financialStatement = pgTable('financial_statement', {
  id: text('id').primaryKey(),
  type: text('type').notNull(), // income_statement, balance_sheet, cash_flow
  period: text('period').notNull(), // YYYY-MM-01 to YYYY-MM-31
  data: json('data').notNull(), // Statement data
  orgId: text('orgId').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
}, (table) => ({ organizationIndex: index('financial_statement_org_idx').on(table.orgId) }))

// --- Documents: Invoices, Quotes, Purchase Orders ---
export const invoice = pgTable('invoice', {
  id: text('id').primaryKey(),
  invoiceNo: text('invoiceNo').notNull(),
  customerId: text('customerId').references(() => customer.id, { onDelete: 'set null' }),
  subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull().default('0'),
  taxAmount: numeric('taxAmount', { precision: 12, scale: 2 }).notNull().default('0'),
  total: numeric('total', { precision: 12, scale: 2 }).notNull(),
  dueDate: timestamp('dueDate'),
  status: text('status').notNull().default('draft'), // draft, sent, paid, overdue, cancelled
  notes: text('notes'),
  orgId: text('orgId').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  userId: text('userId').notNull(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
}, (table) => ({ organizationIndex: index('invoice_org_idx').on(table.orgId) }))

export const invoiceItem = pgTable('invoice_item', {
  id: text('id').primaryKey(),
  invoiceId: text('invoiceId').notNull().references(() => invoice.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: numeric('unitPrice', { precision: 12, scale: 2 }).notNull(),
  total: numeric('total', { precision: 12, scale: 2 }).notNull(),
  orgId: text('orgId').notNull(),
})

export const quotation = pgTable('quotation', {
  id: text('id').primaryKey(),
  quoteNo: text('quoteNo').notNull(),
  customerId: text('customerId').references(() => customer.id, { onDelete: 'set null' }),
  subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull().default('0'),
  taxAmount: numeric('taxAmount', { precision: 12, scale: 2 }).notNull().default('0'),
  total: numeric('total', { precision: 12, scale: 2 }).notNull(),
  validUntil: timestamp('validUntil'),
  status: text('status').notNull().default('draft'), // draft, sent, accepted, rejected, expired
  notes: text('notes'),
  orgId: text('orgId').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  userId: text('userId').notNull(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
}, (table) => ({ organizationIndex: index('quotation_org_idx').on(table.orgId) }))

export const quotationItem = pgTable('quotation_item', {
  id: text('id').primaryKey(),
  quotationId: text('quotationId').notNull().references(() => quotation.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: numeric('unitPrice', { precision: 12, scale: 2 }).notNull(),
  total: numeric('total', { precision: 12, scale: 2 }).notNull(),
  orgId: text('orgId').notNull(),
})

export const purchaseOrder = pgTable('purchase_order', {
  id: text('id').primaryKey(),
  poNo: text('poNo').notNull(),
  supplierId: text('supplierId').notNull().references(() => supplier.id, { onDelete: 'restrict' }),
  subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull().default('0'),
  taxAmount: numeric('taxAmount', { precision: 12, scale: 2 }).notNull().default('0'),
  total: numeric('total', { precision: 12, scale: 2 }).notNull(),
  status: text('status').notNull().default('draft'), // draft, sent, confirmed, received, cancelled
  expectedDelivery: timestamp('expectedDelivery'),
  notes: text('notes'),
  orgId: text('orgId').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  userId: text('userId').notNull(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
}, (table) => ({ organizationIndex: index('purchase_order_org_idx').on(table.orgId) }))

export const purchaseOrderItem = pgTable('purchase_order_item', {
  id: text('id').primaryKey(),
  poId: text('poId').notNull().references(() => purchaseOrder.id, { onDelete: 'cascade' }),
  productId: text('productId'),
  description: text('description').notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: numeric('unitPrice', { precision: 12, scale: 2 }).notNull(),
  total: numeric('total', { precision: 12, scale: 2 }).notNull(),
  orgId: text('orgId').notNull(),
})

// --- Inventory & Process Management ---
export const inventoryTransfer = pgTable('inventory_transfer', {
  id: text('id').primaryKey(),
  transferNo: text('transferNo').notNull(),
  fromLocation: text('fromLocation').notNull(), // branch ID or location
  toLocation: text('toLocation').notNull(),
  status: text('status').notNull().default('pending'), // pending, in_transit, received
  userId: text('userId').notNull(),
  approvedBy: text('approvedBy'),
  orgId: text('orgId').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  approvedAt: timestamp('approvedAt'),
}, (table) => ({ organizationIndex: index('inventory_transfer_org_idx').on(table.orgId) }))

export const inventoryTransferItem = pgTable('inventory_transfer_item', {
  id: text('id').primaryKey(),
  transferId: text('transferId').notNull().references(() => inventoryTransfer.id, { onDelete: 'cascade' }),
  productId: text('productId').notNull(),
  productName: text('productName').notNull(),
  quantity: integer('quantity').notNull(),
  orgId: text('orgId').notNull(),
})

export const task = pgTable('task', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').notNull().default('pending'), // pending, in_progress, completed, cancelled
  priority: text('priority').notNull().default('medium'), // low, medium, high, urgent
  assigneeId: text('assigneeId').references(() => employee.id, { onDelete: 'set null' }),
  dueDate: timestamp('dueDate'),
  completedAt: timestamp('completedAt'),
  orgId: text('orgId').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  createdBy: text('createdBy').notNull(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
}, (table) => ({ organizationIndex: index('task_org_idx').on(table.orgId) }))

export const performanceGoal = pgTable('performance_goal', {
  id: text('id').primaryKey(),
  employeeId: text('employeeId').notNull().references(() => employee.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  target: numeric('target', { precision: 12, scale: 2 }).notNull(),
  achieved: numeric('achieved', { precision: 12, scale: 2 }).notNull().default('0'),
  period: text('period').notNull(), // YYYY-Q1, YYYY-Q2, YYYY-MM
  status: text('status').notNull().default('in_progress'), // in_progress, completed, missed
  orgId: text('orgId').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
}, (table) => ({ organizationIndex: index('performance_goal_org_idx').on(table.orgId) }))

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
export type SalePayment = typeof salePayment.$inferSelect
export type CreditSale = typeof creditSale.$inferSelect
export type CreditPayment = typeof creditPayment.$inferSelect
export type StockAdjustment = typeof stockAdjustment.$inferSelect
export type StockAdjustmentItem = typeof stockAdjustmentItem.$inferSelect
export type CustomerCreditLimit = typeof customerCreditLimit.$inferSelect
export type CashierShift = typeof cashierShift.$inferSelect
export type InventoryLoss = typeof inventoryLoss.$inferSelect
export type PosSession = typeof posSession.$inferSelect
export type Employee = typeof employee.$inferSelect
export type Shift = typeof shift.$inferSelect
export type ShiftAssignment = typeof shiftAssignment.$inferSelect
export type EmployeeCommission = typeof employeeCommission.$inferSelect
export type GLAccount = typeof account.$inferSelect
export type GeneralLedger = typeof generalLedger.$inferSelect
export type FinancialStatement = typeof financialStatement.$inferSelect
export type Invoice = typeof invoice.$inferSelect
export type InvoiceItem = typeof invoiceItem.$inferSelect
export type Quotation = typeof quotation.$inferSelect
export type QuotationItem = typeof quotationItem.$inferSelect
export type PurchaseOrder = typeof purchaseOrder.$inferSelect
export type PurchaseOrderItem = typeof purchaseOrderItem.$inferSelect
export type InventoryTransfer = typeof inventoryTransfer.$inferSelect
export type InventoryTransferItem = typeof inventoryTransferItem.$inferSelect
export type Task = typeof task.$inferSelect
export type PerformanceGoal = typeof performanceGoal.$inferSelect
