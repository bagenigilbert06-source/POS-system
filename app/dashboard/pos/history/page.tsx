import { redirect } from 'next/navigation';

/** Preserve bookmarks while keeping receipt browsing outside the POS terminal. */
export default function LegacyPOSSalesHistoryPage() {
  redirect('/dashboard/receipts');
}
