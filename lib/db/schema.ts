import { pgTable, text, timestamp, boolean, integer, numeric } from 'drizzle-orm/pg-core'

// --- Better Auth required tables -------------------------------------------
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  image: text('image'),
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
  currency: text('currency').notNull().default('KES'),
  taxRate: numeric('taxRate', { precision: 5, scale: 2 }).notNull().default('16'),
  userId: text('userId').notNull(),
  
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

// --- Type exports ----------------------------------------------------------
export type User = typeof user.$inferSelect
export type Organization = typeof organization.$inferSelect
export type Category = typeof category.$inferSelect
export type Product = typeof product.$inferSelect
export type Customer = typeof customer.$inferSelect
export type Sale = typeof sale.$inferSelect
export type SaleItem = typeof saleItem.$inferSelect
export type Expense = typeof expense.$inferSelect
