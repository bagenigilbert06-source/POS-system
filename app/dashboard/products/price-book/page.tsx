import { getPriceBook } from '@/app/actions/price-book';
import { PriceBookClient } from '@/components/products/price-book-client';

export const dynamic = 'force-dynamic';
export default async function PriceBookPage() {
  const rows = await getPriceBook();
  return <div className="mx-auto max-w-[1480px] space-y-5"><div><h1 className="text-2xl font-bold">Price Book</h1><p className="mt-1 text-sm text-muted-foreground">Manage retail and wholesale catalogue prices. Empty wholesale prices safely fall back to retail.</p></div><PriceBookClient initialRows={rows}/></div>;
}
