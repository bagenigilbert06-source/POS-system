import { and, eq, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { customer, product, productPackage, sale, saleItem } from '@/lib/db/schema'
import { EtimsValidationError, type EtimsConfigurationSnapshot, type EtimsInvoice, type EtimsInvoiceLine } from './types'

const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100

export async function buildEtimsInvoice(saleId: string, configuration: EtimsConfigurationSnapshot): Promise<EtimsInvoice> {
  const [record] = await db.select().from(sale).where(and(
    eq(sale.id, saleId),
    eq(sale.orgId, configuration.organizationId),
    eq(sale.branchId, configuration.branchId)
  )).limit(1)
  if (!record) throw new EtimsValidationError('Sale was not found in the configured branch', 'SALE_NOT_FOUND')
  if (!configuration.businessKraPin) throw new EtimsValidationError('Business KRA PIN is missing', 'BUSINESS_PIN_MISSING')
  if (!configuration.externalBranchId) throw new EtimsValidationError('eTIMS branch identifier is missing', 'BRANCH_MAPPING_MISSING')

  const items = await db.select().from(saleItem).where(and(eq(saleItem.saleId, record.id), eq(saleItem.orgId, record.orgId)))
  if (!items.length) throw new EtimsValidationError('Sale has no invoice lines', 'EMPTY_INVOICE')
  const products = await db.select({
    id: product.id,
    itemCode: product.etimsItemCode,
    unitCode: product.etimsUnitCode,
    taxCategory: product.etimsTaxCategory,
    taxRate: product.etimsTaxRate,
    vatClassification: product.etimsVatClassification,
  }).from(product).where(and(eq(product.orgId, record.orgId), inArray(product.id, items.map((item) => item.productId))))
  const mappings = new Map(products.map((item) => [item.id, item]))
  const packageIds = items.map((item) => item.packageId).filter((value): value is string => Boolean(value))
  const packages = packageIds.length ? await db.select({ id: productPackage.id, itemCode: productPackage.etimsItemCode, unitCode: productPackage.etimsUnitCode }).from(productPackage).where(and(eq(productPackage.organizationId, record.orgId), inArray(productPackage.id, packageIds))) : []
  const packageMappings = new Map(packages.map((item) => [item.id, item]))
  const missing = items.filter((item) => {
    const mapping = mappings.get(item.productId)
    const packageMapping = item.packageId ? packageMappings.get(item.packageId) : null
    return !(packageMapping?.itemCode ?? mapping?.itemCode) || !(packageMapping?.unitCode ?? mapping?.unitCode) || !mapping?.taxCategory || mapping.taxRate == null
  })
  if (missing.length) throw new EtimsValidationError(
    `Missing eTIMS tax mapping for: ${missing.map((item) => item.productName).join(', ')}`,
    'PRODUCT_TAX_MAPPING_MISSING'
  )

  const subtotal = Number(record.subtotal)
  const discount = Number(record.discountAmount)
  const tax = Number(record.taxAmount)
  const totalBeforeRounding = money(Number(record.total) - Number(record.roundingAmount))
  const pricesIncludeTax = tax > 0 && Math.abs(totalBeforeRounding + discount - subtotal) <= 0.02
  let allocatedDiscount = 0
  let allocatedTax = 0
  const lines: EtimsInvoiceLine[] = items.map((item, index) => {
    const grossAmount = Number(item.totalPrice)
    const last = index === items.length - 1
    const lineDiscount = last ? money(discount - allocatedDiscount) : money(subtotal ? discount * grossAmount / subtotal : 0)
    const lineTax = last ? money(tax - allocatedTax) : money(subtotal ? tax * grossAmount / subtotal : 0)
    allocatedDiscount = money(allocatedDiscount + lineDiscount)
    allocatedTax = money(allocatedTax + lineTax)
    const mapping = mappings.get(item.productId)!
    const packageMapping = item.packageId ? packageMappings.get(item.packageId) : null
    return {
      lineNumber: index + 1,
      productId: item.productId,
      itemCode: (packageMapping?.itemCode ?? mapping.itemCode)!,
      name: item.productName,
      unitCode: (packageMapping?.unitCode ?? mapping.unitCode)!,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      grossAmount: money(grossAmount),
      discountAmount: lineDiscount,
      taxableAmount: pricesIncludeTax ? money(grossAmount - lineDiscount - lineTax) : money(grossAmount - lineDiscount),
      taxAmount: lineTax,
      totalAmount: pricesIncludeTax ? money(grossAmount - lineDiscount) : money(grossAmount - lineDiscount + lineTax),
      taxCategory: mapping.taxCategory!,
      taxRate: Number(mapping.taxRate),
      vatClassification: mapping.vatClassification,
    }
  })

  const [buyer] = record.customerId
    ? await db.select().from(customer).where(and(eq(customer.id, record.customerId), eq(customer.orgId, record.orgId))).limit(1)
    : []
  return {
    idempotencyKey: `etims:invoice:${record.orgId}:${record.id}`,
    saleId: record.id,
    receiptNumber: record.receiptNo,
    issuedAt: record.createdAt.toISOString(),
    currency: 'KES',
    business: { kraPin: configuration.businessKraPin, branchId: configuration.externalBranchId, deviceId: configuration.deviceId },
    customer: {
      name: buyer?.name ?? null,
      kraPin: buyer?.kraPin ?? null,
      phone: buyer?.phone ?? null,
      email: buyer?.email ?? null,
      customerType: buyer?.customerType ?? null,
      vatRegistered: buyer?.vatRegistered ?? false,
    },
    paymentMethod: record.paymentMethod,
    subtotal,
    discountAmount: discount,
    taxAmount: tax,
    roundingAmount: Number(record.roundingAmount),
    totalAmount: Number(record.total),
    lines,
  }
}
