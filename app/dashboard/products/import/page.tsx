import { FileSpreadsheet } from 'lucide-react'
import { requirePermission } from '@/lib/auth/authorization'
import { db } from '@/lib/db'
import { branch } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { PermissionEnum } from '@/lib/types/permissions'
import { DashboardPageHeading } from '@/components/dashboard/page-heading'
import { ProductCsvImporter } from '@/components/products/product-csv-importer'

export const metadata = { title: 'Import products | Pesaby' }
export default async function ProductImportPage() { const auth = await requirePermission(PermissionEnum.PRODUCT_CREATE); const branches = await db.select({ id: branch.id, name: branch.name, code: branch.code }).from(branch).where(eq(branch.organizationId, auth.organizationId)); return <div className="mx-auto max-w-[1280px] space-y-5 pb-10"><DashboardPageHeading icon={FileSpreadsheet} eyebrow="Catalogue onboarding" title="Import products" description="Preview a cleaned CSV before creating products and audited opening stock." theme="adaptive" /><ProductCsvImporter branches={branches} /></div> }
