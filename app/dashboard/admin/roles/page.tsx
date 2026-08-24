import type { Metadata } from 'next';
import { eq } from 'drizzle-orm';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { requireDashboardPermission } from '@/lib/auth/dashboard-access';
import { db } from '@/lib/db';
import { organization } from '@/lib/db/schema';
import { isPharmacyBusiness } from '@/lib/pharmacy/rules';
import {
  ASSIGNABLE_ROLES,
  PermissionEnum,
  ROLE_PERMISSIONS,
  RoleEnum,
} from '@/lib/types/permissions';

export const metadata: Metadata = { title: 'Role permissions | Pesaby' };

const coreVisibleRoles = [
  RoleEnum.OWNER,
  RoleEnum.ADMIN,
  RoleEnum.MANAGER,
  RoleEnum.SUPERVISOR,
  RoleEnum.CASHIER,
  RoleEnum.INVENTORY,
  RoleEnum.ACCOUNTANT,
];
const roleSummary: Record<string, string> = {
  owner: 'Owns the business account and retains the highest-risk controls.',
  admin: 'Configures and administers the whole organization.',
  manager: 'Runs assigned branches and their day-to-day operations.',
  supervisor: 'Controls registers, shifts and floor exceptions.',
  cashier: 'Sells, handles customers and views their own receipts.',
  inventory: 'Maintains products, stock and procurement records.',
  accountant: 'Reviews finance, expenses and organization reports.',
  pharmacist: 'Dispenses medicines, reviews prescriptions and approves restricted medicine sales.',
  pharmacy_staff: 'Supports medicine sales, customer service and stock handling under pharmacy controls.',
};

export default async function RolesPage() {
  const authorization = await requireDashboardPermission(PermissionEnum.ADMIN_ACCESS);
  const [workspace] = await db.select({
    businessType: organization.businessType,
    businessCategory: organization.businessCategory,
  }).from(organization).where(eq(organization.id, authorization.organizationId)).limit(1);
  const pharmacyWorkspace = isPharmacyBusiness(workspace?.businessType, workspace?.businessCategory);
  const visibleRoles = pharmacyWorkspace
    ? [...coreVisibleRoles, RoleEnum.PHARMACIST, RoleEnum.PHARMACY_STAFF]
    : coreVisibleRoles;
  const pharmacyRoles = new Set<RoleEnum>([RoleEnum.PHARMACIST, RoleEnum.PHARMACY_STAFF]);

  return (
    <div className="space-y-5 pb-8">
      <AdminPageHeader
        title="Roles & permissions"
        description="Review the enforced system roles. Managers cannot promote themselves or grant administrative access."
      />
      <section className="grid gap-4 lg:grid-cols-2">
        {visibleRoles.map((role) => (
          <article key={role} className="app-panel overflow-hidden">
            <div className="border-b p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold capitalize">{role}</h2>
                <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-accent-foreground">
                  {ROLE_PERMISSIONS[role].length} permissions
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {roleSummary[role]}
              </p>
            </div>
            <div className="p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Can create or assign
              </p>
              <p className="mt-2 text-sm">
                {ASSIGNABLE_ROLES[role].filter((assignable) => pharmacyWorkspace || !pharmacyRoles.has(assignable)).length
                  ? ASSIGNABLE_ROLES[role].filter((assignable) => pharmacyWorkspace || !pharmacyRoles.has(assignable)).map(label).join(', ')
                  : 'No roles'}
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {ROLE_PERMISSIONS[role].map((permission) => (
                  <span
                    key={permission}
                    className="rounded-md border bg-muted/40 px-2 py-1 text-[11px] font-medium"
                  >
                    {label(permission)}
                  </span>
                ))}
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

function label(value: string) {
  return value
    .replace(/[:_-]/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
