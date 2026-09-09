import { FileSpreadsheet } from 'lucide-react'
import { requirePermission } from '@/lib/auth/authorization'
import { db } from '@/lib/db'
import { branch, category } from '@/lib/db/schema'
import { and, eq, isNotNull } from 'drizzle-orm'
import { PermissionEnum } from '@/lib/types/permissions'
import { DashboardPageHeading } from '@/components/dashboard/page-heading'
import { ProductCsvImporter } from '@/components/products/product-csv-importer'

export const metadata = { title: 'Import products | Pesaby' }
export default async function ProductImportPage() { const auth = await requirePermission(PermissionEnum.PRODUCT_CREATE); const [branches, categories] = await Promise.all([db.select({ id: branch.id, name: branch.name, code: branch.code }).from(branch).where(eq(branch.organizationId, auth.organizationId)), db.select({ id: category.id, name: category.name }).from(category).where(and(eq(category.orgId, auth.organizationId), eq(category.isActive, true), isNotNull(category.parentCategoryId)))]); return <div className="mx-auto max-w-[1280px] space-y-5 pb-10"><DashboardPageHeading icon={FileSpreadsheet} eyebrow="Catalogue onboarding" title="Import products" description="Preview a cleaned CSV before creating products and audited opening stock." theme="adaptive" /><ProductCsvImporter branches={branches} categories={categories} /></div> }
