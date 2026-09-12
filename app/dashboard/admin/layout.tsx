import { requireDashboardPermission } from '@/lib/auth/dashboard-access';
import { PermissionEnum } from '@/lib/types/permissions';
import { db } from '@/lib/db';
import { businessSettings, organization } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { AdminControlShell } from '@/components/admin/admin-control-shell';
import { isCafeBusiness } from '@/lib/hospitality/rules';
import { cleanBusinessDisplayName } from '@/lib/business/display-name';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authorization = await requireDashboardPermission(
    PermissionEnum.ADMIN_ACCESS
  );
  const [record] = await db
    .select({
      name: organization.name,
      businessType: organization.businessType,
      businessCategory: organization.businessCategory,
      displayName: businessSettings.displayName,
      receiptBusinessName: businessSettings.receiptBusinessName,
    })
    .from(organization)
    .leftJoin(businessSettings, eq(businessSettings.organizationId, organization.id))
    .where(eq(organization.id, authorization.organizationId))
    .limit(1);
  return (
    <AdminControlShell organizationName={cleanBusinessDisplayName(record?.receiptBusinessName || record?.displayName, record?.name ?? 'Pesaby workspace')} cafeWorkspace={Boolean(record && isCafeBusiness(record.businessType, record.businessCategory))}>
      {children}
    </AdminControlShell>
  );
}
