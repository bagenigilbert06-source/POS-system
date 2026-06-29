/**
 * Validation Utilities
 * Centralized validation functions
 */

import { z } from 'zod';

/**
 * Email validation
 */
export const emailSchema = z.string().email('Invalid email address');

export function isValidEmail(email: string): boolean {
  try {
    emailSchema.parse(email);
    return true;
  } catch {
    return false;
  }
}

/**
 * Password validation
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export function isValidPassword(password: string): boolean {
  try {
    passwordSchema.parse(password);
    return true;
  } catch {
    return false;
  }
}

/**
 * Phone number validation
 */
export function isValidPhoneNumber(phone: string): boolean {
  const phoneRegex = /^(\+\d{1,3}[- ]?)?\d{10,}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

/**
 * SKU validation
 */
export function isValidSku(sku: string): boolean {
  return sku.length >= 3 && sku.length <= 50;
}

/**
 * Barcode validation
 */
export function isValidBarcode(barcode: string): boolean {
  // Basic validation - 8-14 digits for EAN/UPC
  return /^\d{8,14}$/.test(barcode);
}

/**
 * Currency amount validation
 */
export function isValidCurrencyAmount(amount: string | number): boolean {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return !isNaN(num) && num >= 0 && num <= 999999999.99;
}

/**
 * Quantity validation
 */
export function isValidQuantity(quantity: string | number): boolean {
  const num = typeof quantity === 'string' ? parseInt(quantity, 10) : quantity;
  return Number.isInteger(num) && num > 0 && num <= 999999;
}

/**
 * Discount percentage validation
 */
export function isValidDiscountPercentage(discount: string | number): boolean {
  const num = typeof discount === 'string' ? parseFloat(discount) : discount;
  return !isNaN(num) && num >= 0 && num <= 100;
}

/**
 * URL validation
 */
export const urlSchema = z.string().url('Invalid URL');

export function isValidUrl(url: string): boolean {
  try {
    urlSchema.parse(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Slug validation
 */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

/**
 * Date range validation
 */
export function isValidDateRange(startDate: Date, endDate: Date): boolean {
  return startDate <= endDate;
}

/**
 * Table number validation
 */
export function isValidTableNumber(tableNumber: number): boolean {
  return Number.isInteger(tableNumber) && tableNumber > 0 && tableNumber <= 1000;
}

/**
 * Capacity validation (for tables, rooms, etc.)
 */
export function isValidCapacity(capacity: number): boolean {
  return Number.isInteger(capacity) && capacity > 0 && capacity <= 500;
}

/**
 * Prescription number validation
 */
export function isValidPrescriptionNumber(prescNo: string): boolean {
  return prescNo.length >= 5 && prescNo.length <= 50;
}

/**
 * Batch number validation
 */
export function isValidBatchNumber(batchNo: string): boolean {
  return batchNo.length >= 3 && batchNo.length <= 50;
}

/**
 * Generic string length validation
 */
export function isValidStringLength(str: string, min: number, max: number): boolean {
  return str.length >= min && str.length <= max;
}

/**
 * Compound validation object
 */
export const validationSchemas = {
  organization: z.object({
    name: z.string().min(1, 'Organization name is required').max(255),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug format'),
    businessType: z.enum(['retail', 'restaurant', 'pharmacy']),
    currency: z.string().length(3),
    timezone: z.string(),
  }),

  product: z.object({
    name: z.string().min(1).max(255),
    sku: z.string().min(3).max(50).optional(),
    barcode: z.string().optional(),
    description: z.string().max(1000).optional(),
    buyingPrice: z.number().min(0),
    sellingPrice: z.number().min(0),
    minStock: z.number().int().min(0),
    unit: z.string(),
  }),

  customer: z.object({
    name: z.string().min(1).max(255),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    address: z.string().optional(),
  }),

  sale: z.object({
    receiptNo: z.string().min(1),
    customerId: z.string().optional(),
    subtotal: z.number().min(0),
    taxAmount: z.number().min(0),
    discountAmount: z.number().min(0),
    total: z.number().min(0),
    paymentMethod: z.enum(['cash', 'card', 'mpesa', 'check', 'credit']),
  }),

  table: z.object({
    tableNumber: z.number().int().min(1).max(1000),
    capacity: z.number().int().min(1).max(500),
  }),

  prescription: z.object({
    prescriptionNo: z.string().min(5).max(50),
    doctorName: z.string().optional(),
  }),
};

export type ValidationSchemas = typeof validationSchemas;
