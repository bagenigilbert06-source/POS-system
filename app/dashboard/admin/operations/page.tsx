import type { Metadata } from 'next';
import { eq } from 'drizzle-orm';
import { Banknote, MonitorCheck, ShieldCheck } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { VariancePolicy } from '@/components/operations/variance-policy';
import { requireDashboardPermission } from '@/lib/auth/dashboard-access';
import { db } from '@/lib/db';
import { businessSettings, organization } from '@/lib/db/schema';
import { PermissionEnum } from '@/lib/types/permissions';

export const metadata: Metadata = { title: 'POS & cash management | Pesaby' };

export default async function PosCashManagementPage() {
  const authorization = await requireDashboardPermission(
    PermissionEnum.ADMIN_ACCESS
  );
  const [[settings], [record]] = await Promise.all([
    db
      .select({ tolerance: businessSettings.cashVarianceTolerance })
      .from(businessSettings)
      .where(eq(businessSettings.organizationId, authorization.organizationId))
      .limit(1),
    db
      .select({ currency: organization.currency })
      .from(organization)
      .where(eq(organization.id, authorization.organizationId))
      .limit(1),
  ]);
  return (
    <div className="space-y-5 pb-8">
      <AdminPageHeader
        title="POS & cash management"
        description="Configure organization-wide register and cash-control rules. Daily shift review remains in Operations."
      />
      <section className="grid gap-3 sm:grid-cols-3">
        <Info
          icon={MonitorCheck}
          title="Shift ownership"
          detail="Cashiers open, count, and close their shifts from Point of Sale."
        />
        <Info
          icon={Banknote}
          title="Variance control"
          detail="Managers review exceptions in Operations; admins set the policy here."
        />
        <Info
          icon={ShieldCheck}
          title="Audit protected"
          detail="Policy changes and reconciliations are recorded in the audit trail."
        />
      </section>
      <VariancePolicy
        initialTolerance={Number(settings?.tolerance ?? 0)}
        currency={record?.currency || 'KES'}
      />
    </div>
  );
}

function Info({
  icon: Icon,
  title,
  detail,
}: {
  icon: typeof Banknote;
  title: string;
  detail: string;
}) {
  return (
    <article className="app-panel p-4">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--dashboard-accent-soft)] text-[var(--dashboard-accent)]">
        <Icon className="h-4 w-4" />
      </span>
      <h2 className="mt-3 text-sm font-bold">{title}</h2>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
    </article>
  );
}
