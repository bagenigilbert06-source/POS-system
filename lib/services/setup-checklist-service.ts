import { and, count, eq, gt } from 'drizzle-orm'
import { db } from '@/lib/db'
import { branch, businessSettings, customer, employee, product, sale, supplier } from '@/lib/db/schema'

export interface SetupChecklistItem {
  id: string
  title: string
  description: string
  href: string
  completed: boolean
}

export async function getSetupChecklist(organizationId: string, enabledModules: string[]) {
  const [[products], [stock], [customers], [sales], [employees], [branches], [suppliers], [settings]] = await Promise.all([
    db.select({ value: count() }).from(product).where(eq(product.orgId, organizationId)),
    db.select({ value: count() }).from(product).where(and(eq(product.orgId, organizationId), gt(product.stock, 0))),
    db.select({ value: count() }).from(customer).where(eq(customer.orgId, organizationId)),
    db.select({ value: count() }).from(sale).where(eq(sale.orgId, organizationId)),
    db.select({ value: count() }).from(employee).where(eq(employee.orgId, organizationId)),
    db.select({ value: count() }).from(branch).where(eq(branch.organizationId, organizationId)),
    db.select({ value: count() }).from(supplier).where(eq(supplier.orgId, organizationId)),
    db.select().from(businessSettings).where(eq(businessSettings.organizationId, organizationId)).limit(1),
  ])
  const paymentMethods = Array.isArray(settings?.paymentMethods) ? settings.paymentMethods : []
  const operations = (settings?.operations ?? {}) as Record<string, unknown>
  const hasProducts = enabledModules.includes('products')
  const hasInventory = enabledModules.includes('inventory')
  const hasCustomers = enabledModules.includes('customers')
  const hasTeam = operations.hasEmployees === true
  const hasMultipleLocations = operations.multipleLocations === true
  const usesSuppliers = operations.usesSuppliers === true
  const issuesReceipts = operations.issuesReceipts === true
  const saleHref = enabledModules.includes('pos') ? '/dashboard/pos' : '/dashboard/sales'
  const items: SetupChecklistItem[] = [
    ...(hasProducts ? [{ id: 'catalog', title: 'Add your first product', description: 'Create the first product your business sells.', href: '/dashboard/products', completed: products.value > 0 }] : []),
    ...(hasInventory ? [{ id: 'opening-stock', title: 'Add opening inventory', description: 'Record the stock already available at your main location.', href: '/dashboard/inventory', completed: stock.value > 0 }] : []),
    ...(hasMultipleLocations ? [{ id: 'locations', title: 'Add another location', description: 'Create the next branch before trading from it.', href: '/dashboard/settings', completed: branches.value > 1 }] : []),
    ...(usesSuppliers ? [{ id: 'suppliers', title: 'Add a supplier', description: 'Create the first supplier record for purchasing.', href: '/dashboard/purchases', completed: suppliers.value > 0 }] : []),
    ...(hasTeam ? [{ id: 'team', title: 'Add an employee', description: 'Add a team member and review their access.', href: '/dashboard/staff', completed: employees.value > 0 }] : []),
    ...(hasCustomers ? [{ id: 'customers', title: 'Add a customer', description: 'Create a customer record when one is needed.', href: '/dashboard/customers', completed: customers.value > 0 }] : []),
    ...(issuesReceipts ? [{ id: 'receipt', title: 'Confirm receipt details', description: 'Review the name, phone and footer shown on receipts.', href: '/dashboard/settings', completed: Boolean(settings?.receiptBusinessName && settings?.receiptPhone) }] : []),
    { id: 'first-sale', title: 'Record the first sale', description: 'Use your configured sales flow for a real transaction.', href: saleHref, completed: sales.value > 0 },
  ]
  return { items, dismissed: settings?.checklistDismissed ?? false }
}
