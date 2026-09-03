import type { Metadata } from 'next';
import { Trash2 } from 'lucide-react';
import { getCafeWastageData } from '@/app/actions/cafe';
import { WastageManager } from '@/components/cafe/wastage-manager';
import { DashboardPageHeading } from '@/components/dashboard/page-heading';
import { getAuthorizationContext } from '@/lib/auth/authorization';
import { PermissionEnum } from '@/lib/types/permissions';

export const metadata: Metadata = { title: 'Café Wastage | Pesaby' };
export const dynamic = 'force-dynamic';

export default async function CafeWastagePage() {
  const [authorization, data] = await Promise.all([
    getAuthorizationContext(),
    getCafeWastageData(),
  ]);
  return (
    <div className="mx-auto w-full max-w-[1480px] space-y-5 pb-8">
      <DashboardPageHeading
        theme="adaptive"
        icon={Trash2}
        eyebrow="Inventory control"
        title="Wastage"
        description="Record spoilage, expiry, spills and preparation waste through the shared stock ledger."
      />
      {!data.schemaReady && (
        <div
          role="alert"
          className="rounded-xl border border-amber-300 bg-amber-50/60 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-200"
        >
          <p className="font-semibold">Café database setup is incomplete</p>
          <p className="mt-1 text-xs">
            Apply database migrations 0058 and 0059 to enable wastage records.
          </p>
        </div>
      )}
      <WastageManager
        initialData={data}
        canRecord={
          data.schemaReady &&
          authorization.permissions.includes(PermissionEnum.INVENTORY_ADJUST)
        }
      />
    </div>
  );
}
