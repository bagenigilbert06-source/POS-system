import { redirect } from 'next/navigation';

/** Purchasing is intentionally not part of the sell-side Pesaby experience. */
export default function PurchasesPage() {
  redirect('/dashboard/inventory');
}
