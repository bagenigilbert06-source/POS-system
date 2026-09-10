import type { Metadata } from 'next';
import { getRecentSales } from '@/app/actions/pos-queries';
import { ReceiptsView } from '@/components/receipts/receipts-view';

export const metadata: Metadata = { title: 'My receipts' };

export default async function ReceiptsPage() {
  return <ReceiptsView initialSales={await getRecentSales(100)} />;
}
