import type { Metadata } from 'next';
import { CircleDollarSign, PackageCheck, Truck, Users } from 'lucide-react';
import { getProcurementData } from '@/app/actions/purchases';
import { getPurchaseLifecycleData } from '@/app/actions/inventory-lifecycle';
import { DashboardPageHeading } from '@/components/dashboard/page-heading';
import { InventoryLifecycleManager } from '@/components/inventory/inventory-lifecycle-manager';
import { ProcurementManager } from '@/components/purchases/procurement-manager';
import { requireWorkspaceModule } from '@/lib/onboarding/require-module';
import { formatCurrency } from '@/lib/utils';
import { requireDashboardPermission } from '@/lib/auth/dashboard-access';
import { PermissionEnum } from '@/lib/types/permissions';

export const metadata: Metadata = { title: 'Purchases & suppliers | Pesaby' };

export default async function PurchasesPage({
  searchParams,
}: {
  searchParams: Promise<{ productId?: string }>;
}) {
  const authorization = await requireDashboardPermission(
    PermissionEnum.PURCHASE_VIEW
  );
  const { productId } = await searchParams;
  const { organization } = await requireWorkspaceModule('purchases');
  const [data, lifecycle] = await Promise.all([
    getProcurementData(),
    getPurchaseLifecycleData(),
  ]);
  const currency = organization.currency || 'KES';
  const total = data.purchases.reduce(
    (sum, item) => sum + Number(item.total),
    0
  );
  const unpaid = data.purchases.reduce(
    (sum, item) =>
      sum + Math.max(0, Number(item.total) - Number(item.paidAmount)),
    0
  );
  const canManage = authorization.permissions.includes(
    PermissionEnum.PURCHASE_MANAGE
  );
  const metrics = [
    [
      'Suppliers',
      String(data.suppliers.filter((item) => item.status === 'active').length),
      'Active supplier records',
      Users,
    ],
    [
      'Purchases',
      String(data.purchases.length),
      'Received supplier invoices',
      PackageCheck,
    ],
    [
      'Purchased value',
      formatCurrency(total, currency),
      'All loaded receipts',
      CircleDollarSign,
    ],
    [
      'Outstanding',
      formatCurrency(unpaid, currency),
      'Actual unpaid balance',
      CircleDollarSign,
    ],
  ] as const;

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-5 pb-8">
      <DashboardPageHeading
        icon={Truck}
        title="Purchases & suppliers"
        description="Order and receive goods, update stock, pay suppliers, and retain a traceable history."
      />
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([label, value, detail, Icon]) => (
          <article key={label} className="metric-card">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium text-muted-foreground">
              {label}
            </p>
            <p className="mt-1 text-2xl font-extrabold tracking-tight">
              {value}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
          </article>
        ))}
      </section>
      <InventoryLifecycleManager
        products={data.products}
        suppliers={data.suppliers.filter((item) => item.status === 'active')}
        branches={lifecycle.branches}
        purchaseOrders={lifecycle.purchaseOrders}
        poItems={lifecycle.poItems}
        transfers={[]}
        transferItems={[]}
        currency={currency}
        canPurchase={canManage}
        canTransfer={false}
        showTransfers={false}
      />
      <ProcurementManager
        suppliers={data.suppliers}
        purchases={data.purchases}
        purchaseItems={data.purchaseItems}
        products={data.products}
        movements={data.movements}
        branches={data.branches}
        currency={currency}
        canManage={canManage}
        requestedProductId={productId}
      />
    </div>
  );
}
