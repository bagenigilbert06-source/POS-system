import { and, count, eq, gt } from 'drizzle-orm'
import { db } from '@/lib/db'
import { businessSettings, customer, organizationMembership, product, sale } from '@/lib/db/schema'

export interface SetupChecklistItem {
  id: string
  title: string
  description: string
  href: string
  completed: boolean
}

export async function getSetupChecklist(organizationId: string, enabledModules: string[]) {
  const [[products], [stock], [customers], [sales], [members], [settings]] = await Promise.all([
    db.select({ value: count() }).from(product).where(eq(product.orgId, organizationId)),
    db.select({ value: count() }).from(product).where(and(eq(product.orgId, organizationId), gt(product.stock, 0))),
    db.select({ value: count() }).from(customer).where(eq(customer.orgId, organizationId)),
    db.select({ value: count() }).from(sale).where(eq(sale.orgId, organizationId)),
    db.select({ value: count() }).from(organizationMembership).where(eq(organizationMembership.organizationId, organizationId)),
    db.select().from(businessSettings).where(eq(businessSettings.organizationId, organizationId)).limit(1),
  ])
  const paymentMethods = Array.isArray(settings?.paymentMethods) ? settings.paymentMethods : []
  const items: SetupChecklistItem[] = [
    { id: 'catalog', title: 'Add your first product or service', description: 'Create the first item your business sells.', href: '/dashboard/products', completed: products.value > 0 },
    ...(enabledModules.includes('inventory') ? [{ id: 'opening-stock', title: 'Add opening inventory', description: 'Record the stock already available at your main branch.', href: '/dashboard/inventory', completed: stock.value > 0 }] : []),
    { id: 'payments', title: 'Confirm payment methods', description: 'Review the methods available for recording payments.', href: '/dashboard/settings', completed: paymentMethods.length > 0 },
    { id: 'team', title: 'Invite employees', description: 'Add staff only when you are ready.', href: '/dashboard/settings', completed: members.value > 1 },
    ...(enabledModules.includes('customers') ? [{ id: 'customers', title: 'Add a customer', description: 'Create a customer record when one is needed.', href: '/dashboard/customers', completed: customers.value > 0 }] : []),
    { id: 'receipt', title: 'Confirm receipt details', description: 'Review the name, phone and footer shown on receipts.', href: '/dashboard/settings', completed: Boolean(settings?.receiptBusinessName && settings?.receiptPhone) },
    { id: 'first-sale', title: 'Make the first sale', description: 'Use your configured sales flow for a real transaction.', href: '/dashboard/sales', completed: sales.value > 0 },
  ]
  return { items, dismissed: settings?.checklistDismissed ?? false }
}
