import type { Metadata } from 'next';
import { PackagePlus } from 'lucide-react';
import {
  getStockIntakePageData,
  getStockIntakeSummary,
} from '@/app/actions/stock-intake';
import { DashboardPageHeading } from '@/components/dashboard/page-heading';
import { StockIntakeManager } from '@/components/inventory/stock-intake-manager';
import { getAuthorizationContext } from '@/lib/auth/authorization';
import { requireWorkspaceModule } from '@/lib/onboarding/require-module';
import { PermissionEnum } from '@/lib/types/permissions';
import { formatCurrency, formatNumber } from '@/lib/utils/format';
import { isCafeBusiness } from '@/lib/hospitality/rules';

export const metadata: Metadata = { title: 'Stock Intake | Pesaby' };
export const dynamic = 'force-dynamic';

export default async function StockIntakePage() {
  const [authorization, { organization, config }, data, summary] =
    await Promise.all([
      getAuthorizationContext(),
      requireWorkspaceModule('inventory'),
      getStockIntakePageData(),
      getStockIntakeSummary(),
    ]);
  const currency = organization.currency || 'KES';
  const cafe = isCafeBusiness(config.businessType, config.businessCategory);
  return (
    <div className="mx-auto w-full max-w-[1480px] space-y-5 pb-8">
      <DashboardPageHeading
        theme="adaptive"
        icon={PackagePlus}
        eyebrow={cafe ? 'Café ingredients & supplies' : 'Inventory control'}
        title={cafe ? 'Ingredient Intake' : 'Stock Intake'}
        description={
          cafe
            ? 'Receive ingredients, packaged drinks and café supplies into their base inventory units.'
            : 'Record newly received stock and update store inventory.'
        }
      />
      <section className="grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Units received today', value: formatNumber(summary.units) },
          { label: 'Intakes today', value: formatNumber(summary.intakes) },
          {
            label: 'Value received today',
            value: formatCurrency(summary.value, currency),
          },
        ].map((metric) => (
          <article
            key={metric.label}
            className="rounded-xl border bg-card px-5 py-4 shadow-sm"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {metric.label}
            </p>
            <p className="mt-2 text-2xl font-bold tabular-nums">
              {metric.value}
            </p>
          </article>
        ))}
      </section>
      <StockIntakeManager
        {...data}
        currency={currency}
        cafeMode={cafe}
        canReceive={authorization.permissions.includes(
          PermissionEnum.INVENTORY_RECEIVE
        )}
      />
    </div>
  );
}
