import { getProductCategories } from '@/app/actions/products';
import { ProductForm } from '@/components/products/product-form';
import { DashboardPageHeading } from '@/components/dashboard/page-heading';
import { PackagePlus } from 'lucide-react';
import { requireWorkspaceModule } from '@/lib/onboarding/require-module';
import type { Metadata } from 'next';
import { getCurrentProductTerminology } from '@/lib/products/current-terminology';

export async function generateMetadata(): Promise<Metadata> {
  const terminology = await getCurrentProductTerminology();
  return { title: terminology.add };
}

export default async function NewProductPage({
  searchParams,
}: {
  searchParams?: Promise<{ categoryId?: string; barcode?: string }>;
}) {
  await requireWorkspaceModule('products');
  const [categories, terminology] = await Promise.all([
    getProductCategories(),
    getCurrentProductTerminology(),
  ]);

  const query = await searchParams;
  const categoryId = query?.categoryId;
  const barcode = query?.barcode;
  return (
    <div className="products-workspace mx-auto w-full max-w-5xl space-y-4">
      <DashboardPageHeading
        theme="adaptive"
        icon={PackagePlus}
        title={terminology.add}
        description={
          terminology.title === 'Menu Items'
            ? 'Create a café menu item with its base price and category, then add optional sizes, modifiers, recipes and preparation routing.'
            : terminology.title === 'Medicines'
              ? 'Create a medicine record with dispensing, identification, batch and expiry controls.'
              : terminology.title === 'Stock Items'
                ? 'Create a liquor-store item with bottle or pack details, barcode, pricing and stock controls.'
                : `Create a POS-ready ${terminology.singularLower} with pricing, stock, an image and reorder settings.`
        }
      />
      <ProductForm
        categories={categories}
        initialCategoryId={categoryId}
        initialBarcode={barcode}
      />
    </div>
  );
}
