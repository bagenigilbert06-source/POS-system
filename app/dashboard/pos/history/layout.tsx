import { redirect } from 'next/navigation';

/** Route old POS history bookmarks to the standalone receipts workspace. */
export default function LegacyHistoryLayout({
  children: _children,
}: {
  children: React.ReactNode;
}) {
  redirect('/dashboard/receipts');
}
