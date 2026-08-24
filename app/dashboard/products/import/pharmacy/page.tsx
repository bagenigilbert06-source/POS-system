import { and, eq } from 'drizzle-orm'
import { FileSpreadsheet } from 'lucide-react'
import { requirePermission } from '@/lib/auth/authorization'
import { db } from '@/lib/db'
import { branch, category } from '@/lib/db/schema'
import { PermissionEnum } from '@/lib/types/permissions'
import { MedicineImporter } from '@/components/pharmacy/medicine-importer'
import { DashboardPageHeading } from '@/components/dashboard/page-heading'

export const metadata = { title: 'Import medicines | Pesaby' }
export const dynamic = 'force-dynamic'

export default async function PharmacyMedicineImportPage() { const auth = await requirePermission(PermissionEnum.PRODUCT_CREATE); const [categories, branches] = await Promise.all([db.select({ name: category.name }).from(category).where(and(eq(category.orgId, auth.organizationId), eq(category.isActive, true))), db.select({ code: branch.code, name: branch.name }).from(branch).where(eq(branch.organizationId, auth.organizationId))]); return <div className="mx-auto max-w-[1280px] space-y-5 pb-10"><DashboardPageHeading icon={FileSpreadsheet} eyebrow="Pharmacy onboarding" title="Import medicines" description="Validated medicine, pricing, tax, batch and opening-stock setup without cross-workspace data." theme="adaptive" /><MedicineImporter categories={categories.map((item) => item.name)} branches={branches} /></div> }
