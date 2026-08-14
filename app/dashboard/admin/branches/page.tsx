import type { Metadata } from 'next'
import { count, desc, eq } from 'drizzle-orm'
import { Building2 } from 'lucide-react'
import { db } from '@/lib/db'
import { branch, branchMembership } from '@/lib/db/schema'
import { requireDashboardPermission } from '@/lib/auth/dashboard-access'
import { PermissionEnum } from '@/lib/types/permissions'
import { DashboardPageHeading } from '@/components/dashboard/page-heading'
import { BranchManagement } from '@/components/admin/branch-management'

export const metadata: Metadata = { title: 'Branch administration | Pesaby' }

export default async function BranchesPage() {
  const authorization = await requireDashboardPermission(PermissionEnum.ADMIN_ACCESS)
  const rows = await db.select({
    id: branch.id, code: branch.code, name: branch.name, phone: branch.phone, address: branch.address,
    region: branch.region, city: branch.city, timezone: branch.timezone, isMain: branch.isMain,
    staffCount: count(branchMembership.userId),
  }).from(branch).leftJoin(branchMembership, eq(branchMembership.branchId, branch.id)).where(eq(branch.organizationId, authorization.organizationId)).groupBy(branch.id).orderBy(desc(branch.isMain), branch.name)
  return <div className="mx-auto w-full max-w-[1280px] space-y-5 pb-8"><DashboardPageHeading icon={Building2} title="Branch administration" description="Create locations, maintain branch details and protect locations that already contain operating records." theme="adaptive" /><BranchManagement branches={rows.map((row) => ({ ...row, staffCount: Number(row.staffCount) }))} /></div>
}
