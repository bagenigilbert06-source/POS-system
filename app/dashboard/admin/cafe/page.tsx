import type { Metadata } from 'next';
import { Coffee } from 'lucide-react';
import { getCafeConfigurationData } from '@/app/actions/cafe';
import { CafeSettings } from '@/components/cafe/cafe-settings';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { getAuthorizationContext } from '@/lib/auth/authorization';
import { PermissionEnum } from '@/lib/types/permissions';

export const metadata: Metadata = { title: 'Café configuration | Pesaby' };
export const dynamic = 'force-dynamic';

export default async function AdminCafeSettingsPage() {
  const [authorization, data] = await Promise.all([getAuthorizationContext(), getCafeConfigurationData()]);
  return <div className="space-y-5 pb-8"><AdminPageHeader title="Café configuration" description="Enable only the order, table, preparation and printing workflows this café uses." /><div className="sr-only"><Coffee /></div><CafeSettings initialData={data} canEdit={authorization.permissions.includes(PermissionEnum.SETTINGS_EDIT)} canEditTables={authorization.permissions.includes(PermissionEnum.TABLE_EDIT)} /></div>;
}
