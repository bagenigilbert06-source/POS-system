import { redirect } from 'next/navigation';

/** Legacy URL retained for bookmarks after procurement was replaced by stock intake. */
export default function PurchasesPage() {
  redirect('/dashboard/stock-intake');
}
