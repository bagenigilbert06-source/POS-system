import { getProductsPageData } from '@/app/actions/products';
import { ProductsTable } from '@/components/products/products-table';
import { Package } from 'lucide-react';
import type { Metadata } from 'next';
import { DashboardPageHeading } from '@/components/dashboard/page-heading';
import Link from 'next/link';
import { getAuthorizationContext } from '@/lib/auth/authorization';
import { WorkspaceService } from '@/lib/services/workspace-service';
import { isPharmacyBusiness } from '@/lib/pharmacy/rules';
import { PermissionEnum } from '@/lib/types/permissions';
import { db } from '@/lib/db';
import { product, pharmacyProduct } from '@/lib/db/schema';
import { and, eq, sql } from 'drizzle-orm';
import { getProductTerminology } from '@/lib/products/terminology';
import { getCurrentProductTerminology } from '@/lib/products/current-terminology';
import { cafeSchemaIsReady } from '@/lib/db/schema-capabilities';
import { isCafeBusiness } from '@/lib/hospitality/rules';

export async function generateMetadata(): Promise<Metadata> {
  const terminology = await getCurrentProductTerminology();
  return { title: terminology.title };
}
export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
  const [products, authorization] = await Promise.all([
    getProductsPageData(),
    getAuthorizationContext(),
  ]);
  const workspace = await WorkspaceService.getWorkspaceConfig(
    authorization.organizationId,
    authorization.userId
  );
  const pharmacy = Boolean(
    workspace &&
    isPharmacyBusiness(workspace.businessType, workspace.businessCategory)
  );
  const cafe = Boolean(
    workspace &&
    isCafeBusiness(workspace.businessType, workspace.businessCategory)
  );
  const cafeSchemaReady = !cafe || (await cafeSchemaIsReady());
  const terminology = getProductTerminology(
    workspace?.businessType,
    workspace?.businessCategory
  );
  const [missingSetup] = pharmacy
    ? await db
        .select({ count: sql<number>`count(*)` })
        .from(product)
        .where(
          and(
            eq(product.orgId, authorization.organizationId),
            eq(product.isActive, true),
            sql`not exists (select 1 from ${pharmacyProduct} where ${pharmacyProduct.productId} = ${product.id} and ${pharmacyProduct.organizationId} = ${authorization.organizationId})`
          )
        )
    : [{ count: 0 }];

  return (
    <div className="products-workspace mx-auto max-w-[1480px] space-y-5">
      <DashboardPageHeading
        icon={Package}
        title={terminology.title}
        description={terminology.description}
        theme="adaptive"
      />
      {!cafeSchemaReady && (
        <div
          role="alert"
          className="rounded-xl border border-amber-300 bg-amber-50/60 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-200"
        >
          <p className="font-semibold">Café database setup is incomplete</p>
          <p className="mt-1 text-xs">
            Apply database migrations 0058 and 0059 before managing menu items.
            Ingredients remain hidden from the sellable catalogue for safety.
          </p>
        </div>
      )}
      {pharmacy &&
        authorization.permissions.includes(PermissionEnum.PRODUCT_CREATE) && (
          <div className="flex justify-end">
            <Link
              href="/dashboard/products/import/pharmacy"
              className="rounded-md border px-3 py-2 text-xs font-semibold hover:bg-muted"
            >
              {terminology.importCsv}
            </Link>
          </div>
        )}
      {pharmacy && Number(missingSetup?.count || 0) > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50/60 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-200">
          <p className="font-semibold">
            {Number(missingSetup.count)} medicines need dispensing setup
          </p>
          <p className="mt-1 text-xs">
            They are intentionally hidden from the pharmacy POS until generic
            and dispensing details are added. Open each medicine and save its
            pharmacy details.
          </p>
        </div>
      )}

      <ProductsTable initialProducts={products} terminology={terminology} />
    </div>
  );
}
