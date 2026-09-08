import { FileSpreadsheet } from 'lucide-react'
import { DashboardPageHeading } from '@/components/dashboard/page-heading'
import { CategoryCsvImporter } from '@/components/products/category-csv-importer'
export const metadata = { title: 'Import categories | Pesaby' }
export default function CategoryImportPage() { return <div className="mx-auto max-w-[1280px] space-y-5 pb-10"><DashboardPageHeading icon={FileSpreadsheet} eyebrow="Catalogue onboarding" title="Import categories" description="Preview a CSV before creating category records for this organization." theme="adaptive" /><CategoryCsvImporter /></div> }
