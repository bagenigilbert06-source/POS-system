import { requireDashboardPermission } from '@/lib/auth/dashboard-access';
import { PermissionEnum } from '@/lib/types/permissions';
import { db } from '@/lib/db';
import { organization } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { AdminControlShell } from '@/components/admin/admin-control-shell';
import { isCafeBusiness } from '@/lib/hospitality/rules';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authorization = await requireDashboardPermission(
    PermissionEnum.ADMIN_ACCESS
  );
  const [record] = await db
    .select({ name: organization.name, businessType: organization.businessType, businessCategory: organization.businessCategory })
    .from(organization)
    .where(eq(organization.id, authorization.organizationId))
    .limit(1);
  return (
    <AdminControlShell organizationName={record?.name ?? 'Pesaby workspace'} cafeWorkspace={Boolean(record && isCafeBusiness(record.businessType, record.businessCategory))}>
      {children}
    </AdminControlShell>
  );
}
