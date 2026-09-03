import { Suspense } from 'react';
import { and, eq, inArray, sql } from 'drizzle-orm';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { BarChart3 } from 'lucide-react';
import { db } from '@/lib/db';
import { branch } from '@/lib/db/schema';
import { OrganizationService } from '@/lib/services/organization-service';
import { DashboardPageHeading } from '@/components/dashboard/page-heading';
import {
  ReportFilters,
  ReportTabs,
} from '@/components/reports/reports-shell-client';
import { REPORT_SECTIONS, type ReportSection } from '@/lib/reports/sections';
import {
  ReportSectionContent,
  ReportSectionSkeleton,
} from '@/components/reports/report-section-content';
import { requireWorkspaceModule } from '@/lib/onboarding/require-module';
import { requireDashboardPermission } from '@/lib/auth/dashboard-access';
import { PermissionEnum, RoleEnum } from '@/lib/types/permissions';
import { resolveReportPeriod } from '@/lib/reports/report-rules';
import { getProductTerminology } from '@/lib/products/terminology';
import { getBusinessExperience } from '@/lib/workspace/business-experience';

export const metadata: Metadata = { title: 'Reports' };
type Params = Record<string, string | string[] | undefined>;
const first = (params: Params | undefined, key: string) => {
  const value = params?.[key];
  return Array.isArray(value) ? value[0] : value;
};
const dateKey = (timeZone: string) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

export default async function ReportsPage({
  searchParams,
}: {
  searchParams?: Promise<Params>;
}) {
  const authorization = await requireDashboardPermission(
    PermissionEnum.REPORT_VIEW
  );
  await requireWorkspaceModule('reports');
  const organization = await OrganizationService.getOrganization(
    authorization.organizationId,
    authorization.userId
  );
  if (!organization) redirect('/onboarding');
  const productTerms = getProductTerminology(
    organization.businessType,
    organization.businessCategory
  );
  const experience = getBusinessExperience(
    organization.businessType,
    organization.businessCategory ?? 'custom'
  );
  const params = await searchParams;
  const requested = first(params, 'section');
  let section: ReportSection = REPORT_SECTIONS.includes(
    requested as ReportSection
  )
    ? (requested as ReportSection)
    : 'overview';
  const canViewStaff = authorization.permissions.includes(
    PermissionEnum.STAFF_VIEW
  );
  if (section === 'staff' && !canViewStaff) section = 'overview';
  const visibleSections = REPORT_SECTIONS.filter((item) => {
    if (item === 'staff' && !canViewStaff) return false;
    if (item === 'compliance' && organization.businessCategory !== 'liquor_shop')
      return false;
    return true;
  });
  if (!visibleSections.includes(section)) section = 'overview';
  const zone = organization.timezone || 'Africa/Nairobi',
    today = dateKey(zone),
    // A recent rolling window makes the landing report useful for businesses
    // whose current calendar month has not had a sale yet. Explicit URL
    // presets remain authoritative and bookmarkable.
    preset = first(params, 'period') ?? '30d';
  const period = resolveReportPeriod(
    preset,
    first(params, 'from'),
    first(params, 'to'),
    today
  );
  const accessibleBranchIds =
    authorization.role === RoleEnum.MANAGER
      ? authorization.branchIds
      : undefined;
  const locations = await db
    .select({ id: branch.id, name: branch.name })
    .from(branch)
    .where(
      and(
        eq(branch.organizationId, organization.id),
        accessibleBranchIds === undefined
          ? undefined
          : accessibleBranchIds.length
            ? inArray(branch.id, accessibleBranchIds)
            : sql`false`
      )
    )
    .orderBy(branch.name);
  const selectedLocation = locations.find(
    (location) => location.id === first(params, 'branch')
  );
  const branchIds = selectedLocation
    ? [selectedLocation.id]
    : accessibleBranchIds;
  const locationLabel =
    selectedLocation?.name ??
    (accessibleBranchIds === undefined
      ? 'All locations'
      : 'Assigned locations');
  const sectionKey = `${section}:${period.from}:${period.to}:${selectedLocation?.id ?? 'all'}:${first(params, 'report_page') ?? 1}:${first(params, 'report_search') ?? ''}:${first(params, 'report_status') ?? ''}:${first(params, 'report_payment') ?? ''}:${first(params, 'report_cashier') ?? ''}`;
  return (
    <div className="dashboard-reports mx-auto max-w-[1480px] space-y-4 pb-8">
      <DashboardPageHeading
        icon={BarChart3}
        title={experience.kind === 'hospitality' ? `${experience.label} Reports` : 'Reports'}
        description={experience.kind === 'hospitality' ? 'Review café orders, menu-item performance, payments, profit and ingredient stock.' : 'Useful business reporting for the selected period and location.'}
        theme="adaptive"
      />
      <ReportFilters
        period={preset}
        from={period.from}
        to={period.to}
        today={today}
        branch={selectedLocation?.id}
        locations={locations}
      />
      <ReportTabs
        active={section}
        visible={[...visibleSections]}
        productLabel={productTerms.title}
        salesLabel={experience.navigation.sales}
      />
      <Suspense key={sectionKey} fallback={<ReportSectionSkeleton />}>
        <ReportSectionContent
          section={section}
          organizationId={organization.id}
          businessCategory={organization.businessCategory}
          productLabel={productTerms.title}
          salesLabel={experience.navigation.sales}
          timeZone={zone}
          currency={organization.currency || 'KES'}
          period={period}
          branchIds={branchIds}
          locationLabel={locationLabel}
          params={params ?? {}}
        />
      </Suspense>
    </div>
  );
}
